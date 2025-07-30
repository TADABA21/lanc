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
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { generateWithGroq, invoicePrompts } from '@/lib/groq';
import { Client, Project } from '@/types/database';
import { ArrowLeft, Save, X, Plus, Trash2, FileText, Calendar, DollarSign, ChevronDown, Sparkles, Eye, Download } from 'lucide-react-native';
import { DatePicker } from '@/components/DatePicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function NewInvoiceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    invoice_number: `INV-${Date.now()}`,
    client_id: '',
    project_id: '',
    issue_date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: '',
    terms: 'Payment due within 30 days',
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
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchProjects();
  }, []);

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

  const handleAIGenerate = async () => {
    const selectedClient = clients.find(c => c.id === formData.client_id);
    const selectedProject = projects.find(p => p.id === formData.project_id);

    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client first');
      return;
    }

    setAiGenerating(true);

    try {
      const messages = invoicePrompts.generateInvoice(
        selectedClient.name,
        selectedProject?.name || 'General Services',
        items
      );

      const aiResponse = await generateWithGroq(messages);

      // Parse AI response for notes and terms
      const lines = aiResponse.split('\n');
      let notes = '';
      let terms = '';
      let currentSection = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().includes('notes:')) {
          currentSection = 'notes';
          continue;
        } else if (trimmedLine.toLowerCase().includes('terms:')) {
          currentSection = 'terms';
          continue;
        }

        if (currentSection === 'notes' && trimmedLine) {
          notes += trimmedLine + '\n';
        } else if (currentSection === 'terms' && trimmedLine) {
          terms += trimmedLine + '\n';
        }
      }

      setFormData(prev => ({
        ...prev,
        notes: notes.trim() || `Thank you for your business, ${selectedClient.name}! We appreciate the opportunity to work with ${selectedClient.company}.`,
        terms: terms.trim() || 'Payment due within 30 days. Late payments may incur additional fees.',
      }));

      Alert.alert('Success', 'AI has generated professional invoice content!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      Alert.alert('Error', 'Failed to generate invoice content with AI. Please try again.');
    } finally {
      setAiGenerating(false);
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

    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePreview = () => {
    if (items.some(item => !item.description.trim())) {
      Alert.alert('Incomplete Items', 'Please fill in all item descriptions before previewing.');
      return;
    }
    setShowPreview(true);
  };

  const handleDownload = async () => {
    if (items.some(item => !item.description.trim())) {
      Alert.alert('Incomplete Items', 'Please fill in all item descriptions before downloading.');
      return;
    }

    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const html = generateInvoiceHTML(formData, items, selectedClient);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612, // Standard letter width in points
        height: 792, // Standard letter height in points
      });

      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${formData.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Alert.alert('Success', 'Invoice downloaded successfully!');
      } else {
        // For mobile, use sharing
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Download Invoice',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', 'Failed to download invoice. Please try again.');
    }
  };

  const generateInvoiceHTML = (invoice: typeof formData, items: InvoiceItem[], client?: Client) => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .invoice-header {
              background: linear-gradient(135deg, #3B82F6, #1E40AF);
              color: white;
              padding: 40px;
              margin: -20px -20px 40px -20px;
            }
            .invoice-title {
              font-size: 48px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .company-info {
              text-align: right;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
            }
            .bill-to {
              flex: 1;
            }
            .invoice-meta {
              text-align: right;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th,
            .items-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #E5E7EB;
            }
            .items-table th {
              background-color: #F3F4F6;
              font-weight: bold;
            }
            .totals {
              text-align: right;
              margin-bottom: 40px;
            }
            .totals table {
              margin-left: auto;
              border-collapse: collapse;
            }
            .totals td {
              padding: 8px 16px;
              border-bottom: 1px solid #E5E7EB;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
              background-color: #3B82F6;
              color: white;
            }
            .notes {
              background-color: #F8FAFC;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .footer {
              text-align: center;
              color: #6B7280;
              font-size: 12px;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="invoice-title">Invoice</div>
                <div style="font-size: 18px;">#${invoice.invoice_number}</div>
              </div>
              <div class="company-info">
                <div style="font-size: 24px; font-weight: bold;">LANCELOT</div>
                <div>Business Management Platform</div>
              </div>
            </div>
          </div>

          <div class="invoice-details">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <div style="font-size: 18px; font-weight: bold;">${client?.name || 'Client Name'}</div>
              <div>${client?.company || 'Company Name'}</div>
              ${client?.address ? `<div>${client.address}</div>` : ''}
              ${client?.email ? `<div>${client.email}</div>` : ''}
              ${client?.phone ? `<div>${client.phone}</div>` : ''}
            </div>
            <div class="invoice-meta">
              <div><strong>Invoice Date:</strong> ${invoice.issue_date.toLocaleDateString()}</div>
              <div><strong>Due Date:</strong> ${invoice.due_date.toLocaleDateString()}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.rate.toFixed(2)}</td>
                  <td>$${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>$${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax (10%):</td>
                <td>$${tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td>$${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${invoice.notes ? `
            <div class="notes">
              <h4>Notes:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          ${invoice.terms ? `
            <div class="notes">
              <h4>Terms:</h4>
              <p>${invoice.terms}</p>
            </div>
          ` : ''}

          <div class="footer">
            Generated by LANCELOT on ${new Date().toLocaleDateString()}
          </div>
        </body>
      </html>
    `;
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

      // Add invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      // Create activity log
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
    dropdown: {
      position: 'relative',
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
    dropdownList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginTop: 4,
      maxHeight: 200,
      zIndex: 1000,
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
      backgroundColor: '#f5f5f5',
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
    previewHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    previewContent: {
      flex: 1,
    },
    previewScrollContent: {
      padding: 24,
    },
    invoiceDocument: {
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: 40,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
      marginBottom: 40,
    },
    invoiceHeaderLeft: {
      flex: 1,
    },
    invoiceTitle: {
      fontSize: 32,
      fontFamily: 'Inter-Bold',
      color: '#333',
      letterSpacing: 2,
    },
    invoiceHeaderRight: {
      alignItems: 'flex-end',
    },
    contactInfo: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#666',
      marginBottom: 2,
    },
    invoiceDetailsSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 40,
    },
    invoiceDetailsLeft: {
      flex: 1,
    },
    invoiceDetailsRight: {
      alignItems: 'flex-end',
      minWidth: 180,
    },
    sectionLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#666',
      marginBottom: 8,
    },
    clientName: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: '#333',
      marginBottom: 4,
    },
    clientDetails: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#666',
      marginBottom: 2,
    },
    invoiceMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      minWidth: 180,
    },
    metaLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#666',
    },
    metaValue: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: '#333',
    },
    invoiceTotalAmount: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: '#2563eb',
    },
    itemsTable: {
      marginBottom: 32,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: '#e5e5e5',
      marginBottom: 16,
    },
    tableHeaderCell: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    descriptionColumn: {
      flex: 2,
    },
    unitCostColumn: {
      flex: 1,
    },
    qtyColumn: {
      flex: 1,
    },
    amountColumn: {
      flex: 1,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      alignItems: 'flex-start',
    },
    tableCell: {
      flex: 1,
    },
    tableCellText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#333',
    },
    itemDescription: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: '#333',
      marginBottom: 2,
    },
    itemSubDescription: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: '#999',
      fontStyle: 'italic',
    },
    totalsSection: {
      alignItems: 'flex-end',
      borderTopWidth: 2,
      borderTopColor: '#e5e5e5',
      paddingTop: 16,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      minWidth: 200,
    },
    totalRowLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#333',
    },
    totalRowValue: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: '#333',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Invoice</Text>
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
            <Text style={styles.aiTitle}>AI-Powered Invoice Enhancement</Text>
          </View>
          <Text style={styles.aiDescription}>
            Generate professional notes and terms for your invoice using AI.
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
              {aiGenerating ? 'Generating...' : 'Generate Notes & Terms'}
            </Text>
          </TouchableOpacity>
        </View>

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
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  !selectedClient && styles.dropdownPlaceholder
                ]}>
                  {selectedClient ? selectedClient.name : 'Select a client'}
                </Text>
                <ChevronDown size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {showClientDropdown && (
                <ScrollView
                  style={styles.dropdownList}
                  showsVerticalScrollIndicator={Platform.OS === 'web'}
                >
                  {clients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, client_id: client.id }));
                        setShowClientDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{client.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project (Optional)</Text>
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowProjectDropdown(!showProjectDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  !selectedProject && styles.dropdownPlaceholder
                ]}>
                  {selectedProject ? selectedProject.name : 'Select a project'}
                </Text>
                <ChevronDown size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {showProjectDropdown && (
                <ScrollView
                  style={styles.dropdownList}
                  showsVerticalScrollIndicator={Platform.OS === 'web'}
                >
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, project_id: '' }));
                      setShowProjectDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>No project</Text>
                  </TouchableOpacity>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, project_id: project.id }));
                        setShowProjectDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{project.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

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
            <Text style={styles.label}>Terms</Text>
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
            {loading ? 'Saving...' : 'Save'}
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
            <Text style={styles.previewTitle}>Invoice Preview</Text>
            <View style={styles.previewHeaderActions}>
              <TouchableOpacity
                style={[styles.headerButton, styles.headerButtonSecondary]}
                onPress={handleDownload}
              >
                <Download size={16} color={colors.primary} />
                <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
                  Download
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.previewContent}
            contentContainerStyle={styles.previewScrollContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            <View style={styles.invoiceDocument}>
              {/* Invoice Header */}
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceHeaderLeft}>
                  <Text style={styles.invoiceTitle}>INVOICE</Text>
                </View>
                <View style={styles.invoiceHeaderRight}>
                  <Text style={styles.contactInfo}>647-444-1234</Text>
                  <Text style={styles.contactInfo}>your@email.com</Text>
                  <Text style={styles.contactInfo}>yourwebsite.com</Text>
                </View>
              </View>

              {/* Invoice Details Section */}
              <View style={styles.invoiceDetailsSection}>
                <View style={styles.invoiceDetailsLeft}>
                  <Text style={styles.sectionLabel}>Billed To</Text>
                  <Text style={styles.clientName}>{selectedClient?.name || 'Client Name'}</Text>
                  <Text style={styles.clientDetails}>{selectedClient?.address || '1 Client Address'}</Text>
                  <Text style={styles.clientDetails}>
                    {selectedClient?.address ? 'City, State, Country' : 'City, State, Country'}
                  </Text>
                  <Text style={styles.clientDetails}>ZIP CODE</Text>
                </View>

                <View style={styles.invoiceDetailsRight}>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.metaLabel}>Invoice Number</Text>
                    <Text style={styles.metaValue}>{formData.invoice_number}</Text>
                  </View>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.metaLabel}>Invoice Total</Text>
                    <Text style={styles.invoiceTotalAmount}>
                      ${calculateTotal().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.metaLabel}>Date Of Issue</Text>
                    <Text style={styles.metaValue}>
                      {formData.issue_date.toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items Table */}
              <View style={styles.itemsTable}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.descriptionColumn]}>Description</Text>
                  <Text style={[styles.tableHeaderCell, styles.unitCostColumn]}>Unit Cost</Text>
                  <Text style={[styles.tableHeaderCell, styles.qtyColumn]}>Qty / Hr Rate</Text>
                  <Text style={[styles.tableHeaderCell, styles.amountColumn]}>Amount</Text>
                </View>

                {/* Table Rows */}
                {items.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.descriptionColumn]}>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                      <Text style={styles.itemSubDescription}>Item description goes here</Text>
                    </View>
                    <View style={styles.unitCostColumn}>
                      <Text style={[styles.tableCellText, { textAlign: 'center' }]}>
                        ${item.rate.toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.qtyColumn}>
                      <Text style={[styles.tableCellText, { textAlign: 'center' }]}>
                        {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.amountColumn}>
                      <Text style={[styles.tableCellText, { textAlign: 'right' }]}>
                        {item.amount.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Totals Section */}
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>Subtotal</Text>
                  <Text style={styles.totalRowValue}>${calculateSubtotal().toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>Tax</Text>
                  <Text style={styles.totalRowValue}>${calculateTax().toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}