import { useState, useCallback } from 'react';
import { authService } from '@/lib/auth';
import { useAuth } from './useAuth';
import { LoginRequestData, LoginVerifyData } from '@/lib/validation';

// Login flow state
interface LoginState {
  step: number;
  email: string;
  temporaryToken: string;
  isLoading: boolean;
}

// Login hook for OTP-based authentication
export const useLogin = () => {
  const { login: authLogin } = useAuth();
  const [state, setState] = useState<LoginState>({
    step: 1,
    email: '',
    temporaryToken: '',
    isLoading: false,
  });

  // Step 1: Request OTP
  const requestOtp = useCallback(async (data: LoginRequestData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.requestLoginOtp(data);
      
      setState(prev => ({
        ...prev,
        step: 2,
        email: data.email,
        temporaryToken: response.temporaryToken,
        isLoading: false,
      }));

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Step 2: Verify OTP and login
  const verifyOtp = useCallback(async (data: LoginVerifyData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const user = await authLogin(state.email, data.otp, state.temporaryToken);
      
      // Reset state after successful login
      setState({
        step: 1,
        email: '',
        temporaryToken: '',
        isLoading: false,
      });

      return user;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [authLogin, state.email, state.temporaryToken]);

  // Go back to email step
  const goBackToEmail = useCallback(() => {
    setState(prev => ({ ...prev, step: 1, temporaryToken: '' }));
  }, []);

  // Reset login state
  const resetLogin = useCallback(() => {
    setState({
      step: 1,
      email: '',
      temporaryToken: '',
      isLoading: false,
    });
  }, []);

  return {
    ...state,
    requestOtp,
    verifyOtp,
    goBackToEmail,
    resetLogin,
  };
};