import { apiClient } from '../api';

export type SignatureType = 'author' | 'verifier' | 'validator';

export interface Signature {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  type: SignatureType;
  signatureData: string;
  comments?: string;
  ipAddress: string;
  userAgent: string;
  signedAt: string;
  createdAt: string;
}

export interface CreateSignatureRequest {
  type: SignatureType;
  signatureData: string;
  comments?: string;
}

export class SignatureResource {
  /**
   * Get all signatures for a document
   */
  static async getDocumentSignatures(documentId: string): Promise<Signature[]> {
    const response = await apiClient.get<{ data: Signature[] }>(
      `/documents/${documentId}/signatures`
    );
    console.log('🔍 [API] Full response object:', response);
    console.log('🔍 [API] response.data:', response.data);
    console.log('🔍 [API] response.data.data:', (response.data as any)?.data);

    // Try to access data from the response
    const signatures = (response.data as any)?.data || response.data || [];
    console.log('🔍 [API] Extracted signatures:', signatures);

    return signatures;
  }

  /**
   * Add a signature to a document
   */
  static async add(documentId: string, data: CreateSignatureRequest): Promise<Signature> {
    const response = await apiClient.post<{ data: Signature }>(
      `/documents/${documentId}/signatures`,
      data
    );
    return response.data?.data as Signature;
  }
}
