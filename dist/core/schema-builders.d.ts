/**
 * Schema Builders
 *
 * Reusable Zod schema builders for common patterns across all domains.
 * Provides consistent structure for targets, changes, and batch operations.
 *
 * @module lib-mcp-server/tools/shared/schema-builders
 */
import { z } from 'zod';
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
export declare function createTargetSchema(options?: TargetSchemaOptions): z.ZodObject<Record<string, z.ZodTypeAny>, "strip", z.ZodTypeAny, {
    [x: string]: any;
}, {
    [x: string]: any;
}>;
/**
 * Creates a pair of fields for range values (min/max pattern).
 *
 * @example
 * ```typescript
 * const repFields = createRangeFields('reps', z.number().int().positive());
 * // { reps: z.number().optional(), repsMax: z.number().optional() }
 * ```
 */
export declare function createRangeFields<T extends z.ZodTypeAny>(baseName: string, schema: T, description?: string): z.ZodRawShape;
/**
 * Standard set field schema used by workout domain.
 * Includes reps, weight, intensity, RPE, rest, duration with range support.
 */
export declare const SetFieldsSchema: z.ZodObject<{
    reps: z.ZodOptional<z.ZodNumber>;
    repsMax: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    weightMax: z.ZodOptional<z.ZodNumber>;
    weightLbs: z.ZodOptional<z.ZodNumber>;
    intensityPercent: z.ZodOptional<z.ZodNumber>;
    intensityPercentMax: z.ZodOptional<z.ZodNumber>;
    rpe: z.ZodOptional<z.ZodNumber>;
    rpeMax: z.ZodOptional<z.ZodNumber>;
    rest: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reps?: number | undefined;
    repsMax?: number | undefined;
    duration?: number | undefined;
    weight?: number | undefined;
    weightMax?: number | undefined;
    weightLbs?: number | undefined;
    intensityPercent?: number | undefined;
    intensityPercentMax?: number | undefined;
    rpe?: number | undefined;
    rpeMax?: number | undefined;
    rest?: number | undefined;
}, {
    reps?: number | undefined;
    repsMax?: number | undefined;
    duration?: number | undefined;
    weight?: number | undefined;
    weightMax?: number | undefined;
    weightLbs?: number | undefined;
    intensityPercent?: number | undefined;
    intensityPercentMax?: number | undefined;
    rpe?: number | undefined;
    rpeMax?: number | undefined;
    rest?: number | undefined;
}>;
/**
 * SetGroup schema (extends set fields with count).
 */
export declare const SetGroupSchema: z.ZodObject<{
    reps: z.ZodOptional<z.ZodNumber>;
    repsMax: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    weightMax: z.ZodOptional<z.ZodNumber>;
    weightLbs: z.ZodOptional<z.ZodNumber>;
    intensityPercent: z.ZodOptional<z.ZodNumber>;
    intensityPercentMax: z.ZodOptional<z.ZodNumber>;
    rpe: z.ZodOptional<z.ZodNumber>;
    rpeMax: z.ZodOptional<z.ZodNumber>;
    rest: z.ZodOptional<z.ZodNumber>;
} & {
    count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reps?: number | undefined;
    repsMax?: number | undefined;
    duration?: number | undefined;
    weight?: number | undefined;
    weightMax?: number | undefined;
    weightLbs?: number | undefined;
    intensityPercent?: number | undefined;
    intensityPercentMax?: number | undefined;
    rpe?: number | undefined;
    rpeMax?: number | undefined;
    rest?: number | undefined;
    count?: number | undefined;
}, {
    reps?: number | undefined;
    repsMax?: number | undefined;
    duration?: number | undefined;
    weight?: number | undefined;
    weightMax?: number | undefined;
    weightLbs?: number | undefined;
    intensityPercent?: number | undefined;
    intensityPercentMax?: number | undefined;
    rpe?: number | undefined;
    rpeMax?: number | undefined;
    rest?: number | undefined;
    count?: number | undefined;
}>;
/**
 * Macro nutrients schema used by nutrition domain.
 */
export declare const MacrosSchema: z.ZodObject<{
    calories: z.ZodOptional<z.ZodNumber>;
    protein: z.ZodOptional<z.ZodNumber>;
    carbs: z.ZodOptional<z.ZodNumber>;
    fat: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    calories?: number | undefined;
    protein?: number | undefined;
    carbs?: number | undefined;
    fat?: number | undefined;
}, {
    calories?: number | undefined;
    protein?: number | undefined;
    carbs?: number | undefined;
    fat?: number | undefined;
}>;
/**
 * Common status enum for agenda/project entities.
 */
export declare const StatusSchema: z.ZodEnum<["TODO", "IN_PROGRESS", "COMPLETED", "ARCHIVED", "ON_HOLD", "ACTIVE", "DRAFT", "PAUSED"]>;
/**
 * Common priority enum.
 */
export declare const PrioritySchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
/**
 * Wraps a single modification schema into a batch-capable schema.
 *
 * @example
 * ```typescript
 * const batchSchema = createBatchSchema(singleModSchema);
 * // Adds `batch?: Array<SingleModification>` field
 * ```
 */
export declare function createBatchSchema<T extends z.ZodTypeAny>(singleModificationSchema: T): z.ZodObject<{
    batch: z.ZodOptional<z.ZodArray<T>>;
}>;
/**
 * Creates a refinement that requires at least one field in changes for update actions.
 */
export declare function requireChangesForUpdate<T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.ZodEffects<z.ZodObject<T, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<T> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_3 ? { [k in keyof T_3]: T_3[k]; } : never, z.baseObjectInputType<T> extends infer T_4 ? { [k_1 in keyof T_4]: T_4[k_1]; } : never>;
/**
 * Generates a unique ID for new entities.
 */
export declare function generateId(prefix?: string): string;
//# sourceMappingURL=schema-builders.d.ts.map