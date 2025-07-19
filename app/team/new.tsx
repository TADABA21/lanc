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
import { ArrowLeft, Save, X, User, Mail, Phone, Briefcase, DollarSign, Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NewTeamMemberScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary: '',
    hire_date: new Date(),
    emergency_contact: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const roles = [
    'Software Developer',
    'Project Manager',
    'Designer',
    'Marketing Specialist',
    'Sales Representative',
    'HR Manager',
    'Accountant',
    'Customer Support',
    'Operations Manager',
    'Consultant',
  ];

  const handleSave = async () => {
    if (!user || !formData.name.trim() || !formData.role.trim()) {
      Alert.alert('Error', 'Please enter at least the name and role');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('team_members')
        .insert([{
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role: formData.role.trim(),
          department: formData.department.trim() || null,
          salary: formData.salary ? parseFloat(formData.salary) : 0,
          hire_date: formData.hire_date ? formData.hire_date.toISOString().split('T')[0] : null,
          emergency_contact: formData.emergency_contact.trim() || null,
          status: 'active',
          user_id: user.id,
        }]);
      
      if (error) throw error;

      await supabase
        .from('activities')
        .insert([{
          type: 'team_member_added',
          title: `New team member added: ${formData.name}`,
          description: `Role: ${formData.role}`,
          entity_type: 'team_member',
          user_id: user.id,
        }]);

      Alert.alert('Success', 'Team member added successfully!');
      router.back();
    } catch (error) {
      console.error('Error adding team member:', error);
      Alert.alert('Error', 'Failed to add team member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || formData.hire_date;
    setShowDatePicker(false);
    setFormData(prev => ({ ...prev, hire_date: currentDate }));
  };

  const showDatepicker = () => {
    if (Platform.OS === 'web') {
      const dateString = prompt('Enter hire date (YYYY-MM-DD):', formData.hire_date.toISOString().split('T')[0]);
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          setFormData(prev => ({ ...prev, hire_date: date }));
        }
      }
    } else {
      setShowDatePicker(true);
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
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 20,
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
    dropdown: {
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
      zIndex: 1001,
      elevation: 5,
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
    datePickerButton: {
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
    datePickerText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    datePickerPlaceholder: {
      color: colors.textMuted,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Team Member</Text>
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
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={16} color="white" />
            <Text style={styles.headerButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <User size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          
          <View style={[styles.inputGroup, { zIndex: showRoleDropdown ? 1000 : 1 }]}>
            <Text style={styles.label}>
              Role <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.role && styles.dropdownPlaceholder
                ]}>
                  {formData.role || 'Select a role'}
                </Text>
                <ChevronDown size={20} color={colors.textMuted} />
              </TouchableOpacity>
              
              {showRoleDropdown && (
                <ScrollView 
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                >
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, role }));
                        setShowRoleDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.inputWithIcon}>
              <Briefcase size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.department}
                onChangeText={(text) => setFormData(prev => ({ ...prev, department: text }))}
                placeholder="Enter department"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Annual Salary</Text>
            <View style={styles.inputWithIcon}>
              <DollarSign size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.salary}
                onChangeText={(text) => setFormData(prev => ({ ...prev, salary: text }))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hire Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={showDatepicker}
            >
              <Text style={styles.datePickerText}>
                {formData.hire_date.toLocaleDateString()}
              </Text>
              <Calendar size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={formData.hire_date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.emergency_contact}
                onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_contact: text }))}
                placeholder="Emergency contact information"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}