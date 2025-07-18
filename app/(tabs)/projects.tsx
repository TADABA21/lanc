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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Project, Client } from '@/types/database';
import { FolderOpen, Search, Plus, CreditCard as Edit, Trash2, Eye } from 'lucide-react-native';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<(Project & { client?: Client })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId)
                .eq('user_id', user?.id);

              if (error) throw error;

              // Create activity log
              await supabase
                .from('activities')
                .insert([{
                  type: 'project_deleted',
                  title: `Project deleted: ${projectName}`,
                  description: 'Project was permanently deleted',
                  entity_type: 'project',
                  user_id: user?.id,
                }]);

              await fetchProjects();
              Alert.alert('Success', 'Project deleted successfully');
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
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

  // StatusBadge component - properly wrapped
  function StatusBadge({ status }: { status: string }) {
    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
        <Text style={styles.statusText}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Text>
      </View>
    );
  }

  // ProjectCard component - properly wrapped with explicit return
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
              onPress={() => handleDeleteProject(project.id, project.name)}
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
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Always show header on desktop/web when sidebar is visible */}
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
    </SafeAreaView>
  );
}