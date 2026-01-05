/**
 * Agentic Framework
 *
 * A factory-based framework for creating AI-driven modification tools.
 * Extends the Copilot CRUD Framework with support for granular,
 * action/target/changes patterns used by modification agents.
 *
 * @module lib-mcp-server/tools/shared/agentic-framework
 *
 * @example
 * ```typescript
 * const workoutTool = createAgenticTool({
 *   name: 'workout_apply_modification',
 *   domain: 'workout',
 *   description: 'Applies modifications to workout programs',
 *   entityIdField: 'programId',
 *   resolveEntity: async (id) => prisma.workout_programs.findUnique({ where: { id } }),
 *   saveEntity: async (id, entity) => prisma.workout_programs.update({ where: { id }, data: entity }),
 *   actions: {
 *     update_setgroup: {
 *       description: 'Update a setgroup',
 *       targetSchema: z.object({ exerciseIndex: z.number(), setgroupIndex: z.number() }),
 *       changesSchema: z.object({ count: z.number().optional(), reps: z.number().optional() }),
 *       execute: (entity, target, changes, ctx) => { ... }
 *     }
 *   }
 * });
 * ```
 */
import { z } from 'zod';
import type { McpTool, McpContext } from '../types';
/**
 * Handler for a single agentic action (e.g., update_setgroup, add_exercise).
 * Returns either a modified entity or void (for in-place mutations).
 */
export interface AgenticActionHandler<TEntity, TTarget = unknown, TChanges = unknown> {
    /** Human-readable description for AI guidance */
    description: string;
    /** Zod schema for the target parameter */
    targetSchema: z.ZodSchema<TTarget>;
    /** Zod schema for the changes parameter (optional for some actions) */
    changesSchema?: z.ZodSchema<TChanges>;
    /** Schema for newData (for add actions) */
    newDataSchema?: z.ZodSchema;
    /**
     * Execute the action on the entity.
     * Can mutate entity in-place or return a new entity.
     * Return value is used as modified entity if truthy.
     */
    execute: (entity: TEntity, params: {
        target: TTarget;
        changes?: TChanges;
        newData?: unknown;
    }, context: McpContext) => TEntity | void | Promise<TEntity | void>;
}
/**
 * Configuration for creating an agentic tool.
 */
export interface AgenticToolConfig<TEntity> {
    /** Tool name (e.g., 'workout_apply_modification') */
    name: string;
    /** Domain identifier for logging and context */
    domain: string;
    /** Tool description for AI guidance */
    description: string;
    /** Field name for the entity ID parameter (e.g., 'programId', 'planId') */
    entityIdField: string;
    /** Fetch the entity by ID */
    resolveEntity: (id: string, context: McpContext) => Promise<TEntity | null>;
    /** Save the modified entity */
    saveEntity: (id: string, entity: TEntity, context: McpContext) => Promise<void>;
    /** Registry of action handlers */
    actions: Record<string, AgenticActionHandler<TEntity>>;
    /** Whether batch operations are supported (default: true) */
    batchSupported?: boolean;
    /** Optional pre-save hook */
    beforeSave?: (entity: TEntity, context: McpContext) => Promise<TEntity> | TEntity;
    /** Optional post-save hook */
    afterSave?: (entity: TEntity, context: McpContext) => void | Promise<void>;
    /** Optional validation before action execution */
    validateEntity?: (entity: TEntity) => boolean | string;
}
/**
 * Single modification item for batch operations.
 */
export interface ModificationItem {
    action: string;
    target?: Record<string, unknown>;
    changes?: Record<string, unknown>;
    newData?: Record<string, unknown>;
}
/**
 * Creates an agentic modification tool from configuration.
 *
 * @param config - Tool configuration
 * @returns McpTool ready for registration
 */
export declare function createAgenticTool<TEntity extends object>(config: AgenticToolConfig<TEntity>): McpTool;
/**
 * Shorthand for creating action handlers with inferred types.
 */
export declare function defineAction<TEntity, TTarget, TChanges = never>(handler: AgenticActionHandler<TEntity, TTarget, TChanges>): AgenticActionHandler<TEntity, TTarget, TChanges>;
/**
 * Type helper for extracting entity type from tool config.
 */
export type EntityOf<T> = T extends AgenticToolConfig<infer E> ? E : never;
//# sourceMappingURL=agentic-framework.d.ts.map