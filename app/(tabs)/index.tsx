import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/StatsCard';
import { ActivityItem } from '@/components/ActivityItem';
import { ProjectStatusChart } from '@/components/ProjectStatusChart';
import { QuickActions } from '@/components/QuickActions';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { 
  FolderOpen, 
  Users, 
  FileText, 
  User, 
  Plus,
  Mail,
  LogOut,
  Bell,
  Search,
  TrendingUp,
  Clock,
  DollarSign,
  Menu,
} from 'lucide-react-native';
import { Activity, Project, Client, Invoice, Employee } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, userProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const { shouldShowSidebar, openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingInvoices: 0,
    teamMembers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    overdueInvoices: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projectStats, setProjectStats] = useState({
    todo: 0,
    in_progress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  const isMobile = Platform.OS !== 'web' || width < 768;

  // Get user's first name for greeting
  const getFirstName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name.split(' ')[0];
    }
    return 'User';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id);

      // Fetch team members using the view
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate stats
      const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'sent').length || 0;
      const overdueInvoices = invoices?.filter(i => i.status === 'overdue').length || 0;
      const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      
      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = invoices?.filter(i => {
        if (i.status !== 'paid' || !i.created_at) return false;
        const invoiceDate = new Date(i.created_at);
        return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Project status breakdown
      const projectStatusBreakdown = {
        todo: projects?.filter(p => p.status === 'todo').length || 0,
        in_progress: projects?.filter(p => p.status === 'in_progress').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
      };

      setStats({
        totalProjects: projects?.length || 0,
        activeProjects,
        completedProjects,
        pendingInvoices,
        teamMembers: employees?.length || 0,
        totalRevenue,
        monthlyRevenue,
        overdueInvoices,
      });

      setProjectStats(projectStatusBreakdown);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Calculate bottom padding to account for tab bar
  const getBottomPadding = () => {
    if (Platform.OS === 'android') {
      // Calculate based on the new tab bar height
      const androidBottomPadding = Math.max(insets.bottom + 8, 24);
      const tabBarHeight = 70 + androidBottomPadding;
      return tabBarHeight + 20; // Add extra 20 for spacing
    }
    
    // iOS (unchanged)
    return insets.bottom > 0 ? 100 + insets.bottom : 100;
  };

  const bottomPadding = isMobile ? getBottomPadding() : 20;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: bottomPadding,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: shouldShowSidebar ? 20 : 0,
      paddingBottom: 24,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hamburgerButton: {
      marginRight: 12,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    logoText: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    greeting: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    userEmail: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryStatsContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      marginBottom: 8,
    },
    primaryStatsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    primaryStatCard: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    viewAllText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.primary,
    },
    revenueContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    revenueCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    revenueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    revenueLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginLeft: 8,
    },
    revenueAmount: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: '#10B981',
      marginBottom: 4,
    },
    revenueSubtext: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    chartContainer: {
      width: 120,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    emptyActivity: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header - only show on web when sidebar is visible */}
        {shouldShowSidebar && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>LT</Text>
              </View>
              <View>
                <Text style={styles.greeting}>{getGreeting()}, {getFirstName()}!</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Search size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Bell size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
                <LogOut size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Primary Stats Cards */}
        <View style={styles.primaryStatsContainer}>
          <View style={styles.primaryStatsRow}>
            <View style={styles.primaryStatCard}>
              <StatsCard
                title="Total Projects"
                value={stats.totalProjects}
                icon={FolderOpen}
                color="#3B82F6"
                change="+12% from last month"
                changeType="positive"
              />
            </View>
            <View style={styles.primaryStatCard}>
              <StatsCard
                title="Active Projects"
                value={stats.activeProjects}
                icon={Clock}
                color="#10B981"
                change={`${stats.completedProjects} completed`}
                changeType="neutral"
              />
            </View>
          </View>
          <View style={styles.primaryStatsRow}>
            <View style={styles.primaryStatCard}>
              <StatsCard
                title="Pending Invoices"
                value={stats.pendingInvoices}
                icon={FileText}
                color="#F59E0B"
                change={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : "All current"}
                changeType={stats.overdueInvoices > 0 ? "negative" : "positive"}
              />
            </View>
            <View style={styles.primaryStatCard}>
              <StatsCard
                title="Team Members"
                value={stats.teamMembers}
                icon={User}
                color="#8B5CF6"
                change="All active"
                changeType="positive"
              />
            </View>
          </View>
        </View>

        {/* Revenue Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.revenueContainer}>
            <View style={styles.revenueCard}>
              <View style={styles.revenueHeader}>
                <DollarSign size={24} color="#10B981" />
                <Text style={styles.revenueLabel}>Total Revenue</Text>
              </View>
              <Text style={styles.revenueAmount}>
                {formatCurrency(stats.totalRevenue)}
              </Text>
              <Text style={styles.revenueSubtext}>
                {formatCurrency(stats.monthlyRevenue)} this month
              </Text>
            </View>
            <View style={styles.chartContainer}>
              <ProjectStatusChart data={projectStats} />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <QuickActions />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityContainer}>
            {activities.length > 0 ? (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Clock size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No recent activity</Text>
                <Text style={styles.emptySubtext}>
                  Start by creating a project or adding a client
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}