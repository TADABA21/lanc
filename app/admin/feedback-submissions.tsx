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
import { ArrowLeft, Heart, Star, Clock, CheckCircle, Lightbulb, Bug, MessageSquare } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';

interface FeedbackSubmission {
  id: string;
  rating: number;
  category: string;
  title: string;
  description: string;
  email: string;
  status: 'new' | 'reviewed' | 'implemented';
  created_at: string;
  user_id: string | null;
}

export default function FeedbackSubmissionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching feedback submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: 'new' | 'reviewed' | 'implemented') => {
    try {
      const { error } = await supabase
        .from('feedback_submissions')
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
      case 'reviewed': return '#F59E0B';
      case 'implemented': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feature': return Lightbulb;
      case 'bug': return Bug;
      case 'improvement': return Heart;
      default: return MessageSquare;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feature': return '#F59E0B';
      case 'bug': return '#EF4444';
      case 'improvement': return '#10B981';
      default: return '#3B82F6';
    }
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          color={star <= rating ? '#F59E0B' : colors.border}
          fill={star <= rating ? '#F59E0B' : 'transparent'}
        />
      ))}
    </View>
  );

  const FeedbackCard = ({ submission }: { submission: FeedbackSubmission }) => {
    const CategoryIcon = getCategoryIcon(submission.category);
    const categoryColor = getCategoryColor(submission.category);

    return (
      <View style={styles.feedbackCard}>
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackInfo}>
            <View style={styles.titleRow}>
              <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}15` }]}>
                <CategoryIcon size={16} color={categoryColor} />
              </View>
              <Text style={styles.feedbackTitle}>{submission.title}</Text>
            </View>
            <View style={styles.metaRow}>
              <StarRating rating={submission.rating} />
              <Text style={styles.feedbackMeta}>
                {submission.category} • {formatDistanceToNow(new Date(submission.created_at))}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
            <Text style={styles.statusText}>
              {submission.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.feedbackEmail}>From: {submission.email}</Text>

        <Text style={styles.feedbackDescription} numberOfLines={3}>
          {submission.description}
        </Text>

        <View style={styles.feedbackActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => updateStatus(submission.id, 'reviewed')}
          >
            <Clock size={16} color="white" />
            <Text style={styles.actionButtonText}>Reviewed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => updateStatus(submission.id, 'implemented')}
          >
            <CheckCircle size={16} color="white" />
            <Text style={styles.actionButtonText}>Implemented</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
    feedbackCard: {
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
    feedbackHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    feedbackInfo: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    feedbackTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    starContainer: {
      flexDirection: 'row',
      gap: 2,
    },
    feedbackMeta: {
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
    feedbackEmail: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    feedbackDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    feedbackActions: {
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
        <Text style={styles.headerTitle}>Feedback Submissions</Text>
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
            <FeedbackCard key={submission.id} submission={submission} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Heart size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Feedback Submissions</Text>
            <Text style={styles.emptyDescription}>
              User feedback will appear here when submitted
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}