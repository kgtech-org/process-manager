import { apiClient } from '../api';
import type { Macro, CreateMacroRequest, UpdateMacroRequest, MacroFilter } from '@/types/macro';

// Re-export types for convenience
export type { Macro, CreateMacroRequest, UpdateMacroRequest, MacroFilter } from '@/types/macro';

// API Response types
interface MacroListResponse {
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

interface MacroResponse {
  success: boolean;
  message: string;
  data: Macro;
}

interface ProcessListResponse {
  success: boolean;
  message: string;
  data: any[]; // Process/Document type
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Macro Resource API
 * Manages macro-processes that group micro-processes by domain
 */
export class MacroResource {
  /**
   * Get all macros with optional filters and pagination
   */
  static async getAll(filters?: MacroFilter): Promise<MacroListResponse> {
    const queryParams = new URLSearchParams();

    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    if (filters?.page) {
      queryParams.append('page', filters.page.toString());
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const query = queryParams.toString();
    const response = await apiClient.get(`/macros${query ? `?${query}` : ''}`);

    return {
      success: true,
      message: 'Macros retrieved successfully',
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  /**
   * Get a specific macro by ID
   */
  static async getById(macroId: string): Promise<Macro> {
    const response = await apiClient.get(`/macros/${macroId}`);
    return response.data;
  }

  /**
   * Create a new macro
   */
  static async create(data: CreateMacroRequest): Promise<Macro> {
    const response = await apiClient.post('/macros', data);
    return response.data;
  }

  /**
   * Update macro information
   */
  static async update(macroId: string, data: UpdateMacroRequest): Promise<Macro> {
    const response = await apiClient.put(`/macros/${macroId}`, data);
    return response.data;
  }

  /**
   * Delete macro
   */
  static async delete(macroId: string): Promise<void> {
    await apiClient.delete(`/macros/${macroId}`);
  }

  /**
   * Get processes in a macro with pagination
   */
  static async getProcesses(
    macroId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ProcessListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const response = await apiClient.get(
      `/macros/${macroId}/processes?${queryParams.toString()}`
    );

    return {
      success: true,
      message: 'Processes retrieved successfully',
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  /**
   * Get paginated macros (convenience method)
   */
  static async getPaginated(page: number = 1, limit: number = 20): Promise<MacroListResponse> {
    return this.getAll({ page, limit });
  }

  /**
   * Search macros by keyword
   */
  static async search(query: string, page: number = 1, limit: number = 20): Promise<MacroListResponse> {
    return this.getAll({ search: query, page, limit });
  }

  /**
   * Get macro statistics
   */
  static async getStats(): Promise<{
    total: number;
    totalProcesses: number;
    averageProcessesPerMacro: number;
  }> {
    const response = await this.getAll({ page: 1, limit: 100 }); // Get all macros

    const total = response.pagination.total;
    const totalProcesses = response.data.reduce((sum, macro) => sum + (macro.processCount || 0), 0);
    const averageProcessesPerMacro = total > 0 ? totalProcesses / total : 0;

    return {
      total,
      totalProcesses,
      averageProcessesPerMacro: Math.round(averageProcessesPerMacro * 10) / 10,
    };
  }

  /**
   * Validate macro code format (M1, M2, M3, etc.)
   */
  static validateMacroCode(code: string): boolean {
    const macroCodePattern = /^M\d+$/;
    return macroCodePattern.test(code);
  }

  /**
   * Validate process code format (M1_P1, M1_P2, etc.)
   */
  static validateProcessCode(code: string): boolean {
    const processCodePattern = /^M\d+_P\d+$/;
    return processCodePattern.test(code);
  }

  /**
   * Validate task code format (M1_P1_T1, M1_P1_T2, etc.)
   */
  static validateTaskCode(code: string): boolean {
    const taskCodePattern = /^M\d+_P\d+_T\d+$/;
    return taskCodePattern.test(code);
  }

  /**
   * Extract macro code from process code
   * Example: M1_P5 -> M1
   */
  static extractMacroCode(processCode: string): string | null {
    const match = processCode.match(/^(M\d+)_P\d+$/);
    return match ? match[1] : null;
  }

  /**
   * Extract process code from task code
   * Example: M1_P5_T3 -> M1_P5
   */
  static extractProcessCode(taskCode: string): string | null {
    const match = taskCode.match(/^(M\d+_P\d+)_T\d+$/);
    return match ? match[1] : null;
  }
}
