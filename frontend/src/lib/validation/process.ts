import { z } from 'zod';

// Task schema
export const taskSchema = z.object({
  code: z.string().regex(/^M\d+_P\d+_T\d+$/, 'Invalid task code format'),
  description: z.string().min(1, 'Task description is required'),
  order: z.number().int().min(1, 'Order must be at least 1'),
});

export type Task = z.infer<typeof taskSchema>;

// Step 1: Macro Selection Schema
export const macroSelectionSchema = z.object({
  macroId: z.string().min(1, 'Please select a macro'),
});

export type MacroSelectionData = z.infer<typeof macroSelectionSchema>;

// Step 2: Process Information Schema
export const processInfoSchema = z.object({
  title: z.string().min(3, 'Process name must be at least 3 characters'),
  shortDescription: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  stakeholders: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export type ProcessInfoData = z.infer<typeof processInfoSchema>;

// Step 3: Tasks Schema
export const tasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        code: z.string(),
        description: z.string().min(1, 'Task description is required'),
        order: z.number().int(),
      })
    )
    .min(1, 'At least one task is required'),
});

export type TasksData = z.infer<typeof tasksSchema>;

// Complete Process Creation Schema (all steps combined)
export const createProcessSchema = z.object({
  macroId: z.string().min(1, 'Macro is required'),
  processCode: z.string().optional(),
  title: z.string().min(3, 'Process name must be at least 3 characters'),
  shortDescription: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  stakeholders: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  tasks: z
    .array(
      z.object({
        code: z.string(),
        description: z.string().min(1, 'Task description is required'),
        order: z.number().int(),
      })
    )
    .min(1, 'At least one task is required'),
  version: z.string().default('1.0'),
  reference: z.string().optional(),
});

export type CreateProcessData = z.infer<typeof createProcessSchema>;

// Predefined stakeholders/departments
export const STAKEHOLDERS = [
  'CTIO',
  'Direction Network Engineering',
  'Infrastructure IT',
  'IT Product & Project Delivery',
  'Direction Technical Business Support',
  'Direction PMO & Gouvernance',
  'DSI',
  'HRBP',
  'Cybersécurité',
  'Direction Field Operations',
  'Direction Core Operations',
  'Direction Fix Network',
] as const;

export type Stakeholder = typeof STAKEHOLDERS[number];
