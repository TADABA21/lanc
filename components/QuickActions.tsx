import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Plus, 
  Users, 
  FileText, 
  FolderOpen,
  User,
  Mail,
  Calendar,
  Settings,
  Sparkles,
  FileCheck
} from 'lucide-react-native';

export function QuickActions() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const actions = [
    {
      id: 'new-project',
      title: 'New Project',
      icon: FolderOpen,
      color: '#3B82F6',
      backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
      route: '/projects/new',
    },
    {
      id: 'add-client',
      title: 'Add Client',
      icon: User,
      color: '#10B981',
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      route: '/clients/new',
    },
    {
      id: 'ai-invoice',
      title: 'AI Invoice',
      icon: Sparkles,
      color: '#F59E0B',
      backgroundColor: isDark ? '#78350F' : '#FFFBEB',
      route: '/invoices/ai-generate',
    },
    {
      id: 'ai-contract',
      title: 'AI Contract',
      icon: FileCheck,
      color: '#8B5CF6',
      backgroundColor: isDark ? '#581C87' : '#F3F4F6',
      route: '/contracts/ai-generate',
    },
    {
      id: 'ai-email',
      title: 'AI Email',
      icon: Mail,
      color: '#EF4444',
      backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
      route: '/email/ai-compose',
    },
    {
      id: 'add-team-member',
      title: 'Add Team Member',
      icon: Users,
      color: '#06B6D4',
      backgroundColor: isDark ? '#164E63' : '#ECFEFF',
      route: '/team/new',
    },
  ];

  const handleActionPress = (actionId: string, route?: string) => {
    if (route) {
      try {
        router.push(route as any);
      } catch (error) {
        console.log('Navigation not available for:', route);
      }
    } else {
      console.log('Action pressed:', actionId);
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionCard: {
      width: '48%',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 80,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    actionTitle: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionCard, 
              { backgroundColor: action.backgroundColor }
            ]}
            onPress={() => handleActionPress(action.id, action.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color }]}>
              <action.icon size={20} color="white" />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}