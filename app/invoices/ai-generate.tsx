import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { generateWithGroq, invoicePrompts } from '@/lib/groq';
import { Client, Project } from '@/types/database';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign, 
  ChevronDown,
  Sparkles,
} from 'lucide-react-native';
import { DatePicker } from '@/components/DatePicker';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function AIInvoiceGeneratorScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    invoice_number: `INV-${Date.now()}`,
    client_id: '',
    project_id: projectId || '',
    issue_date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: '',
    terms: '',
    summary: '',
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [parseMode, setParseMode] = useState<'summary' | 'manual'>('manual');

  useEffect(() => {
    fetchClients();
    fetchProjects();
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectDetails = async () => {
    if (!projectId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, client:clients(*)')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data.client_id) {
        setFormData(prev => ({ ...prev, client_id: data.client_id }));
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleAIGenerate = async () => {
    const selectedClient = clients.find(c => c.id === formData.client_id);
    const selectedProject = projects.find(p => p.id === formData.project_id);
    
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client first');
      return;
    }

    setAiGenerating(true);
    
    try {
      let generatedItems = items;
      
      if (parseMode === 'summary' && formData.summary.trim()) {
        try {
          const parseMessages = invoicePrompts.parseSummary(formData.summary);
          const parseResponse = await generateWithGroq(parseMessages);
          
          // Try to parse the response as JSON
          const parsedItems = JSON.parse(parseResponse);
          if (Array.isArray(parsedItems)) {
            generatedItems = parsedItems.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              amount: (item.quantity || 1) * (item.rate || 0)
            }));
            setItems(generatedItems);
          }
        } catch (e) {
          console.error('Failed to parse AI response as JSON', e);
          Alert.alert('Notice', 'AI had trouble parsing the summary. Please review the generated items.');
        }
      }

      const itemsContext = generatedItems
        .filter(item => item.description.trim())
        .map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));

      const messages = invoicePrompts.generateInvoice(
        selectedClient.name,
        selectedProject?.name || 'General Services',
        itemsContext
      );
      
      const aiResponse = await generateWithGroq(messages);
      
      const parseAIResponse = (response: string) => {
        const sections = response.split(/(?:^|\n)(?=\d+\.|[A-Z][a-z]+:|\*\*)/);
        let notes = '';
        let terms = '';
        
        for (const section of sections) {
          const lowerSection = section.toLowerCase();
          if (lowerSection.includes('note') || lowerSection.includes('description') || lowerSection.includes('thank')) {
            notes += section.replace(/^\d+\.\s*|^\*\*.*?\*\*\s*|^[A-Za-z\s]+:\s*/g, '').trim() + '\n';
          } else if (lowerSection.includes('term') || lowerSection.includes('payment') || lowerSection.includes('condition')) {
            terms += section.replace(/^\d+\.\s*|^\*\*.*?\*\*\s*|^[A-Za-z\s]+:\s*/g, '').trim() + '\n';
          }
        }
        
        return { notes: notes.trim(), terms: terms.trim() };
      };
      
      const { notes, terms } = parseAIResponse(aiResponse);
      
      setFormData(prev => ({
        ...prev,
        notes: notes || 'Thank you for your business. We appreciate the opportunity to work with you.',
        terms: terms || 'Payment is due within 30 days of invoice date.',
      }));
      
      Alert.alert('Success', 'AI has generated professional invoice content!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      Alert.alert('Error', 'Failed to generate content with AI. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.client_id || items.some(item => !item.description.trim())) {
      Alert.alert('Error', 'Please select a client and fill in all item descriptions');
      return;
    }

    setLoading(true);
    
    try {
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: formData.invoice_number,
          client_id: formData.client_id,
          project_id: formData.project_id || null,
          issue_date: formData.issue_date.toISOString().split('T')[0],
          due_date: formData.due_date.toISOString().split('T')[0],
          status: 'draft',
          amount: total,
          line_items: items,
          notes: formData.notes,
          terms: formData.terms,
          subtotal,
          tax,
          total,
          user_id: user.id,
        }])
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;

      await supabase
        .from('activities')
        .insert([{
          type: 'invoice_created',
          title: `Invoice created: ${formData.invoice_number}`,
          description: `Total: $${total.toFixed(2)}`,
          entity_type: 'invoice',
          entity_id: invoice.id,
          user_id: user.id,
        }]);

      Alert.alert('Success', 'Invoice created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedProject = projects.find(p => p.id === formData.project_id);

  const renderDropdownModal = (items: any[], selectedValue: string, onSelect: (value: string) => void, visible: boolean, onClose: () => void) => {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.dropdownModal}
          activeOpacity={1}
          onPressOut={onClose}
        >
          <View style={styles.dropdownListContainer}>
            <ScrollView style={styles.dropdownList}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id || item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSelect(item.id || item);
                    onClose();
                  }}
                >
                  <Text style={styles.dropdownItemText}>{item.name || item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    headerButtonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 6,
    },
    headerButtonTextSecondary: {
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
    },
    summaryContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    parseToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    parseToggleButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    parseToggleButtonActive: {
      backgroundColor: colors.primary,
    },
    parseToggleText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
    },
    parseToggleTextActive: {
      color: 'white',
    },
    parseToggleTextInactive: {
      color: colors.textSecondary,
    },
    summaryInput: {
      minHeight: 100,
      textAlignVertical: 'top',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    summaryHint: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 16,
    },
    aiSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    aiIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    aiTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    aiDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    aiButtonDisabled: {
      opacity: 0.6,
    },
    aiButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 8,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    required: {
      color: colors.error,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    inputIcon: {
      marginRight: 12,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    dropdownPlaceholder: {
      color: colors.textMuted,
    },
    dropdownModal: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dropdownListContainer: {
      maxHeight: '60%',
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    dropdownList: {
      flex: 1,
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    dropdownItemText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    itemsContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    itemHeaderTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    addItemText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: 'white',
      marginLeft: 4,
    },
    item: {
      marginBottom: 16,
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    itemRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    itemInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    itemInputSmall: {
      width: 80,
    },
    itemActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemAmount: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    removeButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.error,
    },
    totalsContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    totalValue: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    totalFinal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 8,
    },
    totalFinalLabel: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    totalFinalValue: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.primary,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    datePickerText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryActionButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondaryActionButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 8,
    },
    primaryActionButtonText: {
      color: 'white',
    },
    secondaryActionButtonText: {
      color: colors.primary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Invoice Generator</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonSecondary]}
            onPress={() => router.back()}
          >
            <X size={16} color={colors.textSecondary} />
            <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Work Summary</Text>
            <View style={styles.parseToggle}>
              <TouchableOpacity
                style={[
                  styles.parseToggleButton,
                  parseMode === 'manual' && styles.parseToggleButtonActive
                ]}
                onPress={() => setParseMode('manual')}
              >
                <Text style={[
                  styles.parseToggleText,
                  parseMode === 'manual' ? styles.parseToggleTextActive : styles.parseToggleTextInactive
                ]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.parseToggleButton,
                  parseMode === 'summary' && styles.parseToggleButtonActive
                ]}
                onPress={() => setParseMode('summary')}
              >
                <Text style={[
                  styles.parseToggleText,
                  parseMode === 'summary' ? styles.parseToggleTextActive : styles.parseToggleTextInactive
                ]}>
                  Parse Summary
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {parseMode === 'summary' ? (
            <>
              <TextInput
                style={styles.summaryInput}
                value={formData.summary}
                onChangeText={(text) => setFormData(prev => ({ ...prev, summary: text }))}
                placeholder="Paste or type a summary of the work including items and prices..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <Text style={styles.summaryHint}>
                Example: "Built a website homepage - $500, Added contact form - $300, SEO optimization - $200"
              </Text>
            </>
          ) : (
            <Text style={styles.summaryHint}>
              Switch to "Parse Summary" mode to automatically extract line items from a work description.
            </Text>
          )}
        </View>

        {/* AI Generation Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Sparkles size={20} color="white" />
            </View>
            <Text style={styles.aiTitle}>AI-Powered Invoice Generation</Text>
          </View>
          <Text style={styles.aiDescription}>
            Let AI generate professional invoice content, terms, and payment conditions.
          </Text>
          <TouchableOpacity
            style={[styles.aiButton, (aiGenerating || !formData.client_id) && styles.aiButtonDisabled]}
            onPress={handleAIGenerate}
            disabled={aiGenerating || !formData.client_id}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Sparkles size={16} color="white" />
            )}
            <Text style={styles.aiButtonText}>
              {aiGenerating ? 'Generating...' : 'Generate with AI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invoice Number</Text>
            <View style={styles.inputWithIcon}>
              <FileText size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.invoice_number}
                onChangeText={(text) => setFormData(prev => ({ ...prev, invoice_number: text }))}
                placeholder="Enter invoice number"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Client <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowClientDropdown(true)}
            >
              <Text style={[
                styles.dropdownText,
                !selectedClient && styles.dropdownPlaceholder
              ]}>
                {selectedClient ? selectedClient.name : 'Select a client'}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project (Optional)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowProjectDropdown(true)}
            >
              <Text style={[
                styles.dropdownText,
                !selectedProject && styles.dropdownPlaceholder
              ]}>
                {selectedProject ? selectedProject.name : 'Select a project'}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Issue Date</Text>
            <DatePicker
              value={formData.issue_date}
              onChange={(date) => setFormData(prev => ({ ...prev, issue_date: date }))}
              placeholder="Select issue date"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Date</Text>
            <DatePicker
              value={formData.due_date}
              onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
              placeholder="Select due date"
            />
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={styles.itemsContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemHeaderTitle}>Line Items</Text>
              <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                <Plus size={16} color="white" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.item}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    onChangeText={(text) => updateItem(index, 'description', text)}
                    placeholder="Enter description"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.itemRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={[styles.input, styles.itemInputSmall]}
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateItem(index, 'quantity', parseFloat(text) || 0)}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={styles.label}>Rate</Text>
                    <TextInput
                      style={styles.input}
                      value={item.rate.toString()}
                      onChangeText={(text) => updateItem(index, 'rate', parseFloat(text) || 0)}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <Text style={styles.itemAmount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(index)}
                    >
                      <Trash2 size={16} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (10%)</Text>
              <Text style={styles.totalValue}>${calculateTax().toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalFinal]}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* AI-Generated Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Content</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Add any notes for the client"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Terms & Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.terms}
              onChangeText={(text) => setFormData(prev => ({ ...prev, terms: text }))}
              placeholder="Payment terms and conditions"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={() => Alert.alert('Preview', 'Invoice preview functionality would be implemented here')}
        >
          <FileText size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Preview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={16} color="white" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
            {loading ? 'Saving...' : 'Save Invoice'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modals */}
      {renderDropdownModal(
        clients,
        formData.client_id,
        (client_id) => setFormData(prev => ({ ...prev, client_id })),
        showClientDropdown,
        () => setShowClientDropdown(false)
      )}

      {renderDropdownModal(
        [{ id: '', name: 'No project' }, ...projects],
        formData.project_id,
        (project_id) => setFormData(prev => ({ ...prev, project_id })),
        showProjectDropdown,
        () => setShowProjectDropdown(false)
      )}
    </SafeAreaView>
  );
}