import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Client, Project } from '@/types/database';
import { Users, Search, Plus, Mail, Phone, CreditCard as Edit, Trash2, FolderOpen, X } from 'lucide-react-native';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClientProjects, setSelectedClientProjects] = useState<Project[]>([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProjects = async (clientId: string, clientName: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSelectedClientProjects(data || []);
      setSelectedClientName(clientName);
      setShowProjectsModal(true);
    } catch (error) {
      console.error('Error fetching client projects:', error);
      Alert.alert('Error', 'Failed to load client projects');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const handleAddClient = () => {
    router.push('/clients/new');
  };

  const handleEditClient = (clientId: string) => {
    router.push(`/clients/edit/${clientId}`);
  };

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/view/${clientId}`);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${clientName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId)
                .eq('user_id', user?.id);

              if (error) throw error;

              // Create activity log
              await supabase
                .from('activities')
                .insert([{
                  type: 'client_deleted',
                  title: `Client deleted: ${clientName}`,
                  description: 'Client was permanently deleted',
                  entity_type: 'client',
                  user_id: user?.id,
                }]);

              await fetchClients();
              Alert.alert('Success', 'Client deleted successfully');
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ]
    );
  };

  const handleViewProjects = (clientId: string, clientName: string) => {
    fetchClientProjects(clientId, clientName);
  };

  const handleProjectPress = (projectId: string) => {
    setShowProjectsModal(false);
    router.push(`/projects/view/${projectId}`);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate bottom padding to account for tab bar
  const getBottomPadding = () => {
    if (Platform.OS === 'android') {
      const androidBottomPadding = Math.max(insets.bottom + 8, 24);
      const tabBarHeight = 70 + androidBottomPadding;
      return tabBarHeight + 20;
    }
    return insets.bottom > 0 ? 100 + insets.bottom : 100;
  };

  const bottomPadding = isMobile ? getBottomPadding() : 20;

  const ClientCard = ({ client }: { client: Client }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientInitial}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.company && (
            <Text style={styles.clientCompany}>{client.company}</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleViewClient(client.id)}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditClient(client.id)}
          >
            <Edit size={16} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteClient(client.id, client.name)}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.clientDetails}>
        {client.email && (
          <View style={styles.contactItem}>
            <Mail size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>{client.email}</Text>
          </View>
        )}
        {client.phone && (
          <View style={styles.contactItem}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>{client.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.clientActions}>
        <TouchableOpacity style={styles.primaryActionButton}>
          <Mail size={16} color={colors.primary} />
          <Text style={styles.primaryActionButtonText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={() => handleViewProjects(client.id, client.name)}
        >
          <FolderOpen size={16} color={colors.primary} />
          <Text style={styles.secondaryActionButtonText}>View Projects</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ProjectItem = ({ project }: { project: Project }) => (
    <TouchableOpacity 
      style={styles.projectItem}
      onPress={() => handleProjectPress(project.id)}
    >
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{project.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
          <Text style={styles.statusText}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>
      {project.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {project.description}
        </Text>
      )}
      <View style={styles.projectFooter}>
        <Text style={styles.projectBudget}>
          {project.budget ? formatCurrency(project.budget) : 'No budget set'}
        </Text>
        <Text style={styles.projectProgress}>{project.progress || 0}% complete</Text>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    controls: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    clientCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clientHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    clientAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    clientInitial: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    clientInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    clientCompany: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
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
      minWidth: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    clientDetails: {
      marginBottom: 12,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    contactText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginLeft: 8,
    },
    clientActions: {
      flexDirection: 'row',
      gap: 8,
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      justifyContent: 'center',
    },
    primaryActionButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
      marginLeft: 4,
    },
    secondaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      justifyContent: 'center',
    },
    secondaryActionButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
      marginLeft: 4,
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
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
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
      maxWidth: 500,
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
    projectsList: {
      maxHeight: 400,
    },
    projectItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    projectName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      flex: 1,
      marginRight: 8,
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
    projectDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    projectFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    projectBudget: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    projectProgress: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    emptyProjects: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyProjectsText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginTop: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Always show header on desktop/web when sidebar is visible */}
      {shouldShowSidebar && (
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddClient}>
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No clients found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Add your first client to get started'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddClient}>
                <Text style={styles.emptyButtonText}>Add Client</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Projects Modal */}
      <Modal
        visible={showProjectsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProjectsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Projects for {selectedClientName}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowProjectsModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.projectsList}>
              {selectedClientProjects.length > 0 ? (
                selectedClientProjects.map((project) => (
                  <ProjectItem key={project.id} project={project} />
                ))
              ) : (
                <View style={styles.emptyProjects}>
                  <FolderOpen size={48} color={colors.textMuted} />
                  <Text style={styles.emptyProjectsText}>
                    No projects found for this client
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