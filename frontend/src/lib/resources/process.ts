import { apiClient } from '../api';
import { Process } from '@/types/macro';

export class ProcessResource {
    static async getAll(filters?: any): Promise<Process[]> {
        try {
            const queryParams = new URLSearchParams();
            if (filters?.search) queryParams.append('search', filters.search);
            if (filters?.status) queryParams.append('status', filters.status);

            // Limit to a large number to emulate fetching all, but effectively we fetch documents
            queryParams.append('limit', '100');

            const query = queryParams.toString();
            const res = await apiClient.get(`/documents${query ? `?${query}` : ''}`);

            if (res && res.success && res.data) {
                return res.data;
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    static async getById(processId: string): Promise<Process> {
        const res = await apiClient.get(`/documents/${processId}`);
        if (res && res.success) {
            return res.data;
        }
        throw new Error('Process not found');
    }
}
