import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types/database';
import { ArrowLeft, Send, Paperclip, Save, Users, ChevronDown } from 'lucide-react-native';

export default function EmailComposerScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.body) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // In a real app, you would integrate with an email service
      // For now, we'll just save it as an activity
      await supabase
        .from('activities')
        .insert([{
          type: 'email_sent',
          title: `Email sent: ${formData.subject}`,
          description: `To: ${formData.to}`,
          user_id: user?.id,
        }]);

      Alert.alert('Success', 'Email sent successfully!');
      router.back();
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Error', 'Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    // Save as draft logic would go here
    Alert.alert('Success', 'Draft saved successfully!');
  };

  const selectedClient = clients.find(c => c.email === formData.to);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 12,
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    headerButtonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 4,
    },
    headerButtonTextSecondary: {
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    dropdown: {
      position: 'relative',
    },
    dropdownButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dropdownText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    dropdownPlaceholder: {
      color: colors.textMuted,
    },
    dropdownList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: 4,
      maxHeight: 200,
      zIndex: 1000,
    },
    dropdownItem: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    dropdownItemText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    dropdownItemSubtext: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      marginTop: 2,
    },
    textArea: {
      minHeight: 200,
      textAlignVertical: 'top',
    },
    attachmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: 16,
    },
    attachmentText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Email</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonSecondary]}
            onPress={handleSaveDraft}
          >
            <Save size={16} color={colors.textSecondary} />
            <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
              Save Draft
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSend}
            disabled={loading}
          >
            <Send size={16} color="white" />
            <Text style={styles.headerButtonText}>
              {loading ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>To *</Text>
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowClientDropdown(!showClientDropdown)}
            >
              <Text style={[
                styles.dropdownText,
                !formData.to && styles.dropdownPlaceholder
              ]}>
                {formData.to || 'Select a client'}
              </Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
            
            {showClientDropdown && (
              <ScrollView style={styles.dropdownList}>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, to: client.email || '' }));
                      setShowClientDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{client.name}</Text>
                    {client.email && (
                      <Text style={styles.dropdownItemSubtext}>{client.email}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            value={formData.subject}
            onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
            placeholder="Enter email subject"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.body}
            onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))}
            placeholder="Enter your message"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={10}
          />
        </View>

        <TouchableOpacity style={styles.attachmentButton}>
          <Paperclip size={16} color={colors.textSecondary} />
          <Text style={styles.attachmentText}>Add Attachment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}