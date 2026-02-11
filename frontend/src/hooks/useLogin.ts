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
  hasPin: boolean;
  showPinInput: boolean;
}

// Login hook for OTP-based authentication
export const useLogin = () => {
  const { login: authLogin } = useAuth();
  const [state, setState] = useState<LoginState>({
    step: 1,
    email: '',
    temporaryToken: '',
    isLoading: false,
    hasPin: false,
    showPinInput: false,
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
        hasPin: (response as any).hasPin || false, // Use type assertion until interfaces are updated
        showPinInput: (response as any).hasPin || false,
      }));


      // Check if user has PIN
      // Note: In a real app, requestLoginOtp response might return this info
      // For now, we'll try to check it or assume false until we implement stricter check
      // But typically, we should know after step 1 if we can use PIN.
      // Let's assume for now we don't know, but we could add a check.

      // Actually, let's modify the flow:
      // When email is submitted, we request OTP. 
      // The backend should ideally tell us if user can use PIN.
      // But endpoint `request-otp` doesn't return that yet.
      // We can call `checkPinStatus` but that requires auth usually? 
      // Wait, `checkPinStatus` is protected. We can't use it before login.
      // So how do we know if user has PIN? 
      // The `request-otp` or a specific "check-email" endpoint should return public info about auth methods.
      // Since we don't have that, we might strictly use OTP for now OR 
      // Update `request-otp` to return `hasPin` flag.

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

      if (!user.hasPin) {
        // If user has no PIN, move to Step 3 (PIN Setup)
        setState(prev => ({
          ...prev,
          step: 3,
          isLoading: false,
        }));
      } else {
        // Reset state after successful login
        setState({
          step: 1,
          email: '',
          temporaryToken: '',
          isLoading: false,
          hasPin: false,
          showPinInput: false,
        });
      }

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

  const switchToOtp = useCallback(() => {
    setState(prev => ({ ...prev, showPinInput: false }));
  }, []);

  const switchToPin = useCallback(() => {
    setState(prev => ({ ...prev, showPinInput: true }));
  }, []);

  return {
    ...state,
    requestOtp,
    verifyOtp,
    goBackToEmail,
    resetLogin,
    switchToOtp,
    switchToPin,
  };
};