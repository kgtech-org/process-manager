import { apiClient } from '../api';

// Domain types based on the backend schema
export interface Domain {
    id: string;
    name: string;
    code: string;
    description?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DomainFilters {
    active?: boolean;
}

export interface DomainCreateData {
    name: string;
    code: string;
    description?: string;
}

export interface DomainUpdateData {
    name?: string;
    code?: string;
    description?: string;
    active?: boolean;
}

// Domain Resource API
export class DomainResource {
    /**
     * Get all domains with optional filters
     */
    static async getAll(filters?: DomainFilters): Promise<Domain[]> {
        const queryParams = new URLSearchParams();

        if (filters?.active !== undefined) {
            queryParams.append('active', filters.active.toString());
        }

        const queryString = queryParams.toString();
        const url = `/domains${queryString ? `?${queryString}` : ''}`;

        const response = await apiClient.get(url);
        return response.data || [];
    }

    /**
     * Get a domain by ID
     */
    static async getById(id: string): Promise<Domain> {
        const response = await apiClient.get(`/domains/${id}`);
        return response.data;
    }

    /**
     * Create a new domain
     */
    static async create(data: DomainCreateData): Promise<Domain> {
        const response = await apiClient.post('/domains', data);
        return response.data;
    }

    /**
     * Update a domain
     */
    static async update(id: string, data: DomainUpdateData): Promise<Domain> {
        const response = await apiClient.put(`/domains/${id}`, data);
        return response.data;
    }

    /**
     * Delete a domain
     */
    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/domains/${id}`);
    }
}
