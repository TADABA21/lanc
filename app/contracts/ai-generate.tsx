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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { generateWithGroq, contractPrompts } from '@/lib/groq';
import { Client, Project } from '@/types/database';
import { 
  ArrowLeft, 
  Save, 
  X, 
  FileCheck, 
  ChevronDown,
  Sparkles,
  Eye,
  Download,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function AIContractGeneratorScreen() {
  const { projectId, clientId } = useLocalSearchParams<{ projectId?: string; clientId?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    client_id: clientId || '',
    project_id: projectId || '',
    content: '',
    scope: '',
    timeline: '',
    payment_terms: '',
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const contractTypes = [
    'Service Agreement',
    'Consulting Agreement',
    'Development Contract',
    'Design Contract',
    'Marketing Agreement',
    'Maintenance Contract',
    'Non-Disclosure Agreement',
    'Partnership Agreement',
    'Licensing Agreement',
    'Employment Contract',
  ];

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
        setFormData(prev => ({ 
          ...prev, 
          client_id: data.client_id || '',
          title: `${data.name} Agreement`,
          scope: data.description || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const handleAIGenerate = async () => {
    const selectedClient = clients.find(c => c.id === formData.client_id);
    const selectedProject = projects.find(p => p.id === formData.project_id);
    
    if (!selectedClient || !formData.type) {
      Alert.alert('Error', 'Please select a client and contract type first');
      return;
    }

    setAiGenerating(true);
    
    try {
      const contractContext = {
        clientName: selectedClient.name,
        clientCompany: selectedClient.company || '',
        projectName: selectedProject?.name || 'General Services',
        projectDescription: selectedProject?.description || formData.scope || 'Professional services',
        contractType: formData.type,
        scope: formData.scope || 'Professional services to be delivered'
      };

      const messages = contractPrompts.generateContract(
        contractContext.contractType,
        contractContext.clientName,
        contractContext.projectName,
        contractContext.scope
      );
      
      const aiResponse = await generateWithGroq(messages);
      
      const formatContractContent = (content: string) => {
        let formattedContent = content
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/#{1,6}\s*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        if (!formattedContent.toUpperCase().includes('SERVICE AGREEMENT') && 
            !formattedContent.toUpperCase().includes('CONTRACT')) {
          formattedContent = `${formData.type.toUpperCase()}\n\n${formattedContent}`;
        }
        
        return formattedContent;
      };
      
      setFormData(prev => ({
        ...prev,
        content: formatContractContent(aiResponse),
        title: prev.title || `${formData.type} - ${selectedClient.name}`,
      }));
      
      Alert.alert('Success', 'AI has generated a professional contract!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      Alert.alert('Error', 'Failed to generate contract with AI. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!formData.content.trim()) {
      Alert.alert('No Content', 'Please generate or enter contract content first.');
      return;
    }
    setShowPreview(true);
  };

  const handleDownload = async () => {
    if (!formData.content.trim()) {
      Alert.alert('No Content', 'Please generate or enter contract content first.');
      return;
    }

    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const html = generateContractHTML(formData, selectedClient);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${formData.title || 'contract'}.pdf`;
        link.click();
      } else {
        // For mobile, use sharing
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error downloading contract:', error);
      Alert.alert('Error', 'Failed to download contract. Please try again.');
    }
  };

  const generateContractHTML = (contract: typeof formData, client?: Client) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${contract.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #3B82F6;
              padding-bottom: 20px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #1E293B;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #64748B;
            }
            .content {
              white-space: pre-wrap;
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E2E8F0;
              text-align: center;
              color: #64748B;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${contract.title}</div>
            <div class="subtitle">${client ? `For ${client.name} - ${client.company}` : ''}</div>
          </div>
          <div class="content">${contract.content}</div>
          <div class="footer">
            Generated by LANCELOT on ${new Date().toLocaleDateString()}
          </div>
        </body>
      </html>
    `;
  };

  const handleSave = async () => {
    if (!user || !formData.client_id || !formData.type || !formData.title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          title: formData.title.trim(),
          type: formData.type,
          client_id: formData.client_id,
          project_id: formData.project_id || null,
          content: formData.content,
          status: 'draft',
          user_id: user.id,
        }])
        .select()
        .single();
      
      if (contractError) throw contractError;

      await supabase
        .from('activities')
        .insert([{
          type: 'contract_created',
          title: `Contract created: ${formData.title}`,
          description: `Type: ${formData.type}`,
          entity_type: 'contract',
          entity_id: contract.id,
          user_id: user.id,
        }]);

      Alert.alert('Success', 'Contract created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating contract:', error);
      Alert.alert('Error', 'Failed to create contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedProject = projects.find(p => p.id === formData.project_id);

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
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    largeTextArea: {
      minHeight: 300,
      textAlignVertical: 'top',
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
    // Preview Modal Styles
    previewModal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    previewContent: {
      flex: 1,
      padding: 24,
    },
    previewText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 24,
    },
  });

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
            <ScrollView 
              style={styles.dropdownList}
              showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Contract Generator</Text>
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* AI Generation Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Sparkles size={20} color="white" />
            </View>
            <Text style={styles.aiTitle}>AI-Powered Contract Generation</Text>
          </View>
          <Text style={styles.aiDescription}>
            Generate professional, legally-sound contracts with AI. Include all necessary clauses and terms.
          </Text>
          <TouchableOpacity
            style={[styles.aiButton, (aiGenerating || !formData.client_id || !formData.type) && styles.aiButtonDisabled]}
            onPress={handleAIGenerate}
            disabled={aiGenerating || !formData.client_id || !formData.type}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Sparkles size={16} color="white" />
            )}
            <Text style={styles.aiButtonText}>
              {aiGenerating ? 'Generating...' : 'Generate Contract'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contract Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Contract Title <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <FileCheck size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter contract title"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Contract Type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowTypeDropdown(true);
              }}
            >
              <Text style={[
                styles.dropdownText,
                !formData.type && styles.dropdownPlaceholder
              ]}>
                {formData.type || 'Select contract type'}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Client <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowClientDropdown(true);
              }}
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
              onPress={() => {
                setShowProjectDropdown(true);
              }}
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
            <Text style={styles.label}>Scope of Work</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.scope}
              onChangeText={(text) => setFormData(prev => ({ ...prev, scope: text }))}
              placeholder="Describe the scope of work"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* AI-Generated Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Content</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contract Content</Text>
            <TextInput
              style={[styles.input, styles.largeTextArea]}
              value={formData.content}
              onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
              placeholder="Contract content will be generated by AI or enter manually"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={12}
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handlePreview}
        >
          <Eye size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Preview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handleDownload}
        >
          <Download size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Download
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={16} color="white" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
            {loading ? 'Saving...' : 'Save Contract'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Contract Preview</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.previewContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            <Text style={styles.previewText}>{formData.content || 'No content to preview'}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Dropdown Modals */}
      {renderDropdownModal(
        contractTypes,
        formData.type,
        (type) => setFormData(prev => ({ ...prev, type })),
        showTypeDropdown,
        () => setShowTypeDropdown(false)
      )}

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