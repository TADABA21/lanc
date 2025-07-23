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
import { Employee } from '@/types/database';
import { User, Search, Plus, Mail, Phone, CreditCard as Edit, Trash2, X } from 'lucide-react-native';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'terminated'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string, name: string } | null>(null);

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleAddTeamMember = () => {
    router.push('/team/new');
  };

  const handleEditTeamMember = (employeeId: string) => {
    router.push(`/team/edit/${employeeId}`);
  };

  const handleViewProfile = (employeeId: string) => {
    router.push(`/team/view/${employeeId}`);
  };

  const confirmDeleteTeamMember = (employeeId: string, employeeName: string) => {
    setEmployeeToDelete({ id: employeeId, name: employeeName });
    setDeleteModalVisible(true);
  };

  const handleDeleteTeamMember = async () => {
    if (!user || !employeeToDelete) return;

    try {
      // Remove from project memberships first
      const { error: projectMembersError } = await supabase
        .from('project_members')
        .delete()
        .eq('team_member_id', employeeToDelete.id);

      if (projectMembersError) {
        console.warn('Error removing project memberships:', projectMembersError);
      }

      // Update project files to remove uploader reference
      await supabase
        .from('project_files')
        .update({ uploaded_by: null })
        .eq('uploaded_by', employeeToDelete.id);

      // Now delete the team member
      const { error: teamMemberError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', employeeToDelete.id)
        .eq('user_id', user.id);

      if (teamMemberError) throw teamMemberError;

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'team_member_deleted',
          title: `Team member deleted: ${employeeToDelete.name}`,
          description: 'Team member was permanently deleted',
          entity_type: 'team_member',
          user_id: user.id,
        }]);

      await fetchEmployees();
      Alert.alert('Success', 'Team member deleted successfully');
    } catch (error) {
      console.error('Error deleting team member:', error);
      Alert.alert('Error', 'Failed to delete team member');
    } finally {
      setDeleteModalVisible(false);
      setEmployeeToDelete(null);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
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

  const StatusBadge = ({ status }: { status: string }) => (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.statusText}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Text>
    </View>
  );

  const EmployeeCard = ({ employee }: { employee: Employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeInitial}>
            {employee.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeRole}>{employee.role}</Text>
          {employee.department && (
            <Text style={styles.employeeDepartment}>{employee.department}</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditTeamMember(employee.id)}
          >
            <Edit size={16} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => confirmDeleteTeamMember(employee.id, employee.name)}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <StatusBadge status={employee.status} />
        {employee.salary && (
          <Text style={styles.salary}>{formatCurrency(employee.salary)}/year</Text>
        )}
      </View>

      <View style={styles.contactDetails}>
        {employee.email && (
          <View style={styles.contactItem}>
            <Mail size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>{employee.email}</Text>
          </View>
        )}
        {employee.phone && (
          <View style={styles.contactItem}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>{employee.phone}</Text>
          </View>
        )}
      </View>

      <View style={styles.employeeActions}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => router.push({
            pathname: '/email/ai-compose',
            params: {
              to: employee.email || '',
              clientName: employee.name
            }
          })}
        >
          <Mail size={16} color={colors.primary} />
          <Text style={styles.primaryActionButtonText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={() => handleViewProfile(employee.id)}
        >
          <User size={16} color={colors.primary} />
          <Text style={styles.secondaryActionButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatsForStatus = (status: string) => {
    return employees.filter(emp => emp.status === status).length;
  };

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
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginTop: 2,
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
    employeeCard: {
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
    employeeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    employeeAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#8B5CF6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    employeeInitial: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    employeeInfo: {
      flex: 1,
    },
    employeeName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    employeeRole: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    employeeDepartment: {
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
    employeeDetails: {
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
    salary: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    contactDetails: {
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
    employeeActions: {
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
          <Text style={styles.title}>Team</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddTeamMember}>
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getStatsForStatus('active')}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getStatsForStatus('on_leave')}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getStatsForStatus('terminated')}</Text>
          <Text style={styles.statLabel}>Terminated</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team members..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {(['all', 'active', 'on_leave', 'terminated'] as const).map((status) => (
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
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <User size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No team members found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first team member to get started'
              }
            </Text>
            {!searchQuery && statusFilter === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddTeamMember}>
                <Text style={styles.emptyButtonText}>Add Team Member</Text>
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
              <Text style={styles.modalTitle}>Delete Team Member</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{employeeToDelete?.name}"? This action cannot be undone.
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
                onPress={handleDeleteTeamMember}
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