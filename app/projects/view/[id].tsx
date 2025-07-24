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
import { DocumentPickerComponent } from '@/components/DocumentPicker';
import { UploadedFile } from '@/lib/fileUpload';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { FlatList } from 'react-native';

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
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'time' | 'tasks'>('overview');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);

  // Progress states
  const [useAutoProgress, setUseAutoProgress] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState('');

  // Form states
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', duration: '', date: new Date().toISOString().split('T')[0] });

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  // Calculate progress based on tasks
  const calculateProgress = () => {
    return calculateProgressFromTasks(tasks);
  };


  const calculateProgressFromTasks = (taskList: Task[]) => {
    if (taskList.length === 0) return 0;
    const completedTasks = taskList.filter(task => task.completed).length;
    return Math.round((completedTasks / taskList.length) * 100);
  };

  // Get the current progress value
  // Get the current progress value
  const getCurrentProgress = () => {
    if (!project) return 0;
    if (useAutoProgress) {
      // Only calculate from tasks if we have tasks loaded
      return tasks.length > 0 ? calculateProgress() : (project.progress || 0);
    }
    return project.progress || 0;
  };

  // Add the missing updateProjectProgress function
  const updateProjectProgress = async (progressValue: number) => {
    if (!project || !user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ progress: progressValue })
        .eq('id', project.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, progress: progressValue } : null);

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'project_updated',
          title: `Project progress updated to ${progressValue}%`,
          description: `Progress updated for project: ${project.name}`,
          entity_type: 'project',
          entity_id: project.id,
          user_id: user.id,
        }]);

      await fetchActivities();
      Alert.alert('Success', `Project progress updated to ${progressValue}%`);
    } catch (error) {
      console.error('Error updating project progress:', error);
      Alert.alert('Error', 'Failed to update project progress');
    }
  };

  // Handle manual progress update
  const handleUpdateProgress = () => {
    const progressValue = parseInt(newProgress);
    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      Alert.alert('Error', 'Please enter a valid progress value between 0 and 100');
      return;
    }

    updateProjectProgress(progressValue);
    setNewProgress('');
    setShowProgressModal(false);
  };

  // Update progress mode
  // Update progress mode
  const toggleProgressMode = async () => {
    const newMode = !useAutoProgress;
    setUseAutoProgress(newMode);

    if (newMode && tasks.length > 0) {
      // If switching to auto and we have tasks, update the database with calculated progress
      const calculatedProgress = calculateProgress();
      await updateProjectProgress(calculatedProgress);
    }
  };

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
      color: colors.textMuted,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: colors.primary,
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
      flex: 1,
      padding: 40,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
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

    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    fileName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 4,
    },
    fileSize: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
    },
    fileDate: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      marginTop: 4,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 6,
      marginLeft: 12,
    },



  });

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
      fetchActivities();
      fetchTasks(); // This will now fetch real data
      fetchTimeEntries();
      fetchFiles();
    }

    const refreshFiles = () => {
      if (activeTab === 'files') {
        fetchFiles();
      }
    };

    // For web
    if (Platform.OS === 'web') {
      window.addEventListener('focus', refreshFiles);
      return () => window.removeEventListener('focus', refreshFiles);
    }
  }, [id, activeTab]);

  // Add another useEffect to handle progress updates when tasks change:
  useEffect(() => {
    if (useAutoProgress && tasks.length >= 0 && project) {
      const newProgress = calculateProgress();
      // Only update if progress actually changed to avoid infinite loops
      if (project.progress !== newProgress) {
        updateProjectProgress(newProgress);
      }
    }
  }, [tasks, useAutoProgress]);
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
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('project_tasks') // Assuming you have a project_tasks table
        .select('*')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // If table doesn't exist, keep empty array instead of mock data
      setTasks([]);
    }
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
    if (!user || !id) return;

    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', id)
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching files:', error);
        setFiles([]);
        return;
      }

      if (!data || data.length === 0) {
        setFiles([]);
        return;
      }

      // Map database fields to ProjectFile interface - CORRECTED field names
      const projectFiles: ProjectFile[] = data.map(file => ({
        id: file.id,
        name: file.file_name,      // Changed from filename to file_name
        size: file.file_size,
        type: file.file_type,      // Changed from filetype to file_type
        url: `${file.file_url}?t=${Date.now()}`,
        uploaded_at: file.created_at
      }));

      setFiles(projectFiles);
    } catch (error) {
      console.error('Error fetching project files:', error);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
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
    router.push(`/invoices/ai-generate?projectId=${id}`);
  };

  const handleCreateContract = () => {
    router.push(`/contracts/ai-generate?projectId=${id}`);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!user || !id) return;

    try {
      const taskData = {
        project_id: id,
        user_id: user.id,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        completed: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('project_tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setTasks(prev => [data, ...prev]);

      // Update progress if in auto mode
      if (useAutoProgress) {
        const newTaskList = [data, ...tasks];
        const newProgress = newTaskList.length > 0 ? calculateProgressFromTasks(newTaskList) : 0;
        await updateProjectProgress(newProgress);
      }

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'task_created',
          title: `Task created: ${newTask.title}`,
          description: `New task added to project: ${project?.name}`,
          entity_type: 'project',
          entity_id: id,
          user_id: user.id,
        }]);

      await fetchActivities();
      setNewTask({ title: '', description: '' });
      setShowAddTaskModal(false);
      Alert.alert('Success', 'Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  };

  // Update the toggleTask function:
  const toggleTask = async (taskId: string) => {
    if (!user) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newCompletedStatus = !task.completed;

      const { error } = await supabase
        .from('project_tasks')
        .update({ completed: newCompletedStatus })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, completed: newCompletedStatus } : t
      );
      setTasks(updatedTasks);

      // Update progress if in auto mode
      if (useAutoProgress) {
        const newProgress = calculateProgressFromTasks(updatedTasks);
        await updateProjectProgress(newProgress);
      }

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'task_updated',
          title: `Task ${newCompletedStatus ? 'completed' : 'reopened'}: ${task.title}`,
          description: `Task status updated in project: ${project?.name}`,
          entity_type: 'project',
          entity_id: id,
          user_id: user.id,
        }]);

      await fetchActivities();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Update the deleteTask function:
  const deleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);

      // Update progress if in auto mode
      if (useAutoProgress) {
        const newProgress = updatedTasks.length > 0 ? calculateProgressFromTasks(updatedTasks) : 0;
        await updateProjectProgress(newProgress);
      }

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'task_deleted',
          title: `Task deleted: ${task.title}`,
          description: `Task removed from project: ${project?.name}`,
          entity_type: 'project',
          entity_id: id,
          user_id: user.id,
        }]);

      await fetchActivities();
      Alert.alert('Success', 'Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task');
    }
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
    // File upload is now handled by DocumentPickerComponent
    setShowUploadModal(false);
  };

  const handleFilesSelected = async (files: any[]) => {
    try {
      // Files are handled by the DocumentPicker component
      console.log('Files selected:', files);
    } catch (error) {
      console.error('Error handling files:', error);
      Alert.alert('Error', 'Failed to upload files');
    }
  };
  const handleFilesUploaded = async (uploadedFiles: UploadedFile[]) => {
    if (!user || !id) return;

    try {
      // Save file records to database with CORRECT field names
      const fileRecords = uploadedFiles.map(file => ({
        project_id: id,
        file_name: file.name,        // Changed from filename to file_name
        file_size: file.size,
        file_type: file.type,        // Changed from filetype to file_type
        file_url: file.url,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
      }));

      const { data: insertedFiles, error } = await supabase
        .from('project_files')
        .insert(fileRecords)
        .select();

      if (error) throw error;

      // Update local state with the actual database records - CORRECTED field names
      const newFiles: ProjectFile[] = (insertedFiles || []).map(file => ({
        id: file.id,
        name: file.file_name,        // Changed from filename to file_name
        size: file.file_size,
        type: file.file_type,        // Changed from filetype to file_type
        url: `${file.file_url}?t=${Date.now()}`,
        uploaded_at: file.created_at,
      }));

      setFiles(prev => [...prev, ...newFiles]);

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'files_uploaded',
          title: `${uploadedFiles.length} file(s) uploaded to project`,
          description: `Files: ${uploadedFiles.map(f => f.name).join(', ')}`,
          entity_type: 'project',
          entity_id: id,
          user_id: user.id,
        }]);

      await fetchActivities();
      Alert.alert('Success', `${uploadedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error saving uploaded files:', error);
      Alert.alert('Error', 'Files uploaded but failed to save records');
    }
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

  const OverviewTab = () => {
    const currentProgress = getCurrentProgress();
    return (
      <View style={styles.tabContent}>
        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {project?.description || 'No description provided'}
          </Text>
        </View>

        {/* Progress */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={toggleProgressMode}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: useAutoProgress ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginRight: 8
                }}
              >
                <Text style={{
                  fontSize: 12,
                  color: useAutoProgress ? 'white' : colors.textSecondary,
                  fontFamily: 'Inter-Medium'
                }}>
                  {useAutoProgress ? 'Auto' : 'Manual'}
                </Text>
              </TouchableOpacity>

              {!useAutoProgress && project && (
                <TouchableOpacity
                  onPress={() => {
                    setNewProgress(project.progress.toString());
                    setShowProgressModal(true);
                  }}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    backgroundColor: colors.background
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.primary }}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${currentProgress}%`,
                    backgroundColor: project ? getStatusColor(project.status) : colors.primary
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {currentProgress}%
            </Text>
          </View>

          {/* Progress details */}
          <View style={{ marginTop: 8 }}>
            {useAutoProgress ? (
              <Text style={[{ fontSize: 12, color: colors.textMuted }]}>
                {tasks.filter(task => task.completed).length} of {tasks.length} tasks completed
              </Text>
            ) : (
              <Text style={[{ fontSize: 12, color: colors.textMuted }]}>
                Manually set progress
              </Text>
            )}
          </View>
        </View>

        {/* Team Members */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Members</Text>
          {project?.project_members && project.project_members.length > 0 ? (
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
  };

  const FilesTab = () => {
    const handlePreviewFile = async (file: ProjectFile) => {
      try {
        const canOpen = await Linking.canOpenURL(file.url);
        if (canOpen) {
          await Linking.openURL(file.url);
        } else {
          Alert.alert('Preview not available', 'This file type cannot be previewed directly');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        Alert.alert('Error', 'Could not open file');
      }
    };

    const handleDeleteFile = async (fileId: string, fileUrl: string, fileName: string) => {
      if (!user || !id) return;

      try {
        // First delete from database
        const { error: dbError } = await supabase
          .from('project_files')
          .delete()
          .eq('id', fileId)
          .eq('uploaded_by', user.id); // Ensure user owns the file

        if (dbError) throw dbError;

        // Then delete from storage if URL is valid
        if (fileUrl) {
          const urlParts = fileUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'project-files');

          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/').split('?')[0]; // Remove query params

            const { error: storageError } = await supabase.storage
              .from('project-files')
              .remove([filePath]);

            if (storageError) {
              console.warn('File deleted from DB but not from storage:', storageError);
            }
          }
        }

        // Update UI
        setFiles(prev => prev.filter(f => f.id !== fileId));

        // Create activity log
        await supabase
          .from('activities')
          .insert([{
            type: 'file_deleted',
            title: 'File deleted from project',
            description: `File "${fileName}" deleted from project: ${project?.name}`,
            entity_type: 'project',
            entity_id: id,
            user_id: user.id,
          }]);

        await fetchActivities();

        // Close modal and reset state
        setShowDeleteModal(false);
        setFileToDelete(null);

        Alert.alert('Success', 'File deleted successfully');
      } catch (error) {
        console.error('Error deleting file:', error);
        Alert.alert('Error', 'Failed to delete file');
      }
    };
    return (

      <View style={styles.tabContent}>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowUploadModal(true)}
        >
          <Upload size={20} color="white" />
          <Text style={[styles.uploadButtonText, { color: 'white' }]}>Upload Files</Text>
        </TouchableOpacity>

        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          contentContainerStyle={files.length === 0 ? { flex: 1 } : {}}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.fileItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={() => handlePreviewFile(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FileText size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                    {(item.size / 1024 / 1024).toFixed(2)} MB • {item.type}
                  </Text>
                  <Text style={[styles.fileDate, { color: colors.textMuted }]}>
                    Uploaded {formatDistanceToNow(new Date(item.uploaded_at))} ago
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering the preview
                  setFileToDelete(item);
                  setShowDeleteModal(true);
                }}
                style={[styles.deleteButton, { backgroundColor: colors.error }]}
              >
                <Trash2 size={16} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={[
              styles.emptyFilesContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border
              }
            ]}>
              <FileText size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 16 }]}>
                No files uploaded yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tap the upload button to add files
              </Text>
            </View>
          }
        />

      </View>
    );
  };

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

  const handleDeleteFile = async (fileId: string, fileUrl: string, fileName: string) => {
    if (!user || !id) return;

    try {
      // First delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)
        .eq('uploaded_by', user.id); // Ensure user owns the file

      if (dbError) throw dbError;

      // Then delete from storage if URL is valid
      if (fileUrl) {
        const urlParts = fileUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'project-files');

        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/').split('?')[0]; // Remove query params

          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([filePath]);

          if (storageError) {
            console.warn('File deleted from DB but not from storage:', storageError);
          }
        }
      }

      // Update UI
      setFiles(prev => prev.filter(f => f.id !== fileId));

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'file_deleted',
          title: 'File deleted from project',
          description: `File "${fileName}" deleted from project: ${project?.name}`,
          entity_type: 'project',
          entity_id: id,
          user_id: user.id,
        }]);

      await fetchActivities();

      // Close modal and reset state
      setShowDeleteModal(false);
      setFileToDelete(null);

      Alert.alert('Success', 'File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.projectTitle} numberOfLines={1}>
            {project?.name || 'Project'}
          </Text>
        </View>
        {project && (
          <StatusDropdown
            currentStatus={project.status}
            options={projectStatusOptions}
            onStatusChange={(status: string) => {
              updateProjectStatus(status as 'todo' | 'in_progress' | 'completed');
            }}
          />
        )}
      </View>

      {/* Stats */}
      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatsCard
          icon={DollarSign}
          label="Budget"
          value={formatCurrency(project?.budget || 0)}
          color="#10B981"
        />
        <StatsCard
          icon={TrendingUp}
          label="Progress"
          value={`${getCurrentProgress()}%`}
          color="#3B82F6"
        />
        <StatsCard
          icon={Calendar}
          label="Due Date"
          value={project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
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
              Select files to upload to this project. Max 10 files at once.
            </Text>

            <DocumentPickerComponent
              onFilesSelected={(selectedFiles) => {
                console.log('Files selected:', selectedFiles);
              }}
              onFilesUploaded={handleFilesUploaded}
              maxFiles={10}
              allowedTypes={['application/pdf', 'image/*', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.*']}
              autoUpload={true}
              uploadBucket="project-files"
              uploadFolder={`projects/${id}`}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete File Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setFileToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete File</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setFileToDelete(null);
                }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center' }]}>
                Are you sure you want to delete this file? This action cannot be undone.
              </Text>

              {fileToDelete && (
                <View style={[
                  styles.fileItem,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    marginTop: 16,
                    opacity: 0.8
                  }
                ]}>
                  <FileText size={20} color={colors.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {fileToDelete.name}
                    </Text>
                    <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                      {(fileToDelete.size / 1024 / 1024).toFixed(2)} MB • {fileToDelete.type}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setFileToDelete(null);
                }}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error, borderColor: colors.error }]}
                onPress={() => {
                  if (fileToDelete && project) {
                    handleDeleteFile(fileToDelete.id, fileToDelete.url, fileToDelete.name);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Delete File
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
