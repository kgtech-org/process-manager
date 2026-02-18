import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface PublicTask {
    code: string;
    description: string;
    order: number;
}

export interface PublicProcess {
    id: string;
    processCode: string;
    title: string;
    shortDescription: string;
    description: string;
    tasks: PublicTask[];
    pdfUrl?: string;
    order: number;
}

export interface PublicMacro {
    id: string;
    code: string;
    name: string;
    shortDescription: string;
    description: string;
    processes: PublicProcess[];
}

export interface PublicDocumentation {
    generatedAt: string;
    macros: PublicMacro[];
}

export const documentationService = {
    // Get the URL for the public documentation JSON
    getPublicDocumentationUrl: async (): Promise<string> => {
        const response = await axios.get<{ success: boolean; url: string }>(
            `${API_URL}/documentation/public-url`
        );
        return response.data.url;
    },

    // Fetch the actual documentation data
    getPublicDocumentation: async (): Promise<PublicDocumentation> => {
        try {
            // First get the URL
            const url = await documentationService.getPublicDocumentationUrl();

            // Then fetch the data from that URL (MinIO/S3)
            // Note: We use fetch here to avoid potential CORS issues with axios if MinIO isn't configured for it,
            // though typically it should be. 
            const response = await axios.get<PublicDocumentation>(url);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch public documentation:', error);
            throw error;
        }
    }
};
