import { View, Text, StyleSheet } from 'react-native';
import { Video as LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  color?: string;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  color = '#3B82F6' 
}: StatsCardProps) {
  const { colors } = useTheme();

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return '#10B981';
      case 'negative': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return '↗';
      case 'negative': return '↘';
      default: return '';
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      marginBottom: 12,
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${color}15`,
    },
    value: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    changeIcon: {
      fontSize: 12,
      fontFamily: 'Inter-Bold',
      marginRight: 4,
    },
    change: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {Icon && (
            <View style={styles.iconContainer}>
              <Icon size={16} color={color} />
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.value}>{value}</Text>
      
      {change && (
        <View style={styles.changeContainer}>
          <Text style={[styles.changeIcon, { color: getChangeColor() }]}>
            {getChangeIcon()}
          </Text>
          <Text style={[styles.change, { color: getChangeColor() }]}>
            {change}
          </Text>
        </View>
      )}
    </View>
  );
}