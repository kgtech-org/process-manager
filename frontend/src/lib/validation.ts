import { z } from 'zod';

// Common validation rules
const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string()
  .min(8, 'Phone number must be at least 8 characters')
  .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number');
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters');
const otpSchema = z.string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// Registration Step 1 - Email Input
export const registrationStep1Schema = z.object({
  email: emailSchema,
});

export type RegistrationStep1Data = z.infer<typeof registrationStep1Schema>;

// Registration Step 2 - OTP Verification
export const registrationStep2Schema = z.object({
  otp: otpSchema,
});

export type RegistrationStep2Data = z.infer<typeof registrationStep2Schema>;

// Registration Step 3 - Profile Completion
export const registrationStep3Schema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  departmentId: z.string().min(1, 'Please select a department'),
  jobPositionId: z.string().min(1, 'Please select a job position'),
});

export type RegistrationStep3Data = z.infer<typeof registrationStep3Schema>;

// Login - OTP Request
export const loginRequestSchema = z.object({
  email: emailSchema,
});

export type LoginRequestData = z.infer<typeof loginRequestSchema>;

// Login - OTP Verification
export const loginVerifySchema = z.object({
  otp: otpSchema,
});

export type LoginVerifyData = z.infer<typeof loginVerifySchema>;

// Profile Update
export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  departmentId: z.string().optional(),
  jobPositionId: z.string().optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

// Avatar Upload - Client-side only schema
export const avatarUploadSchema = z.object({
  avatar: z.any()
    .refine((file) => typeof window !== 'undefined' && file instanceof File, 'Must be a valid file')
    .refine((file) => !file || file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => !file || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      'File must be a valid image format (JPEG, PNG, WebP)'
    ),
});

export type AvatarUploadData = z.infer<typeof avatarUploadSchema>;

// Email Verification
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type EmailVerificationData = z.infer<typeof emailVerificationSchema>;

// Form validation helpers
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  const error = errors[fieldName];
  return error?.message || error?.[0]?.message;
};

export const hasFieldError = (errors: any, fieldName: string): boolean => {
  return !!errors[fieldName];
};

// Password validation for future use
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Department validation
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Department = z.infer<typeof departmentSchema>;

// Job Position validation
export const jobPositionSchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string(),
  description: z.string().optional(),
  departmentId: z.string(),
  level: z.string(),
  requiredSkills: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type JobPosition = z.infer<typeof jobPositionSchema>;

// User validation
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user']),
  status: z.enum(['pending', 'active', 'inactive']),
  departmentId: z.string().optional(),
  jobPositionId: z.string().optional(),
  avatar: z.string().optional(),
  hasPin: z.boolean().optional(),
  emailVerified: z.boolean(),
  lastLogin: z.string().optional(),
  validatedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;