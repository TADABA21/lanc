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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types/database';
import { ArrowLeft, Send, Star, User, Briefcase, MessageSquare } from 'lucide-react-native';

export default function RequestTestimonialScreen() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [client, setClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    message: '',
    customNote: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    if (!user || !clientId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setClient(data);
      
      // Set default message
      setFormData(prev => ({
        ...prev,
        message: `Hi ${data.name},\n\nI hope this message finds you well. We've really enjoyed working with you on our recent project with ${data.company}.\n\nWould you mind taking a few minutes to share your experience working with us? Your feedback would mean a lot and help us continue to improve our services.\n\nYou can leave a testimonial using this link: [TESTIMONIAL_LINK]\n\nThank you for your time and for being such a wonderful client to work with!\n\nBest regards,\n[YOUR_NAME]`,
      }));
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client details');
      router.back();
    }
  };

  const handleSendRequest = async () => {
    if (!client || !formData.message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    
    try {
      // In a real app, you would send an email or SMS to the client
      // For now, we'll just create an activity log
      await supabase
        .from('activities')
        .insert([{
          type: 'testimonial_requested',
          title: `Testimonial requested from ${client.name}`,
          description: `Sent testimonial request to ${client.email || client.name}`,
          entity_type: 'client',
          entity_id: client.id,
          user_id: user?.id,
        }]);

      Alert.alert(
        'Request Sent!', 
        `Testimonial request has been sent to ${client.name}. In a production app, this would send an email with a testimonial collection link.`
      );
      router.back();
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send testimonial request. Please try again.');
    } finally {
      setLoading(false);
    }
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
      padding: 24,
    },
    clientCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clientHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    clientAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    clientInitial: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    clientInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 2,
    },
    clientCompany: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 12,
    },
    sectionDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    textArea: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      minHeight: 200,
      textAlignVertical: 'top',
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 8,
    },
    previewCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewTitle: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    previewText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Testimonial</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>Loading client...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Testimonial</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Client Info */}
        <View style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientInitial}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientCompany}>{client.company}</Text>
            </View>
          </View>
        </View>

        {/* Message Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Message</Text>
          <Text style={styles.sectionDescription}>
            Customize the message that will be sent to your client requesting a testimonial.
          </Text>
          
          <TextInput
            style={styles.textArea}
            value={formData.message}
            onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
            placeholder="Enter your testimonial request message..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={10}
          />
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Email to: {client.email || client.name}</Text>
            <Text style={styles.previewText}>{formData.message}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendRequest}
          disabled={loading}
        >
          <Send size={20} color="white" />
          <Text style={styles.sendButtonText}>
            {loading ? 'Sending...' : 'Send Request'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}