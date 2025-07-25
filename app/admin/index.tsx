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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  Shield, 
  MessageSquare, 
  Heart, 
  Users, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle,
  LogOut,
  User,
  UserPlus,
  Settings
} from 'lucide-react-native';
import { StatsCard } from '@/components/StatsCard';

// Admin Guard Component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/signIn');
      } else if (!isAdmin) {
        // Redirect non-admin users back to main app
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

  if (!user) {
    return null; // Will redirect to sign in
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor: colors?.background || '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
      }}>
        <View style={{
          backgroundColor: colors?.surface || '#f5f5f5',
          borderRadius: 16,
          padding: 32,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors?.border || '#e5e5e5'
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24
          }}>
            <AlertCircle size={40} color="white" />
          </View>
          <Text style={{
            fontSize: 24,
            fontFamily: 'Inter-Bold',
            color: colors?.text || '#000',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            Access Denied
          </Text>
          <Text style={{
            fontSize: 16,
            fontFamily: 'Inter-Regular',
            color: colors?.textSecondary || '#666',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 24
          }}>
            You don't have permission to access the admin dashboard. Please contact an administrator if you believe this is an error.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 24,
              marginBottom: 12
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontSize: 16,
              fontFamily: 'Inter-SemiBold'
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16
            }}
            onPress={async () => {
              try {
                await signOut();
                router.replace('/(auth)/signIn');
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
          >
            <Text style={{
              color: colors?.textSecondary || '#666',
              fontSize: 14,
              fontFamily: 'Inter-Regular'
            }}>
              Sign out
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { user, userProfile, signOut, isAdmin } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalContacts: 0,
    newContacts: 0,
    totalFeedback: 0,
    newFeedback: 0,
    averageRating: 0,
    resolvedIssues: 0,
    totalUsers: 0,
    totalAdmins: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch contact submissions stats
      const { data: contacts, error: contactError } = await supabase
        .from('contact_submissions')
        .select('status, created_at');

      if (contactError) throw contactError;

      // Fetch feedback submissions stats
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_submissions')
        .select('rating, status, created_at');

      if (feedbackError) throw feedbackError;

      // Fetch user stats
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('role');

      if (usersError) throw usersError;

      // Calculate stats
      const totalContacts = contacts?.length || 0;
      const newContacts = contacts?.filter(c => c.status === 'new').length || 0;
      const totalFeedback = feedback?.length || 0;
      const newFeedback = feedback?.filter(f => f.status === 'new').length || 0;
      const resolvedIssues = contacts?.filter(c => c.status === 'resolved').length || 0;
      const totalUsers = users?.length || 0;
      const totalAdmins = users?.filter(u => u.role === 'admin').length || 0;
      
      const averageRating = feedback?.length > 0 
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length
        : 0;

      setStats({
        totalContacts,
        newContacts,
        totalFeedback,
        newFeedback,
        averageRating,
        resolvedIssues,
        totalUsers,
        totalAdmins,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdminStats();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/signIn');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 24,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    userName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    userEmail: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    signOutText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginLeft: 8,
    },
    headerIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    },
    statsSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    statCard: {
      flex: 1,
      minWidth: Platform.OS === 'web' ? 280 : '100%',
    },
    quickActions: {
      marginBottom: 32,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    actionCard: {
      flex: 1,
      minWidth: Platform.OS === 'web' ? 250 : '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    actionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    actionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    actionDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
    },
  });

  return (
    <AdminGuard>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <User size={20} color="white" />
              </View>
              <View>
                <Text style={styles.userName}>
                  {userProfile?.full_name || 'Admin User'}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <Text style={[styles.userEmail, { color: colors.primary, fontSize: 12 }]}>
                  Administrator
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut size={16} color={colors.text} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerIcon}>
            <Shield size={40} color="white" />
          </View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Manage contact submissions and user feedback
          </Text>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <StatsCard
                  title="Total Contacts"
                  value={stats.totalContacts}
                  icon={MessageSquare}
                  color="#3B82F6"
                  change={`${stats.newContacts} new`}
                  changeType={stats.newContacts > 0 ? "positive" : "neutral"}
                />
              </View>
              <View style={styles.statCard}>
                <StatsCard
                  title="Total Feedback"
                  value={stats.totalFeedback}
                  icon={Heart}
                  color="#10B981"
                  change={`${stats.newFeedback} new`}
                  changeType={stats.newFeedback > 0 ? "positive" : "neutral"}
                />
              </View>
              <View style={styles.statCard}>
                <StatsCard
                  title="Average Rating"
                  value={stats.averageRating.toFixed(1)}
                  icon={TrendingUp}
                  color="#F59E0B"
                  change="User satisfaction"
                  changeType="neutral"
                />
              </View>
              <View style={styles.statCard}>
                <StatsCard
                  title="Resolved Issues"
                  value={stats.resolvedIssues}
                  icon={CheckCircle}
                  color="#8B5CF6"
                  change="Total resolved"
                  changeType="positive"
                />
              </View>
              <View style={styles.statCard}>
                <StatsCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={Users}
                  color="#6366F1"
                  change={`${stats.totalAdmins} admins`}
                  changeType="neutral"
                />
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/admin/contact-submissions')}
              >
                <View style={styles.actionHeader}>
                  <View style={[styles.actionIcon, { backgroundColor: '#3B82F615' }]}>
                    <MessageSquare size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.actionTitle}>Contact Submissions</Text>
                </View>
                <Text style={styles.actionDescription}>
                  View and manage contact form submissions from users
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/admin/contact-submissions')}
                >
                  <Text style={styles.actionButtonText}>View Contacts</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/admin/feedback-submissions')}
              >
                <View style={styles.actionHeader}>
                  <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
                    <Heart size={24} color="#10B981" />
                  </View>
                  <Text style={styles.actionTitle}>Feedback Submissions</Text>
                </View>
                <Text style={styles.actionDescription}>
                  Review user feedback, ratings, and feature requests
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/admin/feedback-submissions')}
                >
                  <Text style={styles.actionButtonText}>View Feedback</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/admin/user-management')}
              >
                <View style={styles.actionHeader}>
                  <View style={[styles.actionIcon, { backgroundColor: '#6366F115' }]}>
                    <Users size={24} color="#6366F1" />
                  </View>
                  <Text style={styles.actionTitle}>User Management</Text>
                </View>
                <Text style={styles.actionDescription}>
                  Manage users, assign admin roles, and control access
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/admin/user-management')}
                >
                  <Text style={styles.actionButtonText}>Manage Users</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AdminGuard>
  );
}