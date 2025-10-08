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
    return response.data?.data || [];
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
