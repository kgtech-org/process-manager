// Export all resource classes and types
export * from './user';
export * from './department';
export * from './jobPosition';
export * from './notification';
export * from './device';
export * from './document';

// Re-export the main API client
export { apiClient, TokenManager } from '../api';