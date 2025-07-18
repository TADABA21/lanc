import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Plus, Video, MapPin } from 'lucide-react-native';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'video' | 'in-person' | 'phone';
  location?: string;
  attendees: string[];
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: '1',
      title: 'Project Kickoff Meeting',
      date: '2025-01-15',
      time: '10:00 AM',
      type: 'video',
      attendees: ['John Doe', 'Jane Smith'],
    },
    {
      id: '2',
      title: 'Client Review',
      date: '2025-01-16',
      time: '2:00 PM',
      type: 'in-person',
      location: 'Conference Room A',
      attendees: ['Client Name'],
    },
  ]);

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'in-person': return MapPin;
      default: return CalendarIcon;
    }
  };

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'video': return '#3B82F6';
      case 'in-person': return '#10B981';
      default: return '#F59E0B';
    }
  };

  const handleScheduleMeeting = () => {
    Alert.alert(
      'Schedule Meeting',
      'This feature would open a meeting scheduling form.',
      [{ text: 'OK' }]
    );
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
    scheduleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    scheduleButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 6,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
    },
    meetingCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    meetingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    meetingIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    meetingTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      flex: 1,
    },
    meetingDetails: {
      marginLeft: 44,
    },
    meetingTime: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    meetingLocation: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      marginBottom: 4,
    },
    meetingAttendees: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
        
        <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleMeeting}>
          <Plus size={16} color="white" />
          <Text style={styles.scheduleButtonText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
        
        {meetings.length > 0 ? (
          meetings.map((meeting) => {
            const IconComponent = getMeetingIcon(meeting.type);
            const iconColor = getMeetingTypeColor(meeting.type);
            
            return (
              <TouchableOpacity key={meeting.id} style={styles.meetingCard}>
                <View style={styles.meetingHeader}>
                  <View style={[styles.meetingIcon, { backgroundColor: `${iconColor}20` }]}>
                    <IconComponent size={16} color={iconColor} />
                  </View>
                  <Text style={styles.meetingTitle}>{meeting.title}</Text>
                </View>
                
                <View style={styles.meetingDetails}>
                  <Text style={styles.meetingTime}>
                    {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                  </Text>
                  {meeting.location && (
                    <Text style={styles.meetingLocation}>{meeting.location}</Text>
                  )}
                  <Text style={styles.meetingAttendees}>
                    Attendees: {meeting.attendees.join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <CalendarIcon size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No meetings scheduled</Text>
            <Text style={styles.emptyDescription}>
              Schedule your first meeting to get started
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleScheduleMeeting}>
              <Text style={styles.emptyButtonText}>Schedule Meeting</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}