/**
 * Code generation utilities for Macro → Process → Task architecture
 */

/**
 * Generate next process code for a macro
 * @param macroCode - Macro code (e.g., "M1", "M2")
 * @param existingProcessCount - Number of existing processes in this macro
 * @returns Process code (e.g., "M1_P1", "M1_P2")
 */
export function generateProcessCode(macroCode: string, existingProcessCount: number): string {
  const nextProcessNumber = existingProcessCount + 1;
  return `${macroCode}_P${nextProcessNumber}`;
}

/**
 * Generate task code based on process code and task order
 * @param processCode - Process code (e.g., "M1_P1")
 * @param taskOrder - Task order/position (1-based)
 * @returns Task code (e.g., "M1_P1_T1", "M1_P1_T2")
 */
export function generateTaskCode(processCode: string, taskOrder: number): string {
  return `${processCode}_T${taskOrder}`;
}

/**
 * Extract macro code from process code
 * @param processCode - Process code (e.g., "M1_P5")
 * @returns Macro code (e.g., "M1") or null if invalid
 */
export function extractMacroCode(processCode: string): string | null {
  const match = processCode.match(/^(M\d+)_P\d+$/);
  return match ? match[1] : null;
}

/**
 * Extract process code from task code
 * @param taskCode - Task code (e.g., "M1_P5_T3")
 * @returns Process code (e.g., "M1_P5") or null if invalid
 */
export function extractProcessCode(taskCode: string): string | null {
  const match = taskCode.match(/^(M\d+_P\d+)_T\d+$/);
  return match ? match[1] : null;
}

/**
 * Validate macro code format
 * @param code - Code to validate
 * @returns true if valid macro code (M1, M2, etc.)
 */
export function isValidMacroCode(code: string): boolean {
  return /^M\d+$/.test(code);
}

/**
 * Validate process code format
 * @param code - Code to validate
 * @returns true if valid process code (M1_P1, M1_P2, etc.)
 */
export function isValidProcessCode(code: string): boolean {
  return /^M\d+_P\d+$/.test(code);
}

/**
 * Validate task code format
 * @param code - Code to validate
 * @returns true if valid task code (M1_P1_T1, M1_P1_T2, etc.)
 */
export function isValidTaskCode(code: string): boolean {
  return /^M\d+_P\d+_T\d+$/.test(code);
}

/**
 * Regenerate task codes based on current order
 * Used after reordering tasks via drag-and-drop
 * @param processCode - Process code (e.g., "M1_P1")
 * @param tasks - Array of tasks
 * @returns Tasks with updated codes based on order
 */
export function regenerateTaskCodes<T extends { order: number; description: string }>(
  processCode: string,
  tasks: T[]
): Array<T & { code: string }> {
  return tasks
    .sort((a, b) => a.order - b.order)
    .map((task, index) => ({
      ...task,
      code: generateTaskCode(processCode, index + 1),
      order: index + 1,
    }));
}
