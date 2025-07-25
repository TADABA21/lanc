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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import { supabase } from '@/lib/supabase';
import { Employee, Project, Activity } from '@/types/database';
import { ArrowLeft, Mail, Phone, Calendar, DollarSign, Briefcase, User, MapPin, Clock, TrendingUp, FolderOpen, Award, ExternalLink, CreditCard as Edit, MessageSquare } from 'lucide-react-native';
import { formatDistanceToNow, getStatusColor } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusDropdown } from '@/components/StatusDropdown';

type EmployeeWithStats = Employee & {
  projects?: Project[];
  totalProjects?: number;
  activeProjects?: number;
  completedProjects?: number;
};

export default function TeamMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { shouldShowSidebar } = useSidebar();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [employee, setEmployee] = useState<EmployeeWithStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = Platform.OS !== 'web' || (Platform.OS === 'web' && window.innerWidth < 768);

  // Team member status options
  const teamStatusOptions = [
    { value: 'active', label: 'Active', color: '#10B981' },
    { value: 'on_leave', label: 'On Leave', color: '#F59E0B' },
    { value: 'terminated', label: 'Terminated', color: '#EF4444' },
  ];

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (employee) {
      fetchActivities();
    }
  }, [employee]);

  const fetchEmployeeDetails = async () => {
    if (!user || !id) return;

    try {
      // Fetch employee details
      const { data: employeeData, error: employeeError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (employeeError) throw employeeError;

      // Fetch employee's projects through project_members
      const { data: projectMembersData, error: projectMembersError } = await supabase
        .from('project_members')
        .select(`
          project:projects(*)
        `)
        .eq('team_member_id', id);

      if (projectMembersError) throw projectMembersError;

      // Add type assertion here
      const projects = (projectMembersData?.map(pm => pm.project).filter(Boolean) as unknown as Project[]);
      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => p.status === 'in_progress').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;

      setEmployee({
        ...employeeData,
        projects,
        totalProjects,
        activeProjects,
        completedProjects,
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      Alert.alert('Error', 'Failed to load team member details');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!user || !id || !employee) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .or(`entity_id.eq.${id},description.ilike.%${employee.name}%`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const updateEmployeeStatus = async (newStatus: 'active' | 'on_leave' | 'terminated') => {
    if (!employee || !user) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: newStatus })
        .eq('id', employee.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEmployee(prev => prev ? { ...prev, status: newStatus } : null);

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'team_member_updated',
          title: `Team member status changed to ${newStatus.replace('_', ' ')}`,
          description: `Status updated for team member: ${employee.name}`,
          entity_type: 'team_member',
          entity_id: employee.id,
          user_id: user.id,
        }]);

      await fetchActivities();
      Alert.alert('Success', `Team member status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating team member status:', error);
      Alert.alert('Error', 'Failed to update team member status');
    }
  };

  const handleSendEmail = async () => {
    if (!employee?.email) {
      Alert.alert('No Email', 'This team member does not have an email address on file.');
      return;
    }

    try {
      // Always use AI email composer with pre-filled data
      const params = new URLSearchParams({
        to: employee.email,
        employeeName: employee.name,
        ...(employee.role && { employeeRole: employee.role }),
        ...(employee.department && { employeeDepartment: employee.department }),
      });
      router.push(`/email/ai-compose?${params.toString()}`);
    } catch (error) {
      console.error('Error opening email:', error);
      // Fallback to basic compose
      router.push(`/email/ai-compose?to=${employee.email}&employeeName=${employee.name}`);
    }
  };

  const handleCallEmployee = async () => {
    if (!employee?.phone) {
      Alert.alert('No Phone', 'This team member does not have a phone number on file.');
      return;
    }

    try {
      const phoneUrl = `tel:${employee.phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);

      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Cannot Call', 'Unable to make phone calls on this device.');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleEditEmployee = () => {
    router.push(`/team/edit/${id}`);
  };

  const handleSendMessage = () => {
    if (!employee?.email) {
      Alert.alert('No Email', 'This team member does not have an email address on file.');
      return;
    }
    router.push(`/email/ai-compose?to=${employee.email}&employeeName=${employee.name}`);
  };

  const getYearsOfService = () => {
    if (!employee || !employee.hire_date) return 'N/A';
    const hireDate = new Date(employee.hire_date);
    const now = new Date();
    const years = now.getFullYear() - hireDate.getFullYear();
    const months = now.getMonth() - hireDate.getMonth();

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  // Component definitions
  const InfoItem = ({ icon: Icon, label, value, onPress }: {
    icon: any;
    label: string;
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.infoItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
      {onPress && <ExternalLink size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  const StatCard = ({ icon: Icon, label, value, color }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const ProjectItem = ({ project }: { project: Project }) => (
    <TouchableOpacity
      style={[styles.projectItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/projects/view/${project.id}`)}
    >
      <View style={styles.projectHeader}>
        <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
        <View style={[styles.projectStatus, { backgroundColor: getStatusColor(project.status) }]}>
          <Text style={styles.projectStatusText}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>
      {project.description && (
        <Text style={[styles.projectDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {project.description}
        </Text>
      )}
      <View style={styles.projectProgress}>
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
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {project.progress}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ActivityItem = ({ activity }: { activity: Activity }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: colors.text }]}>
          {activity.title}
        </Text>
        {activity.description && (
          <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
            {activity.description}
          </Text>
        )}
        <Text style={[styles.activityTime, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(activity.created_at))}
        </Text>
      </View>
    </View>
  );

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
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBackButton: {
      marginRight: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    employeeName: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      flex: 1,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    employeeAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#8B5CF6',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    employeeInitial: {
      fontSize: 40,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    employeeTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    employeeRole: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    statusContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
    },
    infoList: {
      gap: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    statsContainer: {
      flexDirection: 'row',
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
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
    },
    projectsList: {
      gap: 12,
    },
    projectItem: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
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
      flex: 1,
    },
    projectStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    projectStatusText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    projectDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      marginBottom: 12,
      lineHeight: 20,
    },
    projectProgress: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressBar: {
      flex: 1,
      height: 6,
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
      minWidth: 32,
    },
    activityContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityList: {
      gap: 16,
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
      fontFamily: 'Inter-SemiBold',
      marginBottom: 2,
    },
    activityDescription: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      marginBottom: 4,
      lineHeight: 18,
    },
    activityTime: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
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
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading team member...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Team member not found</Text>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.employeeName} numberOfLines={1}>
          {employee.name}
        </Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditEmployee}>
          <Edit size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <StatusDropdown
          currentStatus={employee.status}
          options={teamStatusOptions}
          onStatusChange={(status: string) => {
            updateEmployeeStatus(status as 'active' | 'on_leave' | 'terminated');
          }}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Employee Info */}
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeInitial}>
            {employee.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.employeeTitle}>{employee.name}</Text>
        <Text style={styles.employeeRole}>{employee.role}</Text>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoList}>
            {employee.email && (
              <InfoItem
                icon={Mail}
                label="Email"
                value={employee.email}
                onPress={handleSendEmail}
              />
            )}
            {employee.phone && (
              <InfoItem
                icon={Phone}
                label="Phone"
                value={employee.phone}
                onPress={handleCallEmployee}
              />
            )}
            {employee.department && (
              <InfoItem
                icon={Briefcase}
                label="Department"
                value={employee.department}
              />
            )}
            {employee.hire_date && (
              <InfoItem
                icon={Calendar}
                label="Hire Date"
                value={new Date(employee.hire_date).toLocaleDateString()}
              />
            )}
            {employee.salary && (
              <InfoItem
                icon={DollarSign}
                label="Annual Salary"
                value={formatCurrency(employee.salary)}
              />
            )}
            {employee.emergency_contact && (
              <InfoItem
                icon={Phone}
                label="Emergency Contact"
                value={employee.emergency_contact}
              />
            )}
          </View>
        </View>

        {/* Performance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsContainer}>
            <StatCard
              icon={FolderOpen}
              label="Total Projects"
              value={employee.totalProjects || 0}
              color="#3B82F6"
            />
            <StatCard
              icon={TrendingUp}
              label="Active Projects"
              value={employee.activeProjects || 0}
              color="#10B981"
            />
            <StatCard
              icon={Award}
              label="Completed"
              value={employee.completedProjects || 0}
              color="#F59E0B"
            />
            <StatCard
              icon={Clock}
              label="Years of Service"
              value={getYearsOfService()}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Current Projects */}
        {employee.projects && employee.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Projects</Text>
            <View style={styles.projectsList}>
              {employee.projects.slice(0, 3).map((project) => (
                <ProjectItem key={project.id} project={project} />
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              <View style={styles.activityList}>
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No recent activity</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleSendEmail}
        >
          <Mail size={16} color="white" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
            Send Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handleSendMessage}
        >
          <MessageSquare size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Send Message
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}