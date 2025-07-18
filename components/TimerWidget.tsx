import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Play, Pause, Square, Clock, Save, X } from 'lucide-react-native';

interface TimerWidgetProps {
  onTimeEntryComplete: (description: string, duration: number) => void;
  projectName?: string;
}

export function TimerWidget({ onTimeEntryComplete, projectName }: TimerWidgetProps) {
  const { colors } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [description, setDescription] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = new Date();
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    if (seconds > 0) {
      setIsRunning(false);
      setShowSaveModal(true);
    } else {
      Alert.alert('No Time Recorded', 'Timer must run for at least 1 second to save an entry.');
    }
  };

  const handleSaveEntry = () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please enter a description for this time entry.');
      return;
    }

    const durationInMinutes = Math.ceil(seconds / 60); // Round up to nearest minute
    onTimeEntryComplete(description.trim(), durationInMinutes);
    
    // Reset timer
    setSeconds(0);
    setDescription('');
    setShowSaveModal(false);
    
    Alert.alert('Time Entry Saved', `${durationInMinutes} minute${durationInMinutes !== 1 ? 's' : ''} logged successfully.`);
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    // Reset timer without saving
    setSeconds(0);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    headerText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
    },
    timerDisplay: {
      fontSize: 32,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
      letterSpacing: 2,
    },
    timerRunning: {
      color: colors.primary,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
    controlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
    },
    startButton: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    pauseButton: {
      backgroundColor: colors.warning,
      borderColor: colors.warning,
    },
    stopButton: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    controlButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: 'white',
      marginLeft: 6,
    },
    projectInfo: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    projectLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    projectName: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
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
      maxWidth: 400,
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
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    timeInfo: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    timeLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    timeValue: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.primary,
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
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
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
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Clock size={18} color={colors.primary} />
          </View>
          <Text style={styles.headerText}>Time Tracker</Text>
        </View>

        {projectName && (
          <View style={styles.projectInfo}>
            <Text style={styles.projectLabel}>Tracking time for:</Text>
            <Text style={styles.projectName}>{projectName}</Text>
          </View>
        )}

        <Text style={[styles.timerDisplay, isRunning && styles.timerRunning]}>
          {formatTime(seconds)}
        </Text>

        <View style={styles.controlsContainer}>
          {!isRunning ? (
            <TouchableOpacity style={[styles.controlButton, styles.startButton]} onPress={handleStart}>
              <Play size={16} color="white" />
              <Text style={styles.controlButtonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.controlButton, styles.pauseButton]} onPress={handlePause}>
              <Pause size={16} color="white" />
              <Text style={styles.controlButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          
          {seconds > 0 && (
            <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={handleStop}>
              <Square size={16} color="white" />
              <Text style={styles.controlButtonText}>Stop & Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Save Time Entry Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelSave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Time Entry</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleCancelSave}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Time Recorded</Text>
              <Text style={styles.timeValue}>{formatTime(seconds)}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="What did you work on?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCancelSave}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveEntry}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Save Entry
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}