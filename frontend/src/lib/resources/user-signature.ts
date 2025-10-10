import apiClient from '../api';

export type UserSignatureType = 'image' | 'drawn' | 'typed';

export interface UserSignature {
  id: string;
  userId: string;
  name: string;
  type: UserSignatureType;
  data: string; // Base64 or text
  font?: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserSignatureRequest {
  name: string;
  type: UserSignatureType;
  data: string;
  font?: string;
}

export interface UpdateUserSignatureRequest {
  name?: string;
  isDefault?: boolean;
}

export class UserSignatureResource {
  static async create(data: CreateUserSignatureRequest): Promise<UserSignature> {
    const response = await apiClient.post<{ data: UserSignature }>(
      '/users/me/signatures',
      data
    );
    return response.data?.data as UserSignature;
  }

  static async list(): Promise<UserSignature[]> {
    const response = await apiClient.get<{ data: UserSignature[] }>('/users/me/signatures');
    return response.data?.data || [];
  }

  static async getDefault(): Promise<UserSignature | null> {
    try {
      const response = await apiClient.get<{ data: UserSignature }>(
        '/users/me/signatures/default'
      );
      return response.data?.data as UserSignature;
    } catch (error) {
      return null;
    }
  }

  static async update(
    signatureId: string,
    data: UpdateUserSignatureRequest
  ): Promise<UserSignature> {
    const response = await apiClient.put<{ data: UserSignature }>(
      `/users/me/signatures/${signatureId}`,
      data
    );
    return response.data?.data as UserSignature;
  }

  static async delete(signatureId: string): Promise<void> {
    await apiClient.delete(`/users/me/signatures/${signatureId}`);
  }

  static async resendInvitation(invitationId: string): Promise<void> {
    await apiClient.post(`/invitations/${invitationId}/resend`);
  }

  static async cancelInvitation(invitationId: string): Promise<void> {
    await apiClient.delete(`/invitations/${invitationId}/cancel`);
  }
}
