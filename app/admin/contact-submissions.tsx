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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, X, Mail, Phone } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  type: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
  user_id: string | null;
}

export default function ContactSubmissionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: 'new' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === id ? { ...sub, status } : sub
        )
      );

      Alert.alert('Success', 'Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#EF4444';
      case 'in_progress': return '#F59E0B';
      case 'resolved': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'support': return '🛠️';
      case 'bug': return '🐛';
      case 'feature': return '💡';
      default: return '💬';
    }
  };

  const SubmissionCard = ({ submission }: { submission: ContactSubmission }) => (
    <View style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionInfo}>
          <Text style={styles.submissionTitle}>{submission.subject}</Text>
          <Text style={styles.submissionMeta}>
            {getTypeIcon(submission.type)} {submission.type.charAt(0).toUpperCase() + submission.type.slice(1)} • 
            {formatDistanceToNow(new Date(submission.created_at))}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
          <Text style={styles.statusText}>
            {submission.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Mail size={14} color={colors.textSecondary} />
          <Text style={styles.contactText}>{submission.name} ({submission.email})</Text>
        </View>
        {submission.phone && (
          <View style={styles.contactItem}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>{submission.phone}</Text>
          </View>
        )}
      </View>

      <Text style={styles.submissionMessage} numberOfLines={3}>
        {submission.message}
      </Text>

      <View style={styles.submissionActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
          onPress={() => updateStatus(submission.id, 'in_progress')}
        >
          <Clock size={16} color="white" />
          <Text style={styles.actionButtonText}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => updateStatus(submission.id, 'resolved')}
        >
          <CheckCircle size={16} color="white" />
          <Text style={styles.actionButtonText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    },
    submissionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    submissionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    submissionInfo: {
      flex: 1,
    },
    submissionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    submissionMeta: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
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
    contactInfo: {
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
    submissionMessage: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    submissionActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: 'white',
      marginLeft: 4,
    },
    emptyState: {
      alignItems: 'center',
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
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Submissions</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {submissions.length > 0 ? (
          submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MessageSquare size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Contact Submissions</Text>
            <Text style={styles.emptyDescription}>
              Contact submissions will appear here when users reach out
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}