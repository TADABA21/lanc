import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Client, TeamMember } from '@/types/database';
import { ArrowLeft, Calendar, DollarSign, Users, Save, X, ChevronDown, User, Plus, Check } from 'lucide-react-native';
import { DatePicker } from '@/components/DatePicker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ProjectFormProps {
  projectId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ projectId, onSave, onCancel }: ProjectFormProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    client_id: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'todo' as 'todo' | 'in_progress' | 'completed',
    progress: 0,
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // New client form state
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
    fetchTeamMembers();
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

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

  const fetchTeamMembers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchProject = async () => {
    if (!projectId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members(team_member_id)
        `)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setFormData({
        name: data.name,
        description: data.description || '',
        budget: data.budget?.toString() || '',
        client_id: data.client_id || '',
        start_date: data.start_date ? new Date(data.start_date) : new Date(),
        end_date: data.end_date ? new Date(data.end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: data.status,
        progress: data.progress || 0,
      });

      // Set selected team members
      const memberIds = data.project_members?.map((pm: { team_member_id: string }) => pm.team_member_id) || [];
      setSelectedTeamMembers(memberIds);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const handleAddClient = async () => {
    if (!user || !newClientData.name.trim() || !newClientData.company.trim()) {
      Alert.alert('Error', 'Please enter at least the client name and company');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newClientData.name.trim(),
          email: newClientData.email.trim() || null,
          phone: newClientData.phone.trim() || null,
          company: newClientData.company.trim(),
          address: newClientData.address.trim() || null,
          user_id: user.id,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Add to clients list and select it
      setClients(prev => [data, ...prev]);
      setFormData(prev => ({ ...prev, client_id: data.id }));
      
      // Reset form and close modal
      setNewClientData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
      });
      setShowAddClientModal(false);
      
      Alert.alert('Success', 'Client added successfully!');
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    setLoading(true);
    
    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        client_id: formData.client_id || null,
        start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
        status: formData.status,
        progress: formData.progress,
        user_id: user.id,
      };

      let projectId_: string;

      if (projectId) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        projectId_ = projectId;

        // Update team members
        // First, remove existing members
        await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId);

        // Then add new members
        if (selectedTeamMembers.length > 0) {
          const projectMembers = selectedTeamMembers.map(memberId => ({
            project_id: projectId,
            team_member_id: memberId,
            role: 'member',
          }));
          
          await supabase
            .from('project_members')
            .insert(projectMembers);
        }
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert([projectData])
          .select()
          .single();
        
        if (error) throw error;
        projectId_ = data.id;
        
        // Add team members to project
        if (selectedTeamMembers.length > 0) {
          const projectMembers = selectedTeamMembers.map(memberId => ({
            project_id: data.id,
            team_member_id: memberId,
            role: 'member',
          }));
          
          await supabase
            .from('project_members')
            .insert(projectMembers);
        }
      }

      // Create activity log
      await supabase
        .from('activities')
        .insert([{
          type: projectId ? 'project_updated' : 'project_created',
          title: `Project ${projectId ? 'updated' : 'created'}: ${formData.name}`,
          description: formData.description,
          entity_type: 'project',
          entity_id: projectId_,
          user_id: user.id,
        }]);

      Alert.alert('Success', `Project ${projectId ? 'updated' : 'created'} successfully!`);
      
      if (onSave) {
        onSave();
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Error', 'Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const toggleTeamMember = (memberId: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || formData.start_date;
    setShowStartDatePicker(false);
    setFormData(prev => ({ ...prev, start_date: currentDate }));
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || formData.end_date;
    setShowEndDatePicker(false);
    setFormData(prev => ({ ...prev, end_date: currentDate }));
  };

  const showStartDatepicker = () => {
    if (Platform.OS === 'web') {
      const dateString = prompt('Enter start date (YYYY-MM-DD):', formData.start_date.toISOString().split('T')[0]);
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          setFormData(prev => ({ ...prev, start_date: date }));
        }
      }
    } else {
      setShowStartDatePicker(true);
    }
  };

  const showEndDatepicker = () => {
    if (Platform.OS === 'web') {
      const dateString = prompt('Enter end date (YYYY-MM-DD):', formData.end_date.toISOString().split('T')[0]);
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          setFormData(prev => ({ ...prev, end_date: date }));
        }
      }
    } else {
      setShowEndDatePicker(true);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 4,
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
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 16,
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
    addClientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    addClientButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 8,
    },
    teamSelectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    teamSelectorText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    teamSelectorPlaceholder: {
      color: colors.textMuted,
    },
    selectedTeamCount: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: 8,
    },
    selectedTeamCountText: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    datePickerText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
    },
    datePickerPlaceholder: {
      color: colors.textMuted,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 500,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    modalScrollContent: {
      maxHeight: 400,
    },
    teamMemberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    teamMemberSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    teamMemberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    teamMemberInitial: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    teamMemberInfo: {
      flex: 1,
    },
    teamMemberName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    teamMemberRole: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    checkIcon: {
      marginLeft: 8,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    modalButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    modalButtonTextPrimary: {
      color: 'white',
    },
    modalButtonTextSecondary: {
      color: colors.textSecondary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {projectId ? 'Edit Project' : 'New Project'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, styles.headerButtonSecondary]}
            onPress={handleCancel}
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
          <Text style={styles.sectionTitle}>Project Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Project Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter project name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter project description"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget</Text>
            <View style={styles.inputWithIcon}>
              <DollarSign size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={formData.budget}
                onChangeText={(text) => setFormData(prev => ({ ...prev, budget: text }))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Timeline</Text>
          
          <View style={[styles.inputGroup, { zIndex: showClientDropdown ? 2000 : 1 }]}>
            <Text style={styles.label}>Client</Text>
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  !selectedClient && styles.dropdownPlaceholder
                ]}>
                  {selectedClient ? selectedClient.name : 'Select a client'}
                </Text>
                <ChevronDown size={20} color={colors.textMuted} />
              </TouchableOpacity>
              
              {showClientDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.modalScrollContent}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, client_id: '' }));
                        setShowClientDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>No client</Text>
                    </TouchableOpacity>
                    {clients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, client_id: client.id }));
                          setShowClientDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{client.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.addClientButton}
                    onPress={() => {
                      setShowClientDropdown(false);
                      setShowAddClientModal(true);
                    }}
                  >
                    <Plus size={16} color="white" />
                    <Text style={styles.addClientButtonText}>Add New Client</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date</Text>
            <DatePicker
              value={formData.start_date}
              onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
              placeholder="Select start date"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>End Date</Text>
            <DatePicker
              value={formData.end_date}
              onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
              placeholder="Select end date"
            />
          </View>
        </View>

        {teamMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <TouchableOpacity
              style={styles.teamSelectorButton}
              onPress={() => setShowTeamSelector(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Users size={20} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={[
                  styles.teamSelectorText,
                  selectedTeamMembers.length === 0 && styles.teamSelectorPlaceholder
                ]}>
                  {selectedTeamMembers.length === 0 
                    ? 'Select team members' 
                    : `${selectedTeamMembers.length} member${selectedTeamMembers.length !== 1 ? 's' : ''} selected`
                  }
                </Text>
              </View>
              {selectedTeamMembers.length > 0 && (
                <View style={styles.selectedTeamCount}>
                  <Text style={styles.selectedTeamCountText}>
                    {selectedTeamMembers.length}
                  </Text>
                </View>
              )}
              <ChevronDown size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Client Modal */}
      <Modal
        visible={showAddClientModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddClientModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Client Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={newClientData.name}
                  onChangeText={(text) => setNewClientData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter client name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Company <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={newClientData.company}
                  onChangeText={(text) => setNewClientData(prev => ({ ...prev, company: text }))}
                  placeholder="Enter company name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={newClientData.email}
                  onChangeText={(text) => setNewClientData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={newClientData.phone}
                  onChangeText={(text) => setNewClientData(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAddClientModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddClient}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Add Client
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Team Selector Modal */}
      <Modal
        visible={showTeamSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTeamSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Team Members</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowTeamSelector(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              {teamMembers.map((member) => {
                const isSelected = selectedTeamMembers.includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.teamMemberItem,
                      isSelected && styles.teamMemberSelected,
                    ]}
                    onPress={() => toggleTeamMember(member.id)}
                  >
                    <View style={styles.teamMemberAvatar}>
                      <Text style={styles.teamMemberInitial}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teamMemberInfo}>
                      <Text style={styles.teamMemberName}>{member.name}</Text>
                      <Text style={styles.teamMemberRole}>{member.role}</Text>
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.primary} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowTeamSelector(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowTeamSelector(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Done ({selectedTeamMembers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}