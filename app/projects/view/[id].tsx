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
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import { supabase } from '@/lib/supabase';
import { Project, Client, TeamMember, Activity } from '@/types/database';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  Clock, 
  CheckSquare,
  Upload,
  Plus,
  ChevronDown,
  Mail,
  FileCheck,
  Target,
  TrendingUp,
  User,
  X,
  Save,
  Trash2,
  Check,
  Square
} from 'lucide-react-native';
import { formatCurrency, getStatusColor, formatDistanceToNow } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusDropdown } from '@/components/StatusDropdown';
import { TimerWidget } from '@/components/TimerWidget';

type ProjectWithRelations = Project & {
  client?: Client;
  project_members?: Array<{ team_member: TeamMember }>;
};

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
}

interface TimeEntry {
  id: string;
  description: string;
  duration: number;
  date: string;
  created_at: string;
}

interface ProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_at: string;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { shouldShowSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'time' | 'tasks'>('overview');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', duration: '', date: new Date().toISOString().split('T')[0] });

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  // Project status options
  const projectStatusOptions = [
    { value: 'todo', label: 'To Do', color: '#EF4444' },
    { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
    { value: 'completed', label: 'Completed', color: '#10B981' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 24,
    },
    backButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    backButtonText: {
      color: 'white',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerBackButton: {
      marginRight: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    projectTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderBottomWidth: 2,
    },
    tabText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    content: {
      flex: 1,
    },
    tabContent: {
      padding: 20,
    },
    section: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressBar: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      minWidth: 40,
    },
    teamList: {
      gap: 12,
    },
    teamMember: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    memberInitial: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    memberRole: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
    },
    activityList: {
      gap: 12,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      fontStyle: 'italic',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 20,
    },
    uploadButtonText: {
      color: 'white',
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 8,
    },
    filesGrid: {
      flex: 1,
    },
    emptyFilesContainer: {
      padding: 40,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 20,
    },
    addButtonText: {
      color: 'white',
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 20,
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
    // Task styles
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    taskCheckbox: {
      marginRight: 12,
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    taskActions: {
      flexDirection: 'row',
      gap: 8,
    },
    taskActionButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Time entry styles
    timeEntryItem: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    timeEntryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    timeEntryDescription: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      flex: 1,
    },
    timeEntryDuration: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
    },
    timeEntryDate: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
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
      padding: 24,
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
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    modalButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    modalButtonTextPrimary: {
      color: 'white',
    },
    modalButtonTextSecondary: {
      color: colors.textSecondary,
    },
  });

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
      fetchActivities();
      fetchTasks();
      fetchTimeEntries();
      fetchFiles();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*),
          project_members(
            team_member:team_members(*)
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchTasks = async () => {
    // Mock data for now - in a real app, you'd fetch from a tasks table
    setTasks([
      {
        id: '1',
        title: 'Design wireframes',
        description: 'Create initial wireframes for the main user flows',
        completed: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Set up development environment',
        description: 'Configure local development setup and CI/CD pipeline',
        completed: false,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const fetchTimeEntries = async () => {
    // Mock data for now - in a real app, you'd fetch from a time_entries table
    setTimeEntries([
      {
        id: '1',
        description: 'Initial project setup and planning',
        duration: 120, // minutes
        date: '2025-01-15',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        description: 'Design review and feedback session',
        duration: 90,
        date: '2025-01-14',
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const fetchFiles = async () => {
    // Mock data for now - in a real app, you'd fetch from a project_files table
    setFiles([]);
  };

  const updateProjectStatus = async (newStatus: 'todo' | 'in_progress' | 'completed') => {
    if (!project || !user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', project.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'project_updated',
          title: `Project status changed to ${newStatus.replace('_', ' ')}`,
          description: `Status updated for project: ${project.name}`,
          entity_type: 'project',
          entity_id: project.id,
          user_id: user.id,
        }]);

      await fetchActivities();
      Alert.alert('Success', `Project status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating project status:', error);
      Alert.alert('Error', 'Failed to update project status');
    }
  };

  const handleTimeEntryComplete = (description: string, duration: number) => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      description,
      duration,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setTimeEntries(prev => [newEntry, ...prev]);
  };

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?projectId=${id}`);
  };

  const handleCreateContract = () => {
    router.push(`/contracts/new?projectId=${id}`);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      completed: false,
      created_at: new Date().toISOString(),
    };

    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', description: '' });
    setShowAddTaskModal(false);
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleAddTimeEntry = () => {
    if (!newTimeEntry.description.trim() || !newTimeEntry.duration) {
      Alert.alert('Error', 'Please enter description and duration');
      return;
    }

    const entry: TimeEntry = {
      id: Date.now().toString(),
      description: newTimeEntry.description.trim(),
      duration: parseInt(newTimeEntry.duration),
      date: newTimeEntry.date,
      created_at: new Date().toISOString(),
    };

    setTimeEntries(prev => [entry, ...prev]);
    setNewTimeEntry({ description: '', duration: '', date: new Date().toISOString().split('T')[0] });
    setShowAddTimeModal(false);
  };

  const handleFileUpload = () => {
    // In a real app, this would open a file picker
    Alert.alert('File Upload', 'File upload functionality would be implemented here with expo-document-picker');
    setShowUploadModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Project not found</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatsCard = ({ icon: Icon, label, value, color }: { 
    icon: any, 
    label: string, 
    value: string, 
    color: string 
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  const TabButton = ({ tab, label, isActive }: { 
    tab: typeof activeTab, 
    label: string, 
    isActive: boolean 
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { borderBottomColor: isActive ? colors.primary : 'transparent' }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText,
        { color: isActive ? colors.primary : colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const OverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Description */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {project.description || 'No description provided'}
        </Text>
      </View>

      {/* Progress */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${project.progress}%`,
                  backgroundColor: getStatusColor(project.status)
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.text }]}>{project.progress}%</Text>
        </View>
      </View>

      {/* Team Members */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Members</Text>
        {project.project_members && project.project_members.length > 0 ? (
          <View style={styles.teamList}>
            {project.project_members.map((member, index) => (
              <View key={index} style={styles.teamMember}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.memberInitial}>
                    {member.team_member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.team_member.name}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                    {member.team_member.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No team members assigned
          </Text>
        )}
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        {activities.length > 0 ? (
          <View style={styles.activityList}>
            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    {activity.title}
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                    {formatDistanceToNow(new Date(activity.created_at))}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No recent activity
          </Text>
        )}
      </View>
    </View>
  );

  const FilesTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={[styles.uploadButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowUploadModal(true)}
      >
        <Upload size={20} color="white" />
        <Text style={styles.uploadButtonText}>Upload Files</Text>
      </TouchableOpacity>
      
      <View style={styles.filesGrid}>
        {files.length > 0 ? (
          files.map((file) => (
            <View key={file.id} style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{file.name}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
              </Text>
            </View>
          ))
        ) : (
          <View style={[styles.emptyFilesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No files uploaded yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const TimeTab = () => (
    <View style={styles.tabContent}>
      <TimerWidget 
        onTimeEntryComplete={handleTimeEntryComplete}
        projectName={project.name}
      />

      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddTimeModal(true)}
      >
        <Plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add Manual Entry</Text>
      </TouchableOpacity>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Entries</Text>
        {timeEntries.length > 0 ? (
          timeEntries.map((entry) => (
            <View key={entry.id} style={[styles.timeEntryItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.timeEntryHeader}>
                <Text style={[styles.timeEntryDescription, { color: colors.text }]}>
                  {entry.description}
                </Text>
                <Text style={[styles.timeEntryDuration, { color: colors.primary }]}>
                  {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                </Text>
              </View>
              <Text style={[styles.timeEntryDate, { color: colors.textMuted }]}>
                {new Date(entry.date).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No time entries recorded yet
          </Text>
        )}
      </View>
    </View>
  );

  const TasksTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddTaskModal(true)}
      >
        <Plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add Task</Text>
      </TouchableOpacity>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <View key={task.id} style={[styles.taskItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity 
                style={styles.taskCheckbox}
                onPress={() => toggleTask(task.id)}
              >
                {task.completed ? (
                  <Check size={24} color={colors.success} />
                ) : (
                  <Square size={24} color={colors.textMuted} />
                )}
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle, 
                  { 
                    color: task.completed ? colors.textMuted : colors.text,
                    textDecorationLine: task.completed ? 'line-through' : 'none'
                  }
                ]}>
                  {task.title}
                </Text>
                {task.description && (
                  <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                    {task.description}
                  </Text>
                )}
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity 
                  style={styles.taskActionButton}
                  onPress={() => deleteTask(task.id)}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No tasks created yet
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.projectTitle} numberOfLines={1}>
            {project.name}
          </Text>
        </View>
        <StatusDropdown
          currentStatus={project.status}
          options={projectStatusOptions}
          onStatusChange={updateProjectStatus}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatsCard 
          icon={DollarSign} 
          label="Budget" 
          value={formatCurrency(project.budget || 0)} 
          color="#10B981" 
        />
        <StatsCard 
          icon={TrendingUp} 
          label="Progress" 
          value={`${project.progress}%`} 
          color="#3B82F6" 
        />
        <StatsCard 
          icon={Calendar} 
          label="Due Date" 
          value={project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'} 
          color="#F59E0B" 
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton tab="overview" label="Overview" isActive={activeTab === 'overview'} />
        <TabButton tab="files" label="Files" isActive={activeTab === 'files'} />
        <TabButton tab="time" label="Time" isActive={activeTab === 'time'} />
        <TabButton tab="tasks" label="Tasks" isActive={activeTab === 'tasks'} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'time' && <TimeTab />}
        {activeTab === 'tasks' && <TasksTab />}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleCreateInvoice}
        >
          <FileText size={16} color="white" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
            Create Invoice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handleCreateContract}
        >
          <FileCheck size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Create Contract
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddTaskModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.input}
                value={newTask.title}
                onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
                placeholder="Enter task title"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newTask.description}
                onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
                placeholder="Enter task description"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddTask}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Add Task
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Time Entry Modal */}
      <Modal
        visible={showAddTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Time Entry</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddTimeModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                value={newTimeEntry.description}
                onChangeText={(text) => setNewTimeEntry(prev => ({ ...prev, description: text }))}
                placeholder="What did you work on?"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                value={newTimeEntry.duration}
                onChangeText={(text) => setNewTimeEntry(prev => ({ ...prev, duration: text }))}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={newTimeEntry.date}
                onChangeText={(text) => setNewTimeEntry(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAddTimeModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddTimeEntry}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Add Entry
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Files</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowUploadModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              File upload functionality would be implemented here using expo-document-picker for selecting files and a cloud storage service for hosting.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleFileUpload}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Choose Files
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}