/**
 * Schema Builders
 *
 * Reusable Zod schema builders for common patterns across all domains.
 * Provides consistent structure for targets, changes, and batch operations.
 *
 * @module lib-mcp-server/tools/shared/schema-builders
 */

import { z } from 'zod';

// =====================================================
// Target Schema Builders
// =====================================================

/**
 * Options for creating a hierarchical target schema.
 */
export interface TargetSchemaOptions {
  /** Include week index (default: false) */
  week?: boolean;
  /** Include day index (default: false) */
  day?: boolean;
  /** Primary item field name (e.g., 'exercise', 'meal', 'task') */
  itemField?: string;
  /** Secondary item field name (e.g., 'setgroup', 'food') */
  subItemField?: string;
  /** Additional custom fields */
  customFields?: z.ZodRawShape;
}

/**
 * Creates a target schema for hierarchical entity targeting.
 *
 * @example
 * ```typescript
 * const workoutTargetSchema = createTargetSchema({
 *   week: true,
 *   day: true,
 *   itemField: 'exercise',
 *   subItemField: 'setgroup'
 * });
 * // { weekIndex?, dayIndex?, exerciseIndex?, exerciseName?, setgroupIndex? }
 * ```
 */
export function createTargetSchema(options: TargetSchemaOptions = {}) {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (options.week) {
    shape['weekIndex'] = z.number().int().min(0).optional().describe('Week index (0-based)');
  }

  if (options.day) {
    shape['dayIndex'] = z.number().int().min(0).optional().describe('Day index (0-based)');
  }

  if (options.itemField) {
    const field = options.itemField;
    shape[`${field}Index`] = z.number().int().min(0).optional().describe(`${field} index (0-based)`);
    shape[`${field}Name`] = z.string().optional().describe(`${field} name for fuzzy matching`);
  }

  if (options.subItemField) {
    const field = options.subItemField;
    shape[`${field}Index`] = z.number().int().min(0).optional().describe(`${field} index (0-based)`);
  }

  // Add custom fields
  if (options.customFields) {
    Object.assign(shape, options.customFields);
  }

  return z.object(shape);
}

// =====================================================
// Range Field Builders
// =====================================================

/**
 * Creates a pair of fields for range values (min/max pattern).
 *
 * @example
 * ```typescript
 * const repFields = createRangeFields('reps', z.number().int().positive());
 * // { reps: z.number().optional(), repsMax: z.number().optional() }
 * ```
 */
export function createRangeFields<T extends z.ZodTypeAny>(
  baseName: string,
  schema: T,
  description?: string
): z.ZodRawShape {
  const desc = description || baseName;
  return {
    [baseName]: schema.optional().describe(`${desc} (min value for ranges)`),
    [`${baseName}Max`]: schema.optional().describe(`${desc} max value for ranges`),
  };
}

// =====================================================
// Common Schemas (Reusable across domains)
// =====================================================

/**
 * Standard set field schema used by workout domain.
 * Includes reps, weight, intensity, RPE, rest, duration with range support.
 */
export const SetFieldsSchema = z.object({
  // Reps (with range)
  reps: z.number().int().positive().optional().describe('Repetitions per set'),
  repsMax: z.number().int().positive().optional().describe('Max reps for rep ranges (e.g., 8-12)'),

  // Duration
  duration: z.number().positive().optional().describe('Duration in seconds'),

  // Weight (with range)
  weight: z.number().nonnegative().optional().describe('Weight in kg'),
  weightMax: z.number().nonnegative().optional().describe('Max weight for ranges'),
  weightLbs: z.number().nonnegative().optional().describe('Weight in lbs (auto-calc)'),

  // Intensity (with range)
  intensityPercent: z.number().min(0).max(100).optional().describe('Intensity as % of 1RM'),
  intensityPercentMax: z.number().min(0).max(100).optional().describe('Max intensity %'),

  // RPE (with range)
  rpe: z.number().min(1).max(10).optional().describe('RPE 1-10'),
  rpeMax: z.number().min(1).max(10).optional().describe('Max RPE for ranges'),

  // Rest
  rest: z.number().int().positive().optional().describe('Rest time in seconds'),
});

/**
 * SetGroup schema (extends set fields with count).
 */
export const SetGroupSchema = SetFieldsSchema.extend({
  count: z.number().int().positive().optional().describe('Number of sets'),
});

/**
 * Macro nutrients schema used by nutrition domain.
 */
export const MacrosSchema = z.object({
  calories: z.number().nonnegative().optional().describe('Calories'),
  protein: z.number().nonnegative().optional().describe('Protein in grams'),
  carbs: z.number().nonnegative().optional().describe('Carbohydrates in grams'),
  fat: z.number().nonnegative().optional().describe('Fat in grams'),
});

/**
 * Common status enum for agenda/project entities.
 */
export const StatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED',
  'ON_HOLD',
  'ACTIVE',
  'DRAFT',
  'PAUSED',
]);

/**
 * Common priority enum.
 */
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// =====================================================
// Batch Schema Builder
// =====================================================

/**
 * Wraps a single modification schema into a batch-capable schema.
 *
 * @example
 * ```typescript
 * const batchSchema = createBatchSchema(singleModSchema);
 * // Adds `batch?: Array<SingleModification>` field
 * ```
 */
export function createBatchSchema<T extends z.ZodTypeAny>(
  singleModificationSchema: T
): z.ZodObject<{ batch: z.ZodOptional<z.ZodArray<T>> }> {
  return z.object({
    batch: z.array(singleModificationSchema).optional().describe('Array of modifications for batch operations'),
  });
}

// =====================================================
// Validation Helpers
// =====================================================

/**
 * Creates a refinement that requires at least one field in changes for update actions.
 */
export function requireChangesForUpdate<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.refine(
    (data) => {
      const action = (data as Record<string, unknown>).action as string | undefined;
      const changes = (data as Record<string, unknown>).changes as Record<string, unknown> | undefined;
      if (action?.startsWith('update_')) {
        return changes && Object.keys(changes).length > 0;
      }
      return true;
    },
    { message: 'For update actions, you MUST provide at least one field in "changes"' }
  );
}

// =====================================================
// ID Generators
// =====================================================

/**
 * Generates a unique ID for new entities.
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
