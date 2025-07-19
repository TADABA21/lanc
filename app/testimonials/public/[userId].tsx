import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Star, Send, Award, User, Briefcase } from 'lucide-react-native';

export default function PublicTestimonialScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    content: '',
    rating: 5,
    client_name: '',
    client_position: '',
    client_company: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingPress = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async () => {
    if (!formData.content.trim() || !formData.client_name.trim()) {
      Alert.alert('Error', 'Please fill in your name and testimonial content');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('testimonials')
        .insert([{
          content: formData.content.trim(),
          rating: formData.rating,
          client_name: formData.client_name.trim(),
          client_position: formData.client_position.trim() || null,
          is_featured: false,
          is_public: true,
          user_id: userId,
        }]);
      
      if (error) throw error;

      setSubmitted(true);
      Alert.alert('Thank You!', 'Your testimonial has been submitted successfully.');
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      Alert.alert('Error', 'Failed to submit testimonial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = () => (
    <View style={styles.starContainer}>
      <Text style={styles.ratingLabel}>Rating</Text>
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
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
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
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    inputIcon: {
      marginRight: 12,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    starContainer: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
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
    successContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#10B981',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    successMessage: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
  });

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Award size={40} color="white" />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successMessage}>
            Your testimonial has been submitted successfully. We appreciate your feedback and will review it shortly.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Award size={40} color="white" />
        </View>
        <Text style={styles.headerTitle}>Share Your Experience</Text>
        <Text style={styles.headerSubtitle}>
          We'd love to hear about your experience working with us. Your feedback helps us improve our services.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Your Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <User size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.client_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, client_name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Position/Title</Text>
            <View style={styles.inputWithIcon}>
              <Briefcase size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.client_position}
                onChangeText={(text) => setFormData(prev => ({ ...prev, client_position: text }))}
                placeholder="Your position or title"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <StarRating />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Testimonial</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tell us about your experience <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.content}
              onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
              placeholder="Share your experience working with us..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
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
            {loading ? 'Submitting...' : 'Submit Testimonial'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}