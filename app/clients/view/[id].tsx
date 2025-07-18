import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import { supabase } from '@/lib/supabase';
import { Client, Project, Activity } from '@/types/database';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Star,
  TrendingUp,
  DollarSign,
  FolderOpen,
  MessageSquare,
  ExternalLink
} from 'lucide-react-native';
import { formatCurrency, formatDistanceToNow } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ClientWithStats = Client & {
  projects?: Project[];
  totalSpent?: number;
  activeProjects?: number;
  completedProjects?: number;
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { shouldShowSidebar } = useSidebar();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = Platform.OS !== 'web' || window.innerWidth < 768;

  // Move styles definition here, right after hooks
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 24,
    },
    backButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    backButtonText: {
      color: 'white',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBackButton: {
      marginRight: 16,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    clientName: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    clientAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    clientInitial: {
      fontSize: 32,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    clientTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    clientCompany: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
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
    contactList: {
      gap: 12,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    contactInfo: {
      flex: 1,
    },
    contactLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      marginBottom: 2,
    },
    contactValue: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
    },
    activityContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityList: {
      gap: 16,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      marginBottom: 2,
    },
    activityDescription: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      marginBottom: 4,
      lineHeight: 18,
    },
    activityTime: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
    },
    emptyActivity: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 20,
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
    secondaryActionButtonText: {
      color: colors.primary,
    },
  });

  useEffect(() => {
    if (id) {
      fetchClientDetails();
      fetchActivities();
    }
  }, [id]);

  const fetchClientDetails = async () => {
    if (!user || !id) return;

    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      // Fetch client's projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id);

      if (projectsError) throw projectsError;

      // Fetch invoices for total spent calculation
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('total')
        .eq('client_id', id)
        .eq('user_id', user.id)
        .eq('status', 'paid');

      if (invoicesError) throw invoicesError;

      const totalSpent = invoicesData?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;
      const activeProjects = projectsData?.filter(p => p.status === 'in_progress').length || 0;
      const completedProjects = projectsData?.filter(p => p.status === 'completed').length || 0;

      setClient({
        ...clientData,
        projects: projectsData || [],
        totalSpent,
        activeProjects,
        completedProjects,
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .or(`entity_id.eq.${id},description.ilike.%${client?.name}%`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!client?.email) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }

    try {
      const emailUrl = `mailto:${client.email}?subject=Hello from ${user?.email}`;
      const canOpen = await Linking.canOpenURL(emailUrl);
      
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        // Fallback to navigation to email composer
        router.push(`/email?to=${client.email}&clientName=${client.name}`);
      }
    } catch (error) {
      console.error('Error opening email:', error);
      router.push(`/email?to=${client.email}&clientName=${client.name}`);
    }
  };

  const handleCallClient = async () => {
    if (!client?.phone) {
      Alert.alert('No Phone', 'This client does not have a phone number on file.');
      return;
    }

    try {
      const phoneUrl = `tel:${client.phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Cannot Call', 'Unable to make phone calls on this device.');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleRequestTestimonial = () => {
    router.push(`/testimonials/request?clientId=${id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading client...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Client not found</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ContactItem = ({ icon: Icon, label, value, onPress }: {
    icon: any;
    label: string;
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.contactItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: colors.text }]}>{value}</Text>
      </View>
      {onPress && <ExternalLink size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  const StatCard = ({ icon: Icon, label, value, color }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const ActivityItem = ({ activity }: { activity: Activity }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: colors.text }]}>
          {activity.title}
        </Text>
        {activity.description && (
          <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
            {activity.description}
          </Text>
        )}
        <Text style={[styles.activityTime, { color: colors.textMuted }]}>
          {formatDistanceToNow(new Date(activity.created_at))}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.clientName} numberOfLines={1}>
          {client.name}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Client Info */}
        <View style={styles.clientAvatar}>
          <Text style={styles.clientInitial}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.clientTitle}>{client.name}</Text>
        {client.company && (
          <Text style={styles.clientCompany}>{client.company}</Text>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactList}>
            {client.email && (
              <ContactItem
                icon={Mail}
                label="Email"
                value={client.email}
                onPress={handleSendEmail}
              />
            )}
            {client.phone && (
              <ContactItem
                icon={Phone}
                label="Phone"
                value={client.phone}
                onPress={handleCallClient}
              />
            )}
            {client.company && (
              <ContactItem
                icon={Building}
                label="Company"
                value={client.company}
              />
            )}
            {client.address && (
              <ContactItem
                icon={MapPin}
                label="Address"
                value={client.address}
              />
            )}
          </View>
        </View>

        {/* Project Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Statistics</Text>
          <View style={styles.statsContainer}>
            <StatCard
              icon={FolderOpen}
              label="Active Projects"
              value={client.activeProjects || 0}
              color="#3B82F6"
            />
            <StatCard
              icon={TrendingUp}
              label="Completed"
              value={client.completedProjects || 0}
              color="#10B981"
            />
            <StatCard
              icon={DollarSign}
              label="Total Spent"
              value={formatCurrency(client.totalSpent || 0)}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              <View style={styles.activityList}>
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={handleSendEmail}
        >
          <Mail size={16} color="white" />
          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
            Send Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={handleRequestTestimonial}
        >
          <MessageSquare size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
            Request Testimonial
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}