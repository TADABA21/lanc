import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { Upload, File, X, FileText, Image, Video, Music } from 'lucide-react-native';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

interface DocumentPickerProps {
  onFilesSelected: (files: SelectedFile[]) => void;
  maxFiles?: number;
  allowedTypes?: DocumentPicker.DocumentPickerOptions['type'];
  label?: string;
  placeholder?: string;
}

export function DocumentPickerComponent({ 
  onFilesSelected,
  maxFiles = 5,
  allowedTypes = '*/*',
  label = 'Upload Files',
  placeholder = 'No files selected'
}: DocumentPickerProps) {
  const { colors } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        multiple: maxFiles > 1,
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/octet-stream',
        }));

        const newFiles = [...selectedFiles, ...files].slice(0, maxFiles);
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 8,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    uploadButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    uploadIcon: {
      marginRight: 8,
    },
    uploadText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    uploadTextActive: {
      color: colors.primary,
    },
    filesList: {
      maxHeight: 200,
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileIcon: {
      marginRight: 12,
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: colors.text,
      marginBottom: 2,
    },
    fileSize: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
    },
    removeButton: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
    placeholder: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
      paddingVertical: 8,
    },
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.uploadButton,
          selectedFiles.length > 0 && styles.uploadButtonActive
        ]}
        onPress={pickFiles}
      >
        <Upload 
          size={20} 
          color={selectedFiles.length > 0 ? colors.primary : colors.textSecondary} 
          style={styles.uploadIcon} 
        />
        <Text style={[
          styles.uploadText,
          selectedFiles.length > 0 && styles.uploadTextActive
        ]}>
          {selectedFiles.length > 0 
            ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`
            : 'Tap to select files'
          }
        </Text>
      </TouchableOpacity>

      {selectedFiles.length > 0 ? (
        <FlatList
          data={selectedFiles}
          style={styles.filesList}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item, index }) => {
            const FileIcon = getFileIcon(item.mimeType);
            return (
              <View style={styles.fileItem}>
                <FileIcon size={20} color={colors.primary} style={styles.fileIcon} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(item.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFile(index)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <Text style={styles.placeholder}>{placeholder}</Text>
      )}
    </View>
  );
}