'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { avatarUploadSchema } from '@/lib/validation';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate?: (avatarUrl: string | null) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
}) => {
  const { isUploadingAvatar, uploadProgress, uploadAvatar, deleteAvatar } = useProfile();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      
      // Validate file
      const validation = avatarUploadSchema.safeParse({ avatar: file });
      if (!validation.success) {
        setError(validation.error.errors[0].message);
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
      onAvatarUpdate?.(result.avatarUrl);
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
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  <span className="text-white text-xl font-bold">
                    {/* Show first letter of user's name or default */}
                    <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
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