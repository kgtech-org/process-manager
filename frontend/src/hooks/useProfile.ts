import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/lib/auth';
import { ProfileUpdateData } from '@/lib/validation';

// Profile management hook
export const useProfile = () => {
  const { user, refreshUser, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Update profile information
  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      setIsUpdating(true);
      const updatedUser = await authService.updateProfile(data);
      updateUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [updateUser]);

  // Upload profile avatar
  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      setUploadProgress(0);

      const result = await authService.uploadAvatar(file, (progress) => {
        setUploadProgress(progress);
      });

      // Refresh user data to get updated avatar URL
      await refreshUser();

      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  }, [refreshUser]);

  // Delete profile avatar
  const deleteAvatar = useCallback(async () => {
    try {
      setIsUploadingAvatar(true);
      await authService.deleteAvatar();
      
      // Refresh user data to remove avatar URL
      await refreshUser();
    } catch (error) {
      throw error;
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [refreshUser]);

  return {
    user,
    isUpdating,
    isUploadingAvatar,
    uploadProgress,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  };
};