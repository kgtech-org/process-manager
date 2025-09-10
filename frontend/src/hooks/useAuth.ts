import { useAuth as useAuthContext } from '@/contexts/auth.context';

// Re-export auth context hook for convenience
export { useAuthContext as useAuth };

// Export auth context and provider
export { AuthProvider } from '@/contexts/auth.context';