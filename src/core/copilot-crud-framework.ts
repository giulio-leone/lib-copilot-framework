/**
 * Copilot CRUD Framework
 * 
 * A factory-based framework for creating AI-driven CRUD tools.
 * Supports create, read, update, delete, and batch operations across all domains.
 * 
 * @module lib-mcp-server/tools/shared/copilot-crud-framework
 * 
 * @example
 * ```typescript
 * const myTool = createCrudTool({
 *   name: 'my_domain_crud',
 *   domain: 'my_domain',
 *   operations: ['create', 'read', 'update', 'delete'] as const,
 *   batchSupported: true,
 *   handlers: {
 *     create: async (args, context) => ({ success: true, message: 'Created' }),
 *     update: async (args, context) => ({ success: true, message: 'Updated' }),
 *     delete: async (args, context) => ({ success: true, message: 'Deleted' }),
 *     read: async (args, context) => ({ success: true, data: {...} }),
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

/** Standard CRUD operations */
export const CrudOperations = ['create', 'read', 'update', 'delete'] as const;
export type CrudOperation = typeof CrudOperations[number];

/**
 * Handler function for a CRUD operation
 */
export type CrudHandler<TResult = unknown> = (
  args: Record<string, unknown>,
  context: McpContext
) => Promise<ModificationResult<TResult>>;

/**
 * Batch operation item
 */
export interface BatchOperationItem {
  operation: CrudOperation;
  target?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/**
 * Configuration for creating a CRUD tool
 */
export interface CrudToolConfig<TOperations extends readonly CrudOperation[]> {
  /** Tool name (e.g., 'nutrition_crud') */
  name: string;
  
  /** Domain identifier (e.g., 'nutrition', 'workout') */
  domain: string;
  
  /** Tool description for AI */
  description: string;
  
  /** Enabled operations */
  operations: TOperations;
  
  /** Parameter schemas per operation */
  schemas: {
    [K in TOperations[number]]?: z.ZodSchema;
  };
  
  /** Common parameters for all operations */
  commonParams?: z.ZodRawShape;
  
  /** Whether batch operations are supported */
  batchSupported?: boolean;
  
  /** Handler functions per operation */
  handlers: {
    [K in TOperations[number]]: CrudHandler;
  };
}

// =====================================================
// Factory Function
// =====================================================

/**
 * Creates a CRUD tool from configuration.
 * 
 * @param config - The tool configuration
 * @returns An McpTool ready for registration
 */
export function createCrudTool<TOperations extends readonly CrudOperation[]>(
  config: CrudToolConfig<TOperations>
): McpTool {
  const {
    name,
    description,
    operations,
    // schemas removed - using generic target/data instead
    commonParams = {},
    batchSupported = false,
    handlers,
  } = config;

  // Build the operation schema
  const operationSchema = z.enum(operations as [string, ...string[]]);

  // Build parameters schema - use a simple record for additional params
  const schemaShape: Record<string, z.ZodTypeAny> = {
    operation: operationSchema.describe(`Operation: ${operations.join(', ')}`),
    // Generic target and data fields instead of operation-specific
    target: z.record(z.string(), z.any()).optional().describe('Target entity identifiers'),
    data: z.record(z.string(), z.any()).optional().describe('Data for the operation'),
  };

  // Merge common params
  Object.entries(commonParams).forEach(([key, value]) => {
    schemaShape[key] = value as z.ZodTypeAny;
  });

  // Add batch support if enabled
  if (batchSupported) {
    schemaShape['batch'] = z.array(z.object({
      operation: operationSchema,
      target: z.record(z.string(), z.any()).optional(),
      data: z.record(z.string(), z.any()).optional(),
    })).optional().describe('Batch operations');
  }

  const parametersSchema = z.object(schemaShape);

  return {
    name,
    description: `${description}

Operations: ${operations.join(', ')}${batchSupported ? ', batch' : ''}`,
    parameters: parametersSchema,
    execute: async (args: Record<string, unknown>, context: McpContext): Promise<ModificationResult> => {
      const operation = args.operation as CrudOperation;
      const batch = args.batch as BatchOperationItem[] | undefined;

      // Handle batch operations
      if (batch && batch.length > 0) {
        if (!batchSupported) {
          return errorResult('Batch operations not supported for this domain');
        }
        
        const results: string[] = [];
        for (const item of batch) {
          const handler = handlers[item.operation as TOperations[number]];
          if (!handler) {
            return errorResult(`Unknown operation in batch: ${item.operation}`);
          }
          const result = await handler({ ...item.target, ...item.data }, context);
          if (!result.success) {
            return errorResult(`Batch failed at operation ${item.operation}: ${result.error}`);
          }
          results.push(result.message);
        }
        return successResult(`Batch completed: ${batch.length} operations`, { results });
      }

      // Handle single operation
      const handler = handlers[operation as TOperations[number]];
      if (!handler) {
        return errorResult(`Unknown operation: ${operation}`);
      }

      try {
        return await handler(args, context);
      } catch (error) {
        return errorResult(error instanceof Error ? error : String(error));
      }
    },
  } as McpTool;
}

// =====================================================
// Helper Schemas (Reusable across domains)
// =====================================================

/**
 * Common ID parameter schema
 */
export const IdParamSchema = z.object({
  id: z.string().describe('Entity ID'),
});

/**
 * Common pagination schema
 */
export const PaginationSchema = z.object({
  limit: z.number().int().positive().optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

/**
 * Common status values
 */
export const CommonStatusSchema = z.enum([
  'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DRAFT', 'PAUSED',
]);

/**
 * Common priority values
 */
export const CommonPrioritySchema = z.enum([
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
]);

/**
 * Base target schema with fuzzy matching support
 */
export const BaseTargetSchema = z.object({
  index: z.number().int().min(0).optional().describe('Index (0-based)'),
  name: z.string().optional().describe('Name for fuzzy matching'),
  id: z.string().optional().describe('Exact ID'),
});
