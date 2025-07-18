import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ProjectStatusData {
  todo: number;
  in_progress: number;
  completed: number;
}

interface ProjectStatusChartProps {
  data: ProjectStatusData;
}

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  const { colors } = useTheme();
  const total = data.todo + data.in_progress + data.completed;
  
  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    chart: {
      width: 80,
      height: 80,
      marginBottom: 12,
    },
    chartRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 8,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    emptyChart: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    emptyText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: colors.textMuted,
      textAlign: 'center',
    },
    totalText: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    totalLabel: {
      fontSize: 10,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    legend: {
      alignItems: 'flex-start',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    legendText: {
      fontSize: 11,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
  });
  
  if (total === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No Projects</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        <View style={styles.chartRing}>
          <Text style={styles.totalText}>{total}</Text>
          <Text style={styles.totalLabel}>Projects</Text>
        </View>
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>To Do ({data.todo})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>In Progress ({data.in_progress})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Completed ({data.completed})</Text>
        </View>
      </View>
    </View>
  );
}