import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Bell, X, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { formatDistanceToNow } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationCenterProps {
  onNotificationPress?: (notification: Notification) => void;
}

export function NotificationCenter({ onNotificationPress }: NotificationCenterProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      generateNotifications();
    }
  }, [user]);

  const generateNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Generate notifications based on user's data
      const notifications: Notification[] = [];

      // Check for overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'overdue');

      if (overdueInvoices && overdueInvoices.length > 0) {
        notifications.push({
          id: 'overdue-invoices',
          type: 'warning',
          title: 'Overdue Invoices',
          message: `You have ${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}`,
          read: false,
          created_at: new Date().toISOString(),
          action_url: '/invoices',
        });
      }

      // Check for projects nearing deadline
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress');

      if (projects) {
        const nearDeadline = projects.filter(project => {
          if (!project.end_date) return false;
          const endDate = new Date(project.end_date);
          const now = new Date();
          const daysUntilDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDeadline <= 7 && daysUntilDeadline > 0;
        });

        if (nearDeadline.length > 0) {
          notifications.push({
            id: 'deadline-warning',
            type: 'warning',
            title: 'Project Deadlines',
            message: `${nearDeadline.length} project${nearDeadline.length !== 1 ? 's' : ''} due within 7 days`,
            read: false,
            created_at: new Date().toISOString(),
            action_url: '/projects',
          });
        }
      }

      // Check for new testimonials
      const { data: recentTestimonials } = await supabase
        .from('testimonials')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (recentTestimonials && recentTestimonials.length > 0) {
        notifications.push({
          id: 'new-testimonials',
          type: 'success',
          title: 'New Testimonials',
          message: `You received ${recentTestimonials.length} new testimonial${recentTestimonials.length !== 1 ? 's' : ''} this week`,
          read: false,
          created_at: new Date().toISOString(),
          action_url: '/testimonials',
        });
      }

      // Welcome notification for new users
      const { data: userActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (!userActivities || userActivities.length === 0) {
        notifications.push({
          id: 'welcome',
          type: 'info',
          title: 'Welcome to LANCELOT!',
          message: 'Get started by creating your first project or adding a client',
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
    setShowModal(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertCircle;
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      default: return colors.primary;
    }
  };

  const styles = StyleSheet.create({
    bellButton: {
      position: 'relative',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: 'Inter-Bold',
      color: 'white',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 100,
      paddingRight: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: 350,
      maxHeight: '70%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    markAllButtonText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    closeButton: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: colors.background,
    },
    notificationsList: {
      maxHeight: 400,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notificationItemUnread: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    notificationIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    notificationMessage: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 18,
    },
    notificationTime: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.bellButton} 
        onPress={() => setShowModal(true)}
      >
        <Bell size={20} color={colors.textSecondary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity 
                    style={styles.markAllButton}
                    onPress={markAllAsRead}
                  >
                    <Text style={styles.markAllButtonText}>Mark All Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);
                  
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.read && styles.notificationItemUnread,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: `${iconColor}15` }
                      ]}>
                        <IconComponent size={16} color={iconColor} />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatDistanceToNow(new Date(notification.created_at))}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Bell size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No notifications</Text>
                  <Text style={styles.emptySubtext}>
                    You're all caught up!
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}