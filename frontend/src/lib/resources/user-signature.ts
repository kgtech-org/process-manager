import apiClient from '../api';

export type UserSignatureType = 'image' | 'drawn' | 'typed';

export interface UserSignature {
  id: string;
  userId: string;
  type: UserSignatureType;
  data: string; // Base64 or text
  font?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserSignatureRequest {
  type: UserSignatureType;
  data: string;
  font?: string;
}

export class UserSignatureResource {
  /**
   * Get the user's signature (only one per user)
   */
  static async get(): Promise<UserSignature | null> {
    try {
      const response = await apiClient.get<{ data: UserSignature | null }>(
        '/users/me/signature'
      );
      return response.data?.data as UserSignature | null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create or update the user's signature (only one allowed)
   */
  static async save(data: CreateUserSignatureRequest): Promise<UserSignature> {
    const response = await apiClient.post<{ data: UserSignature }>(
      '/users/me/signature',
      data
    );
    return response.data?.data as UserSignature;
  }

  /**
   * Delete the user's signature
   */
  static async delete(): Promise<void> {
    await apiClient.delete('/users/me/signature');
  }
}
