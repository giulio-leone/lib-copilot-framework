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
import { successResult, errorResult } from './response-helpers';
// =====================================================
// Factory Function
// =====================================================
/**
 * Creates an agentic modification tool from configuration.
 *
 * @param config - Tool configuration
 * @returns McpTool ready for registration
 */
export function createAgenticTool(config) {
    const { name, domain, description, entityIdField, resolveEntity, saveEntity, actions, batchSupported = true, beforeSave, afterSave, validateEntity, } = config;
    // Build action enum from registered actions
    const actionNames = Object.keys(actions);
    const actionSchema = z.enum(actionNames);
    // Build unified target/changes schemas (union of all action schemas)
    const allTargetSchemas = Object.values(actions).map((a) => a.targetSchema);
    const allChangesSchemas = Object.values(actions)
        .filter((a) => a.changesSchema)
        .map((a) => a.changesSchema);
    const allNewDataSchemas = Object.values(actions)
        .filter((a) => a.newDataSchema)
        .map((a) => a.newDataSchema);
    // Create union schemas (or passthrough if empty)
    const targetUnion = allTargetSchemas.length > 1
        ? z.union(allTargetSchemas)
        : allTargetSchemas[0] ?? z.record(z.string(), z.unknown());
    const changesUnion = allChangesSchemas.length > 1
        ? z.union(allChangesSchemas)
        : allChangesSchemas[0] ?? z.record(z.string(), z.unknown());
    const newDataUnion = allNewDataSchemas.length > 1
        ? z.union(allNewDataSchemas)
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
        execute: async (args, context) => {
            const entityId = args[entityIdField];
            const batch = args.batch;
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
            const modifications = batch && batch.length > 0
                ? batch
                : args.action
                    ? [
                        {
                            action: args.action,
                            target: args.target,
                            changes: args.changes,
                            newData: args.newData,
                        },
                    ]
                    : [];
            if (modifications.length === 0) {
                return errorResult('No modification specified. Provide action+target or batch array.');
            }
            // 4. Apply modifications
            let currentEntity = entity;
            const results = [];
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
                    let changesParsed = mod.changes;
                    if (handler.changesSchema && mod.changes) {
                        const parsed = handler.changesSchema.safeParse(mod.changes);
                        if (!parsed.success) {
                            results.push(`❌ Invalid changes for ${mod.action}: ${parsed.error.message}`);
                            continue;
                        }
                        changesParsed = parsed.data;
                    }
                    // Execute handler
                    const result = await handler.execute(currentEntity, {
                        target: targetParsed.data,
                        changes: changesParsed,
                        newData: mod.newData,
                    }, context);
                    // Update entity if handler returned a new one
                    if (result !== undefined && result !== null) {
                        currentEntity = result;
                    }
                    results.push(`✅ ${mod.action} completed`);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    results.push(`❌ ${mod.action} failed: ${message}`);
                }
            }
            // 5. Apply beforeSave hook
            if (beforeSave) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                currentEntity = await beforeSave(currentEntity, context);
            }
            // 6. Save entity
            try {
                await saveEntity(entityId, currentEntity, context);
                console.log(`[MCP:${name}] 💾 Saved successfully`);
            }
            catch (error) {
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
    };
}
// =====================================================
// Helper Types for Domain Adapters
// =====================================================
/**
 * Shorthand for creating action handlers with inferred types.
 */
export function defineAction(handler) {
    return handler;
}
//# sourceMappingURL=agentic-framework.js.map