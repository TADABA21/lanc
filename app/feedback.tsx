import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Star, MessageSquare, Lightbulb, Bug, Heart } from 'lucide-react-native';

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    rating: 5,
    category: 'general' as 'general' | 'feature' | 'bug' | 'improvement',
    title: '',
    description: '',
    email: user?.email || '',
  });
  
  const [loading, setLoading] = useState(false);

  const feedbackCategories = [
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: '#3B82F6' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: '#F59E0B' },
    { value: 'bug', label: 'Bug Report', icon: Bug, color: '#EF4444' },
    { value: 'improvement', label: 'Improvement', icon: Heart, color: '#10B981' },
  ];

  const handleRatingPress = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in the title and description');
      return;
    }

    setLoading(true);
    
    try {
      // Create feedback submission record
      const { error } = await supabase
        .from('feedback_submissions')
        .insert([{
          rating: formData.rating,
          category: formData.category,
          title: formData.title.trim(),
          description: formData.description.trim(),
          email: formData.email.trim(),
          user_id: user?.id || null,
          status: 'new',
        }]);
      
      if (error) throw error;

      Alert.alert(
        'Feedback Submitted!', 
        'Thank you for your feedback. It helps us improve LANCELOT for everyone.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = () => (
    <View style={styles.starContainer}>
      <Text style={styles.ratingLabel}>Overall Rating</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRatingPress(star)}
            style={styles.starButton}
          >
            <Star
              size={32}
              color={star <= formData.rating ? '#F59E0B' : colors.border}
              fill={star <= formData.rating ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {formData.rating} out of 5 stars
      </Text>
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
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    heroIcon: {
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
    heroTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
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
    starContainer: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    ratingLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 12,
    },
    starsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    starButton: {
      padding: 4,
    },
    ratingText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    categorySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      minWidth: '45%',
    },
    categoryButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    categoryIcon: {
      marginRight: 8,
    },
    categoryText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: colors.primary,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    required: {
      color: colors.error,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Heart size={40} color="white" />
          </View>
          <Text style={styles.heroTitle}>We Value Your Feedback</Text>
          <Text style={styles.heroSubtitle}>
            Help us improve LANCELOT by sharing your thoughts, suggestions, and experiences.
          </Text>
        </View>

        <StarRating />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback Category</Text>
          <View style={styles.categorySelector}>
            {feedbackCategories.map((category) => {
              const IconComponent = category.icon;
              const isActive = formData.category === category.value;
              return (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryButton,
                    isActive && styles.categoryButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, category: category.value as any }))}
                >
                  <IconComponent 
                    size={20} 
                    color={isActive ? colors.primary : colors.textSecondary}
                    style={styles.categoryIcon}
                  />
                  <Text style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Brief summary of your feedback"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Please provide detailed feedback..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (for follow-up)</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Your email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Send size={20} color="white" />
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}