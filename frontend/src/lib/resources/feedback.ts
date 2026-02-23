import apiClient from '../api';
import { FeedbackTemplate, ProcessFeedback, processFeedbackSchema, feedbackTemplateSchema } from '../validation';

export interface CreateFeedbackTemplateData {
    name: string;
    description: string;
    questions: Omit<FeedbackTemplate['questions'][0], 'id'>[];
    isActive?: boolean;
}

export interface SubmitFeedbackData {
    processId: string;
    macroId: string;
    templateId: string;
    responses: ProcessFeedback['responses'];
}

export interface UpdateFeedbackStatusData {
    status: 'reviewed' | 'addressed';
    notes?: string;
}

class FeedbackResourceClass {
    // ============================
    // TEMPLATES
    // ============================

    /**
     * Get all feedback templates
     * @param activeOnly If true, returns only active templates
     */
    async getTemplates(activeOnly: boolean = true): Promise<FeedbackTemplate[]> {
        const url = activeOnly ? '/feedback/templates?active=true' : '/feedback/templates';
        const response = await apiClient.get<FeedbackTemplate[]>(url);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch templates');
        }
        return response.data;
    }

    /**
     * Get a specific template by ID
     */
    async getTemplate(id: string): Promise<FeedbackTemplate> {
        const response = await apiClient.get<FeedbackTemplate>(`/feedback/templates/${id}`);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch template');
        }
        return response.data;
    }

    /**
     * Create a new feedback template (Admin)
     */
    async createTemplate(data: CreateFeedbackTemplateData): Promise<FeedbackTemplate> {
        const response = await apiClient.post<FeedbackTemplate>('/feedback/templates', data);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create template');
        }
        return response.data;
    }

    /**
     * Update an existing template (Admin)
     */
    async updateTemplate(id: string, data: CreateFeedbackTemplateData): Promise<FeedbackTemplate> {
        const response = await apiClient.put<FeedbackTemplate>(`/feedback/templates/${id}`, data);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update template');
        }
        return response.data;
    }

    /**
     * Delete a template (Admin)
     */
    async deleteTemplate(id: string): Promise<void> {
        const response = await apiClient.delete(`/feedback/templates/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete template');
        }
    }

    // ============================
    // SUBMISSIONS
    // ============================

    /**
     * Submit feedback for a process
     */
    async submitFeedback(data: SubmitFeedbackData): Promise<ProcessFeedback> {
        const response = await apiClient.post<ProcessFeedback>('/feedback', data);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to submit feedback');
        }
        return response.data;
    }

    /**
     * Get all submitted feedback (Admin)
     */
    async getAllFeedback(): Promise<ProcessFeedback[]> {
        const response = await apiClient.get<ProcessFeedback[]>('/feedback');
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch feedback list');
        }
        return response.data;
    }

    /**
     * Get feedback for a specific process (Admin/Manager)
     */
    async getFeedbackForProcess(processId: string): Promise<ProcessFeedback[]> {
        const response = await apiClient.get<ProcessFeedback[]>(`/processes/${processId}/feedback`);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch process feedback');
        }
        return response.data;
    }

    /**
     * Get specific feedback details
     */
    async getFeedbackDetails(id: string): Promise<ProcessFeedback> {
        const response = await apiClient.get<ProcessFeedback>(`/feedback/${id}`);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch feedback details');
        }
        return response.data;
    }

    /**
     * Update feedback status (Admin/Manager)
     */
    async updateFeedbackStatus(id: string, data: UpdateFeedbackStatusData): Promise<ProcessFeedback> {
        const response = await apiClient.patch<ProcessFeedback>(`/feedback/${id}/status`, data);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to update feedback status');
        }
        return response.data;
    }
}

export const FeedbackResource = new FeedbackResourceClass();
