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
import { successResult, errorResult, type ModificationResult } from './response-helpers';

// =====================================================
// Type Definitions
// =====================================================

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
  execute: (
    entity: TEntity,
    params: {
      target: TTarget;
      changes?: TChanges;
      newData?: unknown;
    },
    context: McpContext
  ) => TEntity | void | Promise<TEntity | void>;
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

// =====================================================
// Factory Function
// =====================================================

/**
 * Creates an agentic modification tool from configuration.
 *
 * @param config - Tool configuration
 * @returns McpTool ready for registration
 */
export function createAgenticTool<TEntity extends object>(
  config: AgenticToolConfig<TEntity>
): McpTool {
  const {
    name,
    domain,
    description,
    entityIdField,
    resolveEntity,
    saveEntity,
    actions,
    batchSupported = true,
    beforeSave,
    afterSave,
    validateEntity,
  } = config;

  // Build action enum from registered actions
  const actionNames = Object.keys(actions) as [string, ...string[]];
  const actionSchema = z.enum(actionNames);

  // Build unified target/changes schemas (union of all action schemas)
  const allTargetSchemas = Object.values(actions).map((a) => a.targetSchema);
  const allChangesSchemas = Object.values(actions)
    .filter((a) => a.changesSchema)
    .map((a) => a.changesSchema!);
  const allNewDataSchemas = Object.values(actions)
    .filter((a) => a.newDataSchema)
    .map((a) => a.newDataSchema!);

  // Create union schemas (or passthrough if empty)
  const targetUnion =
    allTargetSchemas.length > 1
      ? z.union(allTargetSchemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]])
      : allTargetSchemas[0] ?? z.record(z.string(), z.unknown());

  const changesUnion =
    allChangesSchemas.length > 1
      ? z.union(allChangesSchemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]])
      : allChangesSchemas[0] ?? z.record(z.string(), z.unknown());

  const newDataUnion =
    allNewDataSchemas.length > 1
      ? z.union(allNewDataSchemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]])
      : allNewDataSchemas[0] ?? z.record(z.string(), z.unknown());

  // Build single modification schema
  const singleModificationSchema = z.object({
    action: actionSchema.describe(`Action: ${actionNames.join(', ')}`),
    target: targetUnion.optional().describe('Target location for the modification'),
    changes: changesUnion.optional().describe('Changes to apply'),
    newData: newDataUnion.optional().describe('New data for add actions'),
  });

  // Build parameters schema
  const parametersSchema = z.object({
    [entityIdField]: z.string().describe(`ID of the ${domain} entity`),
    // Single modification (backward compatible)
    action: actionSchema.optional().describe(`Action: ${actionNames.join(', ')}`),
    target: targetUnion.optional().describe('Target location'),
    changes: changesUnion.optional().describe('Changes to apply'),
    newData: newDataUnion.optional().describe('New data for add actions'),
    // Batch support
    ...(batchSupported
      ? {
          batch: z
            .array(singleModificationSchema)
            .optional()
            .describe('Array of modifications to apply in sequence'),
        }
      : {}),
  });

  // Build action descriptions for tool description
  const actionDescriptions = Object.entries(actions)
    .map(([name, handler]) => `- ${name}: ${handler.description}`)
    .join('\n');

  return {
    name,
    description: `${description}

**Supported Actions:**
${actionDescriptions}

**Targeting:**
Use indices for precise targeting or names for fuzzy matching.`,
    parameters: parametersSchema,
    execute: async (args: Record<string, unknown>, context): Promise<ModificationResult> => {
      const entityId = args[entityIdField] as string;
      const batch = args.batch as ModificationItem[] | undefined;

      console.log(`[MCP:${name}] 📥 Called:`, {
        entityId,
        action: args.action,
        hasBatch: !!batch?.length,
      });

      // 1. Fetch entity
      const entity = await resolveEntity(entityId, context);
      if (!entity) {
        return errorResult(`${domain} entity with ID ${entityId} not found`);
      }

      // 2. Validate entity if validator provided
      if (validateEntity) {
        const validation = validateEntity(entity);
        if (validation !== true) {
          return errorResult(typeof validation === 'string' ? validation : 'Entity validation failed');
        }
      }

      // 3. Build modifications list
      const modifications: ModificationItem[] =
        batch && batch.length > 0
          ? batch
          : args.action
            ? [
                {
                  action: args.action as string,
                  target: args.target as Record<string, unknown>,
                  changes: args.changes as Record<string, unknown>,
                  newData: args.newData as Record<string, unknown>,
                },
              ]
            : [];

      if (modifications.length === 0) {
        return errorResult('No modification specified. Provide action+target or batch array.');
      }

      // 4. Apply modifications
      let currentEntity = entity;
      const results: string[] = [];

      for (const mod of modifications) {
        const handler = actions[mod.action];
        if (!handler) {
          results.push(`❌ Unknown action: ${mod.action}`);
          continue;
        }

        try {
          // Validate target against action's schema
          const targetParsed = handler.targetSchema.safeParse(mod.target);
          if (!targetParsed.success) {
            results.push(`❌ Invalid target for ${mod.action}: ${targetParsed.error.message}`);
            continue;
          }

          // Validate changes if schema exists
          let changesParsed: unknown = mod.changes;
          if (handler.changesSchema && mod.changes) {
            const parsed = handler.changesSchema.safeParse(mod.changes);
            if (!parsed.success) {
              results.push(`❌ Invalid changes for ${mod.action}: ${parsed.error.message}`);
              continue;
            }
            changesParsed = parsed.data;
          }

          // Execute handler
          const result = await handler.execute(
            currentEntity,
            {
              target: targetParsed.data,
              changes: changesParsed,
              newData: mod.newData,
            },
            context
          );

          // Update entity if handler returned a new one
          if (result !== undefined && result !== null) {
            currentEntity = result;
          }

          results.push(`✅ ${mod.action} completed`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push(`❌ ${mod.action} failed: ${message}`);
        }
      }

      // 5. Apply beforeSave hook
      if (beforeSave) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentEntity = await beforeSave(currentEntity, context) as any;
      }

      // 6. Save entity
      try {
        await saveEntity(entityId, currentEntity, context);
        console.log(`[MCP:${name}] 💾 Saved successfully`);
      } catch (error) {
        console.error(`[MCP:${name}] 💥 Save failed:`, error);
        return errorResult(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 7. Apply afterSave hook
      if (afterSave) {
        await afterSave(currentEntity, context);
      }

      // 8. Return result
      const successCount = results.filter((r) => r.startsWith('✅')).length;
      const errorCount = results.filter((r) => r.startsWith('❌')).length;

      console.log(`[MCP:${name}] ✅ Complete:`, { successCount, errorCount });

      return successResult(results.join('\n'), {
        entityId,
        modificationsApplied: successCount,
        errors: errorCount,
      });
    },
  } as McpTool;
}

// =====================================================
// Helper Types for Domain Adapters
// =====================================================

/**
 * Shorthand for creating action handlers with inferred types.
 */
export function defineAction<TEntity, TTarget, TChanges = never>(
  handler: AgenticActionHandler<TEntity, TTarget, TChanges>
): AgenticActionHandler<TEntity, TTarget, TChanges> {
  return handler;
}

/**
 * Type helper for extracting entity type from tool config.
 */
export type EntityOf<T> = T extends AgenticToolConfig<infer E> ? E : never;
