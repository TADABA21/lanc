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
  CheckCircle
} from 'lucide-react-native';
import { StatsCard } from '@/components/StatsCard';

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    totalContacts: 0,
    newContacts: 0,
    totalFeedback: 0,
    newFeedback: 0,
    averageRating: 0,
    resolvedIssues: 0,
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

      // Calculate stats
      const totalContacts = contacts?.length || 0;
      const newContacts = contacts?.filter(c => c.status === 'new').length || 0;
      const totalFeedback = feedback?.length || 0;
      const newFeedback = feedback?.filter(f => f.status === 'new').length || 0;
      const resolvedIssues = contacts?.filter(c => c.status === 'resolved').length || 0;
      
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
              <TouchableOpacity style={styles.actionButton}>
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
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Feedback</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}