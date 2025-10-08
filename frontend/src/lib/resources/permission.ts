import { apiClient } from '../api';

export type PermissionLevel = 'read' | 'write' | 'sign' | 'admin';

export interface Permission {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  level: PermissionLevel;
  grantedBy: string;
  grantedByName?: string;
  grantedAt: string;
  updatedAt: string;
}

export interface CreatePermissionRequest {
  userId: string;
  level: PermissionLevel;
}

export interface UpdatePermissionRequest {
  level: PermissionLevel;
}

export class PermissionResource {
  /**
   * Get all permissions for a document
   */
  static async getDocumentPermissions(documentId: string): Promise<Permission[]> {
    const response = await apiClient.get<{ data: Permission[] }>(
      `/documents/${documentId}/permissions`
    );
    return response.data?.data || [];
  }

  /**
   * Add a permission to a document
   */
  static async add(documentId: string, data: CreatePermissionRequest): Promise<Permission> {
    const response = await apiClient.post<{ data: Permission }>(
      `/documents/${documentId}/permissions`,
      data
    );
    return response.data?.data as Permission;
  }

  /**
   * Update a permission
   */
  static async update(
    documentId: string,
    userId: string,
    data: UpdatePermissionRequest
  ): Promise<Permission> {
    const response = await apiClient.put<{ data: Permission }>(
      `/documents/${documentId}/permissions/${userId}`,
      data
    );
    return response.data?.data as Permission;
  }

  /**
   * Delete a permission
   */
  static async delete(documentId: string, userId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}/permissions/${userId}`);
  }
}
