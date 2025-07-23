import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
}

// Upload file to Supabase Storage
export async function uploadFile(
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  },
  options: UploadOptions = {}
): Promise<UploadedFile> {
  const { bucket = 'project-files', folder = 'uploads' } = options;
  
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileNameParts = file.name.split('.');
    const extension = fileNameParts.length > 1 ? fileNameParts.pop() : '';
    const baseName = fileNameParts.join('.');
    const uniqueName = `${timestamp}_${baseName}${extension ? '.' + extension : ''}`;
    const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

    let fileData: ArrayBuffer | Uint8Array;
    
    if (Platform.OS === 'web') {
      // For web, convert blob URL to ArrayBuffer
      const response = await fetch(file.uri);
      fileData = await response.arrayBuffer();
    } else {
      // For mobile, read file as base64 and convert
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes;
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      id: crypto.randomUUID(), // Generate a proper UUID for the database record
      name: file.name,
      size: file.size || 0,
      type: file.type,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Upload multiple files
export async function uploadFiles(
  files: Array<{
    uri: string;
    name: string;
    type: string;
    size?: number;
  }>,
  options: UploadOptions = {}
): Promise<UploadedFile[]> {
  const uploadPromises = files.map(file => uploadFile(file, options));
  return Promise.all(uploadPromises);
}

// Delete file from Supabase Storage
export async function deleteFile(filePath: string, bucket = 'project-files'): Promise<void> {
  console.log('🗑️ Deleting file from storage:', { filePath, bucket });
  
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage deletion error:', error);
      throw error;
    }
    
    console.log('✅ File deleted from storage successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get file info from Supabase Storage
export async function getFileInfo(filePath: string, bucket = 'project-files') {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      });

    if (error) {
      throw error;
    }

    return data[0] || null;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

// Create storage bucket if it doesn't exist
export async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/*',
        ],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });
      
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}