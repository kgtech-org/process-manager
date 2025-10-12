import { apiClient } from '../api';

export interface Invitation {
  id: string;
  documentId: string;
  documentTitle?: string;
  invitedBy: string;
  invitedByName?: string;
  invitedEmail: string;
  invitedUserId?: string;
  type: 'collaborator' | 'reviewer';
  team: 'authors' | 'verifiers' | 'validators';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationRequest {
  documentId: string;
  invitedEmail: string;
  type: 'collaborator' | 'reviewer';
  team: 'authors' | 'verifiers' | 'validators';
  message?: string;
}

export interface InvitationFilter {
  documentId?: string;
  invitedEmail?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  type?: 'collaborator' | 'reviewer';
  forMe?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedInvitations {
  data: Invitation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InvitationResource {
  /**
   * Send an invitation to collaborate on a document
   */
  static async send(data: CreateInvitationRequest): Promise<Invitation> {
    const response = await apiClient.post<{ data: Invitation }>('/invitations', data);
    return response.data?.data as Invitation;
  }

  /**
   * Get paginated list of invitations
   */
  static async list(filters?: InvitationFilter): Promise<PaginatedInvitations> {
    const params = new URLSearchParams();

    if (filters?.documentId) params.append('documentId', filters.documentId);
    if (filters?.invitedEmail) params.append('invitedEmail', filters.invitedEmail);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.forMe) params.append('forMe', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<Invitation[]>(
      `/invitations?${params.toString()}`
    );

    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  /**
   * Accept an invitation
   */
  static async accept(invitationId: string): Promise<void> {
    await apiClient.put(`/invitations/${invitationId}/accept`);
  }

  /**
   * Decline an invitation
   */
  static async decline(invitationId: string, reason?: string): Promise<void> {
    await apiClient.put(`/invitations/${invitationId}/decline`, { reason });
  }

  /**
   * Resend an invitation
   */
  static async resend(invitationId: string): Promise<void> {
    await apiClient.post(`/invitations/${invitationId}/resend`);
  }

  /**
   * Cancel an invitation
   */
  static async cancel(invitationId: string): Promise<void> {
    await apiClient.delete(`/invitations/${invitationId}/cancel`);
  }
}
