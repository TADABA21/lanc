import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProjectForm } from '@/components/forms/ProjectForm';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleSave = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProjectForm 
      projectId={id} 
      onSave={handleSave} 
      onCancel={handleCancel} 
    />
  );
}