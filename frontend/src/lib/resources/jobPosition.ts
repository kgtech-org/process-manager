import { apiClient } from '../api';

// Job Position types based on the backend schema
export interface JobPosition {
  id: string;
  title: string;
  code: string;
  description?: string;
  departmentId: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  level: string;
  requiredSkills?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobPositionFilters {
  active?: boolean;
  departmentId?: string;
  level?: string;
}

export interface JobPositionCreateData {
  title: string;
  code: string;
  description?: string;
  departmentId: string;
  level: string;
  requiredSkills: string[];
}

export interface JobPositionUpdateData {
  title?: string;
  code?: string;
  description?: string;
  departmentId?: string;
  level?: string;
  requiredSkills?: string[];
  active?: boolean;
}

// Job Position Resource API
export class JobPositionResource {
  /**
   * Get all job positions with optional filters
   */
  static async getAll(filters?: JobPositionFilters): Promise<JobPosition[]> {
    const queryParams = new URLSearchParams();

    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.departmentId) {
      queryParams.append('departmentId', filters.departmentId);
    }
    if (filters?.level) {
      queryParams.append('level', filters.level);
    }

    const query = queryParams.toString();
    const response = await apiClient.get(`/job-positions${query ? `?${query}` : ''}`);
    const jobPositions = response.data || [];

    // Enrich with department data
    return this.enrichWithDepartmentData(jobPositions);
  }

  /**
   * Enrich job positions with department data
   */
  private static async enrichWithDepartmentData(jobPositions: JobPosition[]): Promise<JobPosition[]> {
    try {
      // Import DepartmentResource to avoid circular imports
      const { DepartmentResource } = await import('./department');
      const departments = await DepartmentResource.getAll();

      return jobPositions.map(position => ({
        ...position,
        requiredSkills: position.requiredSkills || [],
        department: departments.find(dept => dept.id === position.departmentId)
      }));
    } catch (error) {
      console.error('Failed to enrich job positions with department data:', error);
      return jobPositions;
    }
  }

  /**
   * Get a specific job position by ID
   */
  static async getById(positionId: string): Promise<JobPosition> {
    const response = await apiClient.get(`/job-positions/${positionId}`);
    const jobPosition = response.data;

    // Enrich with department data
    const enriched = await this.enrichWithDepartmentData([jobPosition]);
    return enriched[0];
  }

  /**
   * Create a new job position
   */
  static async create(data: JobPositionCreateData): Promise<JobPosition> {
    const response = await apiClient.post('/job-positions', data);
    const jobPosition = response.data;

    // Enrich with department data
    const enriched = await this.enrichWithDepartmentData([jobPosition]);
    return enriched[0];
  }

  /**
   * Update job position information
   */
  static async update(positionId: string, data: JobPositionUpdateData): Promise<JobPosition> {
    const response = await apiClient.put(`/job-positions/${positionId}`, data);
    return response.data;
  }

  /**
   * Delete job position
   */
  static async delete(positionId: string): Promise<void> {
    await apiClient.delete(`/job-positions/${positionId}`);
  }

  /**
   * Get active job positions only
   */
  static async getActive(): Promise<JobPosition[]> {
    return this.getAll({ active: true });
  }

  /**
   * Get inactive job positions only
   */
  static async getInactive(): Promise<JobPosition[]> {
    return this.getAll({ active: false });
  }

  /**
   * Get job positions by department
   */
  static async getByDepartment(departmentId: string): Promise<JobPosition[]> {
    return this.getAll({ departmentId });
  }

  /**
   * Get job positions by level
   */
  static async getByLevel(level: string): Promise<JobPosition[]> {
    return this.getAll({ level });
  }

  /**
   * Get job positions by department and level
   */
  static async getByDepartmentAndLevel(departmentId: string, level: string): Promise<JobPosition[]> {
    return this.getAll({ departmentId, level });
  }

  /**
   * Activate job position
   */
  static async activate(positionId: string): Promise<JobPosition> {
    return this.update(positionId, { active: true });
  }

  /**
   * Deactivate job position
   */
  static async deactivate(positionId: string): Promise<JobPosition> {
    return this.update(positionId, { active: false });
  }

  /**
   * Move job position to different department
   */
  static async moveToDepartment(positionId: string, departmentId: string): Promise<JobPosition> {
    return this.update(positionId, { departmentId });
  }

  /**
   * Update required skills
   */
  static async updateSkills(positionId: string, requiredSkills: string[]): Promise<JobPosition> {
    return this.update(positionId, { requiredSkills });
  }

  /**
   * Change position level
   */
  static async updateLevel(positionId: string, level: string): Promise<JobPosition> {
    return this.update(positionId, { level });
  }

  /**
   * Get job position statistics
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byLevel: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    const positions = await this.getAll();

    // Count by level
    const byLevel: Record<string, number> = {};
    positions.forEach(pos => {
      byLevel[pos.level] = (byLevel[pos.level] || 0) + 1;
    });

    // Count by department
    const byDepartment: Record<string, number> = {};
    positions.forEach(pos => {
      const deptName = pos.department?.name || 'No Department';
      byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
    });

    const stats = {
      total: positions.length,
      active: positions.filter(p => p.active).length,
      inactive: positions.filter(p => !p.active).length,
      byLevel,
      byDepartment,
    };

    return stats;
  }

  /**
   * Search job positions by title, description, or skills
   */
  static async search(query: string): Promise<JobPosition[]> {
    const positions = await this.getAll();
    const searchTerm = query.toLowerCase();

    return positions.filter(pos =>
      pos.title.toLowerCase().includes(searchTerm) ||
      pos.code.toLowerCase().includes(searchTerm) ||
      (pos.description && pos.description.toLowerCase().includes(searchTerm)) ||
      (pos.requiredSkills && pos.requiredSkills.some(skill => skill.toLowerCase().includes(searchTerm))) ||
      (pos.department?.name?.toLowerCase().includes(searchTerm) || false)
    );
  }

  /**
   * Get unique levels from all job positions
   */
  static async getLevels(): Promise<string[]> {
    const positions = await this.getAll();
    const levels = Array.from(new Set(positions.map(pos => pos.level)));
    return levels.sort();
  }

  /**
   * Get all unique skills from job positions
   */
  static async getAllSkills(): Promise<string[]> {
    const positions = await this.getAll();
    const allSkills = positions.flatMap(pos => pos.requiredSkills || []);
    const uniqueSkills = Array.from(new Set(allSkills));
    return uniqueSkills.sort();
  }
}