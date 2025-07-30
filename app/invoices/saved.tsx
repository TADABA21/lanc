import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types/database';
import { ArrowLeft, FileText, Eye, Download, Trash2, Share2, X } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SavedInvoicesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(name, company),
          project:projects(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPreviewModal(true);
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const html = generateInvoiceHTML(invoice);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${invoice.invoice_number}.pdf`;
        link.click();
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', 'Failed to download invoice');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', invoiceId)
                .eq('user_id', user?.id);

              if (error) throw error;
              
              await fetchInvoices();
              Alert.alert('Success', 'Invoice deleted successfully');
            } catch (error) {
              console.error('Error deleting invoice:', error);
              Alert.alert('Error', 'Failed to delete invoice');
            }
          }
        }
      ]
    );
  };

  const generateInvoiceHTML = (invoice: Invoice) => {
    const client = (invoice as any).client;
    const project = (invoice as any).project;
    
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
            .total-amount {
              font-size: 32px;
              font-weight: bold;
              color: #10B981;
              text-align: center;
              margin: 40px 0;
              padding: 20px;
              background: #F0FDF4;
              border-radius: 8px;
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
              ${project ? `<div>Project: ${project.name}</div>` : ''}
            </div>
            <div class="invoice-meta">
              <div><strong>Invoice Date:</strong> ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}</div>
              <div><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</div>
              <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="total-amount">
            Total: ${formatCurrency(invoice.total || invoice.amount || 0)}
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

  const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
    const client = (invoice as any).client;
    const project = (invoice as any).project;
    
    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
            <Text style={styles.clientName}>
              {client?.name || 'No client'} - {client?.company || 'No company'}
            </Text>
            {project && (
              <Text style={styles.projectName}>Project: {project.name}</Text>
            )}
          </View>
          <View style={styles.invoiceAmount}>
            <Text style={styles.amountText}>
              {formatCurrency(invoice.total || invoice.amount || 0)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
              <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <Text style={styles.dateText}>
            Created {formatDistanceToNow(new Date(invoice.created_at))}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePreview(invoice)}
            >
              <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownload(invoice)}
            >
              <Download size={16} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(invoice.id)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'sent': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    content: {
      flex: 1,
      padding: 24,
    },
    invoiceCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    invoiceInfo: {
      flex: 1,
    },
    invoiceNumber: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 4,
    },
    clientName: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    projectName: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    invoiceAmount: {
      alignItems: 'flex-end',
    },
    amountText: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    invoiceFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 600,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    previewContent: {
      flex: 1,
    },
    previewText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Invoices</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {invoices.length > 0 ? (
          invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Saved Invoices</Text>
            <Text style={styles.emptyDescription}>
              Create your first invoice to see it here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Invoice Preview - {selectedInvoice?.invoice_number}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.previewContent}>
              {selectedInvoice && (
                <View>
                  <Text style={styles.previewText}>
                    Invoice Number: {selectedInvoice.invoice_number}
                    {'\n'}
                    Status: {selectedInvoice.status.toUpperCase()}
                    {'\n'}
                    Amount: {formatCurrency(selectedInvoice.total || selectedInvoice.amount || 0)}
                    {'\n'}
                    Issue Date: {selectedInvoice.issue_date ? new Date(selectedInvoice.issue_date).toLocaleDateString() : 'N/A'}
                    {'\n'}
                    Due Date: {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'N/A'}
                    {'\n\n'}
                    {selectedInvoice.notes && `Notes: ${selectedInvoice.notes}\n\n`}
                    {selectedInvoice.terms && `Terms: ${selectedInvoice.terms}`}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}