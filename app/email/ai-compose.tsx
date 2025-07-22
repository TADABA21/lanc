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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { generateWithGroq, emailPrompts } from '@/lib/groq';
import { sendEmail, validateEmail, debugEmail } from '@/lib/email'; // Added debugEmail import
import { Client } from '@/types/database';
import {
  ArrowLeft,
  Send,
  Save,
  X,
  Mail,
  ChevronDown,
  Sparkles,
  Paperclip,
} from 'lucide-react-native';

export default function AIEmailComposerScreen() {
  const { to, clientName, employeeName } = useLocalSearchParams<{
    to?: string;
    clientName?: string;
    employeeName?: string;
  }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    to: to || '',
    subject: '',
    body: '',
    purpose: '',
    context: '',
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showPurposeDropdown, setShowPurposeDropdown] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState<string>(''); // Added email validation state

  const emailPurposes = [
    'Project Update',
    'Invoice Follow-up',
    'Meeting Request',
    'Proposal Submission',
    'Contract Discussion',
    'Thank You Note',
    'Status Report',
    'Feedback Request',
    'Service Inquiry',
    'General Communication',
  ];

  useEffect(() => {
    fetchClients();
  }, []);

  // Added email validation on change
  useEffect(() => {
    if (formData.to) {
      const isValid = validateEmail(formData.to);
      if (!isValid && formData.to.length > 0) {
        setEmailValidationError('Please enter a valid email address');
      } else {
        setEmailValidationError('');
      }
    } else {
      setEmailValidationError('');
    }
  }, [formData.to]);

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

  const handleAIGenerate = async () => {
    if (!formData.purpose) {
      Alert.alert('Error', 'Please select an email purpose first');
      return;
    }

    setAiGenerating(true);

    try {
      const recipientName = clientName || employeeName || formData.to.split('@')[0];
      const context = formData.context || `Professional communication regarding ${formData.purpose.toLowerCase()}`;

      const messages = emailPrompts.generateEmail(
        formData.purpose,
        recipientName,
        context
      );

      const aiResponse = await generateWithGroq(messages);

      // Parse AI response
      const lines = aiResponse.split('\n');
      let subject = '';
      let body = '';
      let currentSection = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().includes('subject:')) {
          subject = trimmedLine.replace(/subject:/i, '').trim();
          continue;
        } else if (trimmedLine.toLowerCase().includes('body:') || trimmedLine.toLowerCase().includes('email:')) {
          currentSection = 'body';
          continue;
        }

        if (currentSection === 'body' && trimmedLine) {
          body += trimmedLine + '\n';
        } else if (!subject && !currentSection && trimmedLine) {
          subject = trimmedLine;
          currentSection = 'body';
        }
      }

      setFormData(prev => ({
        ...prev,
        subject: subject || `${formData.purpose} - ${recipientName}`,
        body: body.trim() || aiResponse,
      }));

      Alert.alert('Success', 'AI has generated a professional email!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      Alert.alert('Error', 'Failed to generate email with AI. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Enhanced validation before sending
  const validateBeforeSending = () => {
    const errors: string[] = [];

    if (!formData.to.trim()) {
      errors.push('Recipient email is required');
    } else if (!validateEmail(formData.to.trim())) {
      errors.push('Invalid email format');
    }

    if (!formData.subject.trim()) {
      errors.push('Email subject is required');
    }

    if (!formData.body.trim()) {
      errors.push('Email body is required');
    }

    // Check if subject is too long (most email servers have limits)
    if (formData.subject.length > 200) {
      errors.push('Subject line is too long (max 200 characters)');
    }

    return errors;
  };

  const handleSend = async () => {
    // Enhanced validation
    const validationErrors = validateBeforeSending();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    // Debug email before sending (helpful for troubleshooting)
    const emailDebugInfo = debugEmail(formData.to.trim());
    console.log('📧 Email Debug Info:', emailDebugInfo);

    if (!emailDebugInfo.valid) {
      Alert.alert(
        'Email Validation Failed',
        `Issues found:\n${emailDebugInfo.issues.join('\n')}\n\nOriginal: "${emailDebugInfo.original}"\nCleaned: "${emailDebugInfo.cleaned}"`
      );
      return;
    }

    setLoading(true);

    try {
      // Prepare sender information for EmailJS
      const senderEmail = user?.email || 'noreply@businessmanager.com';
      const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Business Manager';

      // Clean and prepare email data
      const emailData = {
        to: formData.to.trim(), // Use trimmed email
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        from: senderEmail, // Don't format as "Name <email>" - let EmailJS handle it
      };

      console.log('📤 Sending email with data:', {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from,
        bodyLength: emailData.body.length
      });

      // Send the email via EmailJS
      const emailResult = await sendEmail(emailData);

      if (!emailResult.success) {
        const errorMessage = emailResult.error || 'Failed to send email';
        console.error('📧 Email send error:', {
          error: errorMessage,
          details: emailResult.details
        });
        throw new Error(errorMessage);
      }

      console.log('✅ Email sent successfully:', emailResult);

      // Log the email activity
      try {
        // Generate a UUID for the email activity if messageId is not a valid UUID
        const activityId = crypto.randomUUID();

        await supabase
          .from('activities')
          .insert([{
            type: 'email_sent',
            title: `Email sent: ${formData.subject}`,
            description: `To: ${formData.to}${emailResult.messageId ? `\nMessage ID: ${emailResult.messageId}` : ''}`,
            entity_type: 'email',
            entity_id: activityId, // Use generated UUID instead of messageId
            user_id: user?.id,
          }]);
      } catch (logError) {
        console.warn('Failed to log email activity:', logError);
        // Don't fail the whole operation if logging fails
      }

      // Show success message
      const successMessage = `Your email has been sent successfully to ${formData.to}`;
      const detailMessage = emailResult.messageId
        ? `\n\nMessage ID: ${emailResult.messageId}\n\nThe recipient should receive your email shortly.`
        : '\n\nThe recipient should receive your email shortly.';

      Alert.alert('Email Sent! ✅', successMessage + detailMessage, [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error('❌ Error in handleSend:', error);

      let errorMessage = 'Failed to send email. Please try again.';
      let troubleshootingTips = '';

      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();

        if (errorText.includes('recipients address is corrupted')) {
          errorMessage = 'Invalid email address format detected.';
          troubleshootingTips = '\n\nTroubleshooting:\n• Check for extra spaces or special characters\n• Ensure format is: user@domain.com\n• Try typing the email manually';
        } else if (errorText.includes('invalid') || errorText.includes('configuration')) {
          errorMessage = 'Email service configuration error.';
          troubleshootingTips = '\n\nPlease contact support if this continues.';
        } else if (errorText.includes('rate limit')) {
          errorMessage = 'Too many emails sent recently.';
          troubleshootingTips = '\n\nPlease wait a few minutes before trying again.';
        } else if (errorText.includes('network')) {
          errorMessage = 'Network connection error.';
          troubleshootingTips = '\n\nPlease check your internet connection and try again.';
        } else {
          errorMessage = error.message;
          troubleshootingTips = '\n\nIf this persists, please check your email address format.';
        }
      }

      Alert.alert('Send Failed ❌', errorMessage + troubleshootingTips);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await supabase
        .from('activities')
        .insert([{
          type: 'email_draft_saved',
          title: `Email draft saved: ${formData.subject || 'Untitled'}`,
          description: `To: ${formData.to}`,
          entity_type: 'email_draft',
          user_id: user?.id,
        }]);

      Alert.alert('Success', 'Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft.');
    }
  };

  // Enhanced email input handler with validation
  const handleEmailChange = (text: string) => {
    setFormData(prev => ({ ...prev, to: text }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
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
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
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
      marginLeft: 6,
    },
    headerButtonTextSecondary: {
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
    },
    aiSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    aiIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    aiTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    aiDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    aiButtonDisabled: {
      opacity: 0.6,
    },
    aiButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 8,
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
    inputGroup: {
      marginBottom: 16,
      zIndex: 1,
    },
    dropdownInputGroup: {
      marginBottom: 16,
      zIndex: 1000,
    },
    purposeDropdownGroup: {
      marginBottom: 16,
      zIndex: 2000,
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
    inputError: { // Added error state for input
      borderColor: colors.error,
    },
    errorText: { // Added error text style
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.error,
      marginTop: 4,
    },
    dropdownContainer: {
      position: 'relative',
      zIndex: 1000,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
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
      borderRadius: 12,
      marginTop: 4,
      maxHeight: 200,
      zIndex: 2000,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    dropdownItemText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    largeTextArea: {
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
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryActionButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    primaryActionButtonDisabled: { // Added disabled state
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    secondaryActionButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 8,
    },
    primaryActionButtonText: {
      color: 'white',
    },
    primaryActionButtonTextDisabled: { // Added disabled text state
      color: colors.textMuted,
    },
    secondaryActionButtonText: {
      color: colors.primary,
    },
  });

  // Check if form is valid for sending
  const isFormValid = formData.to.trim() && formData.subject.trim() && formData.body.trim() && !emailValidationError;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Email Composer</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonSecondary]}
            onPress={() => router.back()}
          >
            <X size={16} color={colors.textSecondary} />
            <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* AI Generation Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Sparkles size={20} color="white" />
            </View>
            <Text style={styles.aiTitle}>AI-Powered Email Composition</Text>
          </View>
          <Text style={styles.aiDescription}>
            Generate professional, engaging emails with AI. Specify the purpose and context to get perfectly crafted content.
          </Text>
          <TouchableOpacity
            style={[styles.aiButton, (aiGenerating || !formData.purpose) && styles.aiButtonDisabled]}
            onPress={handleAIGenerate}
            disabled={aiGenerating || !formData.purpose}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Sparkles size={16} color="white" />
            )}
            <Text style={styles.aiButtonText}>
              {aiGenerating ? 'Generating...' : 'Generate Email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Setup</Text>

          <View style={[styles.purposeDropdownGroup, styles.dropdownContainer]}>
            <Text style={styles.label}>
              Email Purpose <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowPurposeDropdown(!showPurposeDropdown);
                setShowClientDropdown(false);
              }}
            >
              <Text style={[
                styles.dropdownText,
                !formData.purpose && styles.dropdownPlaceholder
              ]}>
                {formData.purpose || 'Select email purpose'}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {showPurposeDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {emailPurposes.map((purpose) => (
                    <TouchableOpacity
                      key={purpose}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, purpose }));
                        setShowPurposeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{purpose}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Context/Additional Information</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.context}
              onChangeText={(text) => setFormData(prev => ({ ...prev, context: text }))}
              placeholder="Provide context to help AI generate better content"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Email Composition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Composition</Text>

          <View style={[styles.dropdownInputGroup, styles.dropdownContainer]}>
            <Text style={styles.label}>
              To <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowClientDropdown(!showClientDropdown);
                setShowPurposeDropdown(false);
              }}
            >
              <Text style={[
                styles.dropdownText,
                !formData.to && styles.dropdownPlaceholder
              ]}>
                {formData.to || 'Select recipient or enter email'}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {showClientDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {clients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, to: client.email || '' }));
                        setShowClientDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {client.name} {client.email && `(${client.email})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={[
                styles.input,
                { marginTop: 8 },
                emailValidationError ? styles.inputError : null
              ]}
              value={formData.to}
              onChangeText={handleEmailChange}
              placeholder="Or enter email address manually"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false} // Added to prevent auto-correction interfering with email
            />
            {emailValidationError ? (
              <Text style={styles.errorText}>{emailValidationError}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Subject <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
              placeholder="Enter email subject"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Message <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.largeTextArea]}
              value={formData.body}
              onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))}
              placeholder="Enter your message"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={8}
            />
          </View>

          <TouchableOpacity style={styles.attachmentButton}>
            <Paperclip size={16} color={colors.textSecondary} />
            <Text style={styles.attachmentText}>Add Attachment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handleSaveDraft}
        >
          <Save size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Save Draft
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isFormValid ? styles.primaryActionButton : styles.primaryActionButtonDisabled
          ]}
          onPress={handleSend}
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Send size={16} color={isFormValid ? "white" : colors.textMuted} />
          )}
          <Text style={[
            styles.actionButtonText,
            isFormValid ? styles.primaryActionButtonText : styles.primaryActionButtonTextDisabled
          ]}>
            {loading ? 'Sending...' : 'Send Email'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}