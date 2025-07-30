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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Contract } from '@/types/database';
import { ArrowLeft, FileCheck, Eye, Download, Trash2, X } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SavedContractsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(name, company),
          project:projects(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      Alert.alert('Error', 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (contract: Contract) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const handleDownload = async (contract: Contract) => {
    try {
      const html = generateContractHTML(contract);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${contract.title}.pdf`;
        link.click();
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error downloading contract:', error);
      Alert.alert('Error', 'Failed to download contract');
    }
  };

  const handleDelete = async (contractId: string) => {
    Alert.alert(
      'Delete Contract',
      'Are you sure you want to delete this contract? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('contracts')
                .delete()
                .eq('id', contractId)
                .eq('user_id', user?.id);

              if (error) throw error;
              
              await fetchContracts();
              Alert.alert('Success', 'Contract deleted successfully');
            } catch (error) {
              console.error('Error deleting contract:', error);
              Alert.alert('Error', 'Failed to delete contract');
            }
          }
        }
      ]
    );
  };

  const generateContractHTML = (contract: Contract) => {
    const client = (contract as any).client;
    
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

  const ContractCard = ({ contract }: { contract: Contract }) => {
    const client = (contract as any).client;
    const project = (contract as any).project;
    
    return (
      <View style={styles.contractCard}>
        <View style={styles.contractHeader}>
          <View style={styles.contractInfo}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            <Text style={styles.contractType}>{contract.type}</Text>
            <Text style={styles.clientName}>
              {client?.name || 'No client'} - {client?.company || 'No company'}
            </Text>
            {project && (
              <Text style={styles.projectName}>Project: {project.name}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status || 'draft') }]}>
            <Text style={styles.statusText}>{(contract.status || 'draft').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.contractFooter}>
          <Text style={styles.dateText}>
            Created {formatDistanceToNow(new Date(contract.created_at))}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePreview(contract)}
            >
              <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownload(contract)}
            >
              <Download size={16} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(contract.id)}
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
      case 'signed': return '#10B981';
      case 'sent': return '#F59E0B';
      case 'completed': return '#8B5CF6';
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
    contractCard: {
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
    contractHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    contractInfo: {
      flex: 1,
    },
    contractTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 4,
    },
    contractType: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
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
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    contractFooter: {
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
      flex: 1,
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
        <Text style={styles.headerTitle}>Saved Contracts</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {contracts.length > 0 ? (
          contracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileCheck size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Saved Contracts</Text>
            <Text style={styles.emptyDescription}>
              Create your first contract to see it here
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
                {selectedContract?.title}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.previewContent}>
              {selectedContract && (
                <Text style={styles.previewText}>
                  {selectedContract.content}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}