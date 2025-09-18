import { useState, useCallback } from 'react';
import { authService } from '@/lib/auth';
import {
  Department,
  JobPosition,
  RegistrationStep1Data,
  RegistrationStep2Data,
  RegistrationStep3Data,
} from '@/lib/validation';

// Registration flow state
interface RegistrationState {
  step: number;
  email: string;
  temporaryToken: string;
  registrationToken: string;
  isLoading: boolean;
  departments: Department[];
  jobPositions: JobPosition[];
  isComplete: boolean;
  userName: string;
}

// Registration hook for multi-step registration flow
export const useRegistration = () => {
  const [state, setState] = useState<RegistrationState>({
    step: 1,
    email: '',
    temporaryToken: '',
    registrationToken: '',
    isLoading: false,
    departments: [],
    jobPositions: [],
    isComplete: false,
    userName: '',
  });

  // Step 1: Send registration email
  const registerStep1 = useCallback(async (data: RegistrationStep1Data) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.registerStep1(data);
      
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

  // Step 2: Verify OTP
  const registerStep2 = useCallback(async (data: RegistrationStep2Data) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.registerStep2(data, state.temporaryToken);
      
      setState(prev => ({
        ...prev,
        step: 3,
        registrationToken: response.registrationToken,
        isLoading: false,
      }));

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.temporaryToken]);

  // Step 3: Complete registration
  const registerStep3 = useCallback(async (data: RegistrationStep3Data) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.registerStep3(data, state.registrationToken);
      
      setState(prev => ({ 
        ...prev, 
        step: 4,
        isLoading: false,
        isComplete: true,
        userName: data.name 
      }));

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.registrationToken]);

  // Load departments for step 3
  const loadDepartments = useCallback(async () => {
    try {
      const departments = await authService.getDepartments();
      setState(prev => ({ ...prev, departments }));
      return departments;
    } catch (error) {
      console.error('Failed to load departments:', error);
      throw error;
    }
  }, []);

  // Load job positions for step 3
  const loadJobPositions = useCallback(async (departmentId?: string) => {
    try {
      const jobPositions = await authService.getJobPositions(departmentId);
      setState(prev => ({ ...prev, jobPositions }));
      return jobPositions;
    } catch (error) {
      console.error('Failed to load job positions:', error);
      throw error;
    }
  }, []);

  // Go to previous step
  const goToPreviousStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }, []);

  // Reset registration state
  const resetRegistration = useCallback(() => {
    setState({
      step: 1,
      email: '',
      temporaryToken: '',
      registrationToken: '',
      isLoading: false,
      departments: [],
      jobPositions: [],
      isComplete: false,
      userName: '',
    });
  }, []);

  return {
    ...state,
    registerStep1,
    registerStep2,
    registerStep3,
    loadDepartments,
    loadJobPositions,
    goToPreviousStep,
    resetRegistration,
  };
};