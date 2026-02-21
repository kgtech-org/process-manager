/**
 * Macro types for the Process Manager application
 * Macros group multiple micro-processes (processes) by domain
 */

export interface Macro {
  id: string;
  code: string; // M1, M2, M3, etc.
  name: string;
  shortDescription: string;
  description: string;
  domainId?: string;
  createdBy: string;
  processCount?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  processCode: string; // M1_P1, M1_P2, etc.
  title: string;
  description?: string;
  shortDescription?: string;
  macroId: string;
  isActive?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string;
  order?: number;
}

export interface CreateMacroRequest {
  code: string;
  name: string;
  shortDescription: string;
  description: string;
  domainId?: string;
}

export interface UpdateMacroRequest {
  name?: string;
  shortDescription?: string;
  description?: string;
  domainId?: string;
  isActive?: boolean;
}

export interface MacroFilter {
  search?: string;
  domainId?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface MacroListResponse {
  success: boolean;
  message: string;
  data: Macro[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MacroResponse {
  success: boolean;
  message: string;
  data: Macro;
}
