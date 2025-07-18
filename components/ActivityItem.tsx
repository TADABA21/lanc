import { View, Text, StyleSheet } from 'react-native';
import { Activity } from '@/types/database';
import { formatDistanceToNow } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { colors } = useTheme();

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'project_created': return '#10B981';
      case 'project_updated': return '#3B82F6';
      case 'invoice_sent': return '#F59E0B';
      case 'invoice_paid': return '#10B981';
      case 'client_added': return '#8B5CF6';
      case 'contract_signed': return '#059669';
      case 'team_member_added': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created': return '📁';
      case 'project_updated': return '📝';
      case 'invoice_sent': return '📄';
      case 'invoice_paid': return '💰';
      case 'client_added': return '👤';
      case 'contract_signed': return '✍️';
      case 'team_member_added': return '👥';
      default: return '📋';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    iconContainer: {
      marginRight: 12,
    },
    indicator: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emoji: {
      fontSize: 16,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 18,
    },
    timestamp: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.indicator, { backgroundColor: getStatusColor(activity.type) }]}>
          <Text style={styles.emoji}>{getActivityIcon(activity.type)}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{activity.title}</Text>
        {activity.description && (
          <Text style={styles.description}>{activity.description}</Text>
        )}
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(activity.created_at))}
        </Text>
      </View>
    </View>
  );
}