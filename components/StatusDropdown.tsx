import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronDown, Check } from 'lucide-react-native';
import { getStatusColor } from '@/lib/utils';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusDropdownProps {
  currentStatus: string;
  options: StatusOption[];
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export function StatusDropdown({ 
  currentStatus, 
  options, 
  onStatusChange, 
  disabled = false 
}: StatusDropdownProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const currentOption = options.find(option => option.value === currentStatus);

  const handleStatusSelect = (status: string) => {
    onStatusChange(status);
    setShowModal(false);
  };

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minWidth: 120,
    },
    dropdownButtonDisabled: {
      opacity: 0.6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    statusText: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    chevron: {
      marginLeft: 'auto',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxWidth: 300,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    optionsList: {
      gap: 8,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionItemSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    optionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 12,
    },
    optionText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: 'white',
    },
    optionLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.text,
      flex: 1,
    },
    checkIcon: {
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
        ]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        {currentOption && (
          <>
            <View style={[styles.statusBadge, { backgroundColor: currentOption.color }]}>
              <Text style={styles.statusText}>{currentOption.label}</Text>
            </View>
            <ChevronDown size={16} color={colors.textMuted} style={styles.chevron} />
          </>
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
            <Text style={styles.modalTitle}>Change Status</Text>
            <View style={styles.optionsList}>
              {options.map((option) => {
                const isSelected = option.value === currentStatus;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                    ]}
                    onPress={() => handleStatusSelect(option.value)}
                  >
                    <View style={[styles.optionBadge, { backgroundColor: option.color }]}>
                      <Text style={styles.optionText}>{option.label}</Text>
                    </View>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {isSelected && (
                      <Check size={20} color={colors.primary} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}