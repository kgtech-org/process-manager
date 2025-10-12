'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate?: (avatar: string | null) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
}) => {
  const { user } = useAuth();
  const { isUploadingAvatar, uploadProgress, uploadAvatar, deleteAvatar } = useProfile();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      // If only one name, take first two letters
      return names[0].slice(0, 2).toUpperCase();
    }
    // Take first letter of first name and first letter of last name
    const firstName = names[0];
    const lastName = names[names.length - 1];
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: 'from-blue-500 to-blue-600', text: 'text-white' },
      { bg: 'from-green-500 to-green-600', text: 'text-white' },
      { bg: 'from-purple-500 to-purple-600', text: 'text-white' },
      { bg: 'from-orange-500 to-orange-600', text: 'text-white' },
      { bg: 'from-pink-500 to-pink-600', text: 'text-white' },
      { bg: 'from-indigo-500 to-indigo-600', text: 'text-white' },
      { bg: 'from-teal-500 to-teal-600', text: 'text-white' },
      { bg: 'from-red-500 to-red-600', text: 'text-white' },
    ];

    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('File must be a valid image format (JPEG, PNG, WebP)');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const result = await uploadAvatar(file);
      onAvatarUpdate?.(result.avatar);
      setPreviewUrl(''); // Clear preview after successful upload
      
    } catch (error: any) {
      setError(error.message || 'Failed to upload avatar');
      setPreviewUrl('');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setError('');
      await deleteAvatar();
      onAvatarUpdate?.(null);
      setPreviewUrl('');
    } catch (error: any) {
      setError(error.message || 'Failed to delete avatar');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">Profile Picture</h3>
            <p className="text-sm text-gray-600">Upload a profile picture (max 5MB)</p>
          </div>

          {/* Avatar Display */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`h-full w-full flex items-center justify-center bg-gradient-to-br ${user?.firstName ? getAvatarColor(user.firstName + ' ' + user.lastName).bg : 'from-gray-400 to-gray-500'}`}>
                  <span className={`${user?.firstName ? getAvatarColor(user.firstName + ' ' + user.lastName).text : 'text-white'} text-xl font-bold`}>
                    {user?.firstName ? getInitials(user.firstName + ' ' + user.lastName) : (
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <div className="text-white text-xs font-medium">
                  {uploadProgress}%
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleButtonClick}
              disabled={isUploadingAvatar}
              size="sm"
            >
              {isUploadingAvatar ? 'Uploading...' : displayUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {displayUrl && (
              <Button
                onClick={handleDeleteAvatar}
                disabled={isUploadingAvatar}
                variant="outline"
                size="sm"
              >
                Remove
              </Button>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploadingAvatar}
          />

          <div className="text-xs text-gray-500 text-center max-w-xs">
            Supported formats: JPEG, PNG, WebP. Maximum file size: 5MB.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};