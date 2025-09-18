import { apiClient } from '../api';

// Department types based on the backend schema
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  parent?: {
    id: string;
    name: string;
    code: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  subDepartments?: Department[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentFilters {
  active?: boolean;
  parentId?: string | null;
}

export interface DepartmentCreateData {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  managerId?: string;
}

export interface DepartmentUpdateData {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string;
  managerId?: string;
  active?: boolean;
}

// Department Resource API
export class DepartmentResource {
  /**
   * Get all departments with optional filters
   */
  static async getAll(filters?: DepartmentFilters): Promise<Department[]> {
    const queryParams = new URLSearchParams();

    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.parentId !== undefined) {
      queryParams.append('parentId', filters.parentId || 'null');
    }

    const query = queryParams.toString();
    const response = await apiClient.get(`/departments${query ? `?${query}` : ''}`);
    return response.data || [];
  }

  /**
   * Get a specific department by ID
   */
  static async getById(departmentId: string): Promise<Department> {
    const response = await apiClient.get(`/departments/${departmentId}`);
    return response.data;
  }

  /**
   * Create a new department
   */
  static async create(data: DepartmentCreateData): Promise<Department> {
    const response = await apiClient.post('/departments', data);
    return response.data;
  }

  /**
   * Update department information
   */
  static async update(departmentId: string, data: DepartmentUpdateData): Promise<Department> {
    const response = await apiClient.put(`/departments/${departmentId}`, data);
    return response.data;
  }

  /**
   * Delete department
   */
  static async delete(departmentId: string): Promise<void> {
    await apiClient.delete(`/departments/${departmentId}`);
  }

  /**
   * Get active departments only
   */
  static async getActive(): Promise<Department[]> {
    return this.getAll({ active: true });
  }

  /**
   * Get inactive departments only
   */
  static async getInactive(): Promise<Department[]> {
    return this.getAll({ active: false });
  }

  /**
   * Get root departments (no parent)
   */
  static async getRootDepartments(): Promise<Department[]> {
    return this.getAll({ parentId: null });
  }

  /**
   * Get sub-departments of a parent
   */
  static async getSubDepartments(parentId: string): Promise<Department[]> {
    return this.getAll({ parentId });
  }

  /**
   * Activate department
   */
  static async activate(departmentId: string): Promise<Department> {
    return this.update(departmentId, { active: true });
  }

  /**
   * Deactivate department
   */
  static async deactivate(departmentId: string): Promise<Department> {
    return this.update(departmentId, { active: false });
  }

  /**
   * Set department manager
   */
  static async setManager(departmentId: string, managerId: string): Promise<Department> {
    return this.update(departmentId, { managerId });
  }

  /**
   * Remove department manager
   */
  static async removeManager(departmentId: string): Promise<Department> {
    return this.update(departmentId, { managerId: undefined });
  }

  /**
   * Move department to a different parent
   */
  static async moveToParent(departmentId: string, parentId: string | null): Promise<Department> {
    return this.update(departmentId, { parentId: parentId || undefined });
  }

  /**
   * Get department statistics
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    rootDepartments: number;
    withSubDepartments: number;
  }> {
    const departments = await this.getAll();

    const stats = {
      total: departments.length,
      active: departments.filter(d => d.active).length,
      inactive: departments.filter(d => !d.active).length,
      rootDepartments: departments.filter(d => !d.parentId).length,
      withSubDepartments: departments.filter(d => d.subDepartments && d.subDepartments.length > 0).length,
    };

    return stats;
  }

  /**
   * Search departments by name or code
   */
  static async search(query: string): Promise<Department[]> {
    const departments = await this.getAll();
    const searchTerm = query.toLowerCase();

    return departments.filter(dept =>
      dept.name.toLowerCase().includes(searchTerm) ||
      dept.code.toLowerCase().includes(searchTerm) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm))
    );
  }
}