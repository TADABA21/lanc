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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Project, Client } from '@/types/database';
import { FolderOpen, Search, Plus, CreditCard as Edit, Trash2, Eye, X } from 'lucide-react-native';
import { getStatusColor } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar } = useSidebar();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<(Project & { client?: Client })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null);

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleAddProject = () => {
    router.push('/projects/new');
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/projects/edit/${projectId}`);
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/view/${projectId}`);
  };

  const confirmDeleteProject = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteModalVisible(true);
  };

  const handleDeleteProject = async () => {
    if (!user || !projectToDelete) return;

    console.log('🗑️ Starting deletion process for project:', projectToDelete);
    
    try {
      // Step 1: Delete related project members
      console.log('📝 Deleting project members...');
      const { error: membersError, count: membersCount } = await supabase
        .from('project_members')
        .delete({ count: 'exact' })
        .eq('project_id', projectToDelete.id);
      
      console.log(`✅ Deleted ${membersCount || 0} project members`);
      if (membersError) {
        console.error('❌ Members deletion error:', membersError);
        throw membersError;
      }

      // Step 2: Delete related project files
      console.log('📎 Deleting project files...');
      const { error: filesError, count: filesCount } = await supabase
        .from('project_files')
        .delete({ count: 'exact' })
        .eq('project_id', projectToDelete.id);
      
      console.log(`✅ Deleted ${filesCount || 0} project files`);
      if (filesError) {
        console.error('❌ Files deletion error:', filesError);
        throw filesError;
      }

      // Step 3: Update invoices to remove project reference
      console.log('💰 Updating invoices...');
      const { error: invoicesError, count: invoicesCount } = await supabase
        .from('invoices')
        .update({ project_id: null })
        .eq('project_id', projectToDelete.id)
        .eq('user_id', user.id);
      
      console.log(`✅ Updated ${invoicesCount || 0} invoices`);
      if (invoicesError) {
        console.error('❌ Invoices update error:', invoicesError);
        throw invoicesError;
      }

      // Step 4: Update contracts to remove project reference
      console.log('📋 Updating contracts...');
      const { error: contractsError, count: contractsCount } = await supabase
        .from('contracts')
        .update({ project_id: null })
        .eq('project_id', projectToDelete.id)
        .eq('user_id', user.id);
      
      console.log(`✅ Updated ${contractsCount || 0} contracts`);
      if (contractsError) {
        console.error('❌ Contracts update error:', contractsError);
        throw contractsError;
      }

      // Step 5: Update testimonials to remove project reference
      console.log('⭐ Updating testimonials...');
      const { error: testimonialsError, count: testimonialsCount } = await supabase
        .from('testimonials')
        .update({ project_id: null })
        .eq('project_id', projectToDelete.id)
        .eq('user_id', user.id);
      
      console.log(`✅ Updated ${testimonialsCount || 0} testimonials`);
      if (testimonialsError) {
        console.error('❌ Testimonials update error:', testimonialsError);
        throw testimonialsError;
      }

      // Step 6: Delete the main project
      console.log('🏗️ Deleting main project...');
      const { error: projectError, count: projectCount } = await supabase
        .from('projects')
        .delete({ count: 'exact' })
        .eq('id', projectToDelete.id)
        .eq('user_id', user.id);

      console.log(`✅ Deleted ${projectCount || 0} project(s)`);
      if (projectError) {
        console.error('❌ Project deletion error:', projectError);
        throw projectError;
      }

      if (projectCount === 0) {
        console.warn('⚠️ No project was deleted - check if project exists and user_id matches');
        Alert.alert('Warning', 'No project was found to delete. It may have already been removed.');
        return;
      }

      // Step 7: Create activity log
      console.log('📊 Creating activity log...');
      const { error: activityError } = await supabase
        .from('activities')
        .insert([{
          type: 'project_deleted',
          title: `Project deleted: ${projectToDelete.name}`,
          description: 'Project was permanently deleted',
          entity_type: 'project',
          user_id: user.id,
        }]);

      if (activityError) {
        console.error('❌ Activity log error (non-critical):', activityError);
        // Don't throw here - activity log failure shouldn't stop deletion
      } else {
        console.log('✅ Activity logged successfully');
      }

      // Step 8: Refresh the projects list
      console.log('🔄 Refreshing projects list...');
      await fetchProjects();
      console.log('✅ Projects list refreshed');
      
      Alert.alert('Success', 'Project deleted successfully');
      console.log('🎉 Project deletion completed successfully');
      
    } catch (error) {
      console.error('💥 Error deleting project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // More specific error messages
      let errorMessage = 'Failed to delete project. Please try again.';
      if (error instanceof Error && error.message) {
        errorMessage += `\n\nError: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setDeleteModalVisible(false);
      setProjectToDelete(null);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBottomPadding = () => {
    if (Platform.OS === 'android') {
      const androidBottomPadding = Math.max(insets.bottom + 8, 24);
      const tabBarHeight = 70 + androidBottomPadding;
      return tabBarHeight + 20;
    }
    return insets.bottom > 0 ? 100 + insets.bottom : 100;
  };

  const bottomPadding = isMobile ? getBottomPadding() : 20;

  function StatusBadge({ status }: { status: string }) {
    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
        <Text style={styles.statusText}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Text>
      </View>
    );
  }

  function ProjectCard({ project }: { project: Project & { client?: Client } }) {
    return (
      <View style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>
              {project.name || 'Untitled Project'}
            </Text>
            <Text style={styles.clientName}>
              {project.client?.name || 'No client assigned'}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleViewProject(project.id)}
            >
              <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditProject(project.id)}
            >
              <Edit size={16} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => confirmDeleteProject(project.id, project.name)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.projectDetails}>
          <StatusBadge status={project.status} />
          {project.budget ? (
            <Text style={styles.budget}>
              {formatCurrency(project.budget)}
            </Text>
          ) : null}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${project.progress || 0}%`,
                  backgroundColor: getStatusColor(project.status)
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {project.progress || 0}%
          </Text>
        </View>

        {project.description ? (
          <Text style={styles.projectDescription} numberOfLines={2}>
            {project.description}
          </Text>
        ) : null}
      </View>
    );
  }

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
      marginBottom: 12,
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
    filterContainer: {
      flexDirection: 'row',
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    filterButtonTextActive: {
      color: 'white',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    projectCard: {
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
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    projectInfo: {
      flex: 1,
    },
    projectName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    clientName: {
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
    },
    projectDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    budget: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressBar: {
      flex: 1,
      height: 6,
      backgroundColor: colors.borderLight,
      borderRadius: 3,
      marginRight: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      minWidth: 32,
    },
    projectDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      lineHeight: 20,
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
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: '90%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalMessage: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 24,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    modalCancelButton: {
      backgroundColor: colors.borderLight,
    },
    modalDeleteButton: {
      backgroundColor: colors.error,
    },
    modalButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    modalCancelButtonText: {
      color: colors.text,
    },
    modalDeleteButtonText: {
      color: 'white',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {shouldShowSidebar && (
        <View style={styles.header}>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProject}>
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {(['all', 'todo', 'in_progress', 'completed'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive
              ]}>
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <FolderOpen size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No projects found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first project to get started'
              }
            </Text>
            {!searchQuery && statusFilter === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddProject}>
                <Text style={styles.emptyButtonText}>Create Project</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable 
          style={styles.modalContainer}
          onPress={() => setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Project</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalCancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDeleteProject}
              >
                <Text style={[styles.modalButtonText, styles.modalDeleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}