import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  ArrowLeft,
  Shield,
  User,
  Search,
  UserPlus,
  UserMinus,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Crown
} from 'lucide-react-native';

interface UserProfile {
  id: string;
  full_name?: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

// Admin Guard Component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/signIn');
      } else if (!isAdmin) {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors?.background || '#fff'
      }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ 
          marginTop: 16, 
          fontSize: 16, 
          color: colors?.text || '#000'
        }}>
          Verifying permissions...
        </Text>
      </View>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

export default function UserManagementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleUserRole = async (userId: string, currentRole: 'user' | 'admin') => {
    // Prevent user from removing their own admin role
    if (userId === user?.id && currentRole === 'admin') {
      Alert.alert(
        'Error', 
        'You cannot remove your own admin privileges'
      );
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'promote to admin' : 'remove admin privileges';

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} for this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newRole === 'admin' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', userId);

              if (error) throw error;

              // Update local state
              setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, role: newRole } : u
              ));

              Alert.alert(
                'Success', 
                `User ${newRole === 'admin' ? 'promoted to admin' : 'admin privileges removed'} successfully`
              );
            } catch (error) {
              console.error('Error updating user role:', error);
              Alert.alert('Error', 'Failed to update user role');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      padding: 8,
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 4,
    },
    searchContainer: {
      padding: 24,
      paddingBottom: 16,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    usersList: {
      padding: 24,
      paddingTop: 8,
    },
    userCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    adminAvatar: {
      backgroundColor: '#10B981',
    },
    regularAvatar: {
      backgroundColor: colors.primary,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    userRole: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    adminRole: {
      backgroundColor: '#10B98115',
      color: '#10B981',
    },
    userRoleStyle: {
      backgroundColor: colors.border,
      color: colors.textSecondary,
    },
    userDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 20,
    },
    detailText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginLeft: 6,
    },
    userActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 12,
    },
    promoteButton: {
      backgroundColor: '#10B98115',
    },
    demoteButton: {
      backgroundColor: '#EF444415',
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 6,
    },
    promoteButtonText: {
      color: '#10B981',
    },
    demoteButtonText: {
      color: '#EF4444',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyStateIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 4,
    },
    currentUserNote: {
      fontSize: 10,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 4,
    },
  });

  if (loading) {
    return (
      <AdminGuard>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>User Management</Text>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ 
              marginTop: 16, 
              fontSize: 16, 
              color: colors.text,
              fontFamily: 'Inter-Regular'
            }}>
              Loading users...
            </Text>
          </View>
        </SafeAreaView>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>
              Manage user roles and permissions
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {users.filter(u => u.role === 'admin').length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {users.filter(u => u.role === 'user').length}
            </Text>
            <Text style={styles.statLabel}>Regular Users</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.usersList}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Users size={40} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'No users found' : 'No users yet'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Users will appear here once they sign up'
                  }
                </Text>
              </View>
            ) : (
              filteredUsers.map((userProfile) => (
                <View key={userProfile.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={[
                      styles.userAvatar, 
                      userProfile.role === 'admin' ? styles.adminAvatar : styles.regularAvatar
                    ]}>
                      {userProfile.role === 'admin' ? (
                        <Crown size={24} color="white" />
                      ) : (
                        <User size={24} color="white" />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {userProfile.full_name || 'Unknown User'}
                        {userProfile.id === user?.id && ' (You)'}
                      </Text>
                      <Text style={styles.userEmail}>{userProfile.email}</Text>
                      <Text style={[
                        styles.userRole, 
                        userProfile.role === 'admin' ? styles.adminRole : styles.userRoleStyle
                      ]}>
                        {userProfile.role === 'admin' ? 'Administrator' : 'User'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.userDetails}>
                    <View style={styles.detailItem}>
                      <Calendar size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>
                        Joined {formatDate(userProfile.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.userActions}>
                    {userProfile.id !== user?.id && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          userProfile.role === 'admin' ? styles.demoteButton : styles.promoteButton
                        ]}
                        onPress={() => toggleUserRole(userProfile.id, userProfile.role)}
                        disabled={userProfile.id === user?.id}
                      >
                        {userProfile.role === 'admin' ? (
                          <UserMinus size={16} color="#EF4444" />
                        ) : (
                          <UserPlus size={16} color="#10B981" />
                        )}
                        <Text style={[
                          styles.actionButtonText,
                          userProfile.role === 'admin' ? styles.demoteButtonText : styles.promoteButtonText
                        ]}>
                          {userProfile.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {userProfile.id === user?.id && (
                      <Text style={styles.currentUserNote}>You cannot modify your own role</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AdminGuard>
  );
}