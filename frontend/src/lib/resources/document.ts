import { apiClient } from '../api';
import type { PaginationData, PaginatedResponse } from './user';

// Document types based on backend schema
export type DocumentStatus =
  | 'draft'
  | 'author_review'
  | 'author_signed'
  | 'verifier_review'
  | 'verifier_signed'
  | 'validator_review'
  | 'approved'
  | 'archived';

export interface ApplicationTask {
  code: string;
  description: string;
  isActive: boolean;
  order: number;
}

export type ContributorTeam = 'authors' | 'verifiers' | 'validators';
export type SignatureStatus = 'joined' | 'pending' | 'signed' | 'rejected';
export type AnnexType = 'diagram' | 'table' | 'text' | 'file';

export interface Contributor {
  userId: string;
  name: string;
  title: string;
  department: string;
  team: ContributorTeam;
  status: SignatureStatus;
  signatureDate?: string;
  invitedAt: string;
}

export interface Contributors {
  authors: Contributor[];
  verifiers: Contributor[];
  validators: Contributor[];
}

export interface ProcessDescription {
  title: string;
  instructions: string[];
  order: number;
  outputIndex: number;
  durationIndex: number;
}

export interface ProcessStep {
  id: string;
  title: string;
  order: number;
  outputs: string[];
  durations: string[];
  responsible: string;
  descriptions: ProcessDescription[];
}

export interface ProcessGroup {
  id: string;
  title: string;
  order: number;
  processSteps: ProcessStep[];
}

export interface FileAttachment {
  id: string;
  fileName: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  minioObjectName: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Annex {
  id: string;
  title: string;
  type: AnnexType;
  content: Record<string, any>;
  order: number;
  files?: FileAttachment[];
}

export interface ChangeHistoryEntry {
  version: string;
  date: string;
  author: string;
  description: string;
}

export interface DocumentMetadata {
  objectives: string[];
  implicatedActors: string[];
  managementRules: string[];
  terminology: string[];
  changeHistory: ChangeHistoryEntry[];
}

export interface Document {
  id: string;
  macroId?: string;
  processCode?: string;
  reference: string;
  title: string;
  shortDescription?: string;
  description?: string;
  stakeholders?: string[];
  tasks?: ApplicationTask[];
  version: string;
  status: DocumentStatus;
  createdBy: string;
  contributors: Contributors;
  metadata: DocumentMetadata;
  processGroups: ProcessGroup[];
  annexes: Annex[];
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  isActive: boolean;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  data: Document;
  createdBy: string;
  createdAt: string;
  changeNote: string;
}

export interface CreateDocumentRequest {
  reference: string;
  title: string;
  version: string;
  contributors?: Contributors;
  metadata?: DocumentMetadata;
  processGroups?: ProcessGroup[];
  annexes?: Annex[];
  isActive?: boolean;
}

export interface UpdateDocumentRequest {
  title?: string;
  version?: string;
  status?: DocumentStatus;
  contributors?: Contributors;
  metadata?: DocumentMetadata;
  processGroups?: ProcessGroup[];
  annexes?: Annex[];
  isActive?: boolean;
  tasks?: ApplicationTask[];
}

export interface DocumentFilter {
  status?: DocumentStatus;
  createdBy?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Document Resource API
export class DocumentResource {
  /**
   * Get all documents with optional filters
   */
  static async getAll(filters?: DocumentFilter): Promise<Document[]> {
    const queryParams = new URLSearchParams();

    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.createdBy) queryParams.append('createdBy', filters.createdBy);
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const query = queryParams.toString();
    const response = await apiClient.get(`/documents${query ? `?${query}` : ''}`);
    return response.data || [];
  }

  /**
   * Get paginated documents with optional filters
   */
  static async getPaginated(filters?: DocumentFilter): Promise<PaginatedResponse<Document>> {
    const queryParams = new URLSearchParams();

    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.createdBy) queryParams.append('createdBy', filters.createdBy);
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const query = queryParams.toString();
    const response = await apiClient.get(`/documents${query ? `?${query}` : ''}`);

    return {
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  }

  /**
   * Get a specific document by ID
   */
  static async getById(documentId: string): Promise<Document> {
    const response = await apiClient.get(`/documents/${documentId}`);
    return response.data;
  }

  /**
   * Create a new document
   */
  static async create(data: CreateDocumentRequest): Promise<Document> {
    const response = await apiClient.post('/documents', data);
    return response.data;
  }

  /**
   * Update a document
   */
  static async update(documentId: string, data: UpdateDocumentRequest): Promise<Document> {
    const response = await apiClient.put(`/documents/${documentId}`, data);
    return response.data;
  }

  /**
   * Delete a document
   */
  static async delete(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  }

  /**
   * Duplicate a document
   */
  static async duplicate(documentId: string): Promise<Document> {
    const response = await apiClient.post(`/documents/${documentId}/duplicate`);
    return response.data;
  }

  /**
   * Publish a document for signature
   * Changes all 'joined' contributors to 'pending' signature status
   */
  static async publish(documentId: string): Promise<Document> {
    const response = await apiClient.post(`/documents/${documentId}/publish`);
    return response.data;
  }

  /**
   * Export document as PDF
   * Returns existing PDF URL if available, otherwise generates a new PDF
   */
  static async exportPDF(documentId: string): Promise<string> {
    const response = await apiClient.get(`/documents/${documentId}/export-pdf`);
    return response.data.pdfUrl;
  }

  /**
   * Get document versions
   */
  static async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const response = await apiClient.get(`/documents/${documentId}/versions`);
    return response.data || [];
  }

  /**
   * Get documents by status
   */
  static async getByStatus(status: DocumentStatus, limit?: number): Promise<Document[]> {
    return this.getAll({ status, limit });
  }

  /**
   * Get draft documents
   */
  static async getDrafts(limit?: number): Promise<Document[]> {
    return this.getByStatus('draft', limit);
  }

  /**
   * Get approved documents
   */
  static async getApproved(limit?: number): Promise<Document[]> {
    return this.getByStatus('approved', limit);
  }

  /**
   * Search documents
   */
  static async search(query: string, limit?: number): Promise<Document[]> {
    return this.getAll({ search: query, limit });
  }

  /**
   * Update document metadata
   */
  static async updateMetadata(
    documentId: string,
    metadata: {
      objectives?: string[];
      implicatedActors?: string[];
      managementRules?: string[];
      terminology?: string[];
    }
  ): Promise<Document> {
    const response = await apiClient.patch(`/documents/${documentId}/metadata`, metadata);
    return response.data;
  }

  /**
   * Create an annex
   */
  static async createAnnex(
    documentId: string,
    annex: {
      title: string;
      type: AnnexType;
      content?: Record<string, any>;
    }
  ): Promise<Annex> {
    const response = await apiClient.post(`/documents/${documentId}/annexes`, annex);
    return response.data;
  }

  /**
   * Update an annex
   */
  static async updateAnnex(
    documentId: string,
    annexId: string,
    updates: {
      title?: string;
      type?: AnnexType;
      content?: Record<string, any>;
      order?: number;
    }
  ): Promise<Annex> {
    const response = await apiClient.patch(`/documents/${documentId}/annexes/${annexId}`, updates);
    return response.data;
  }

  /**
   * Delete an annex
   */
  static async deleteAnnex(documentId: string, annexId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}/annexes/${annexId}`);
  }
}
