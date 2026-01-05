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
import { type ModificationResult } from './response-helpers';
/** Standard CRUD operations */
export declare const CrudOperations: readonly ["create", "read", "update", "delete"];
export type CrudOperation = typeof CrudOperations[number];
/**
 * Handler function for a CRUD operation
 */
export type CrudHandler<TResult = unknown> = (args: Record<string, unknown>, context: McpContext) => Promise<ModificationResult<TResult>>;
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
/**
 * Creates a CRUD tool from configuration.
 *
 * @param config - The tool configuration
 * @returns An McpTool ready for registration
 */
export declare function createCrudTool<TOperations extends readonly CrudOperation[]>(config: CrudToolConfig<TOperations>): McpTool;
/**
 * Common ID parameter schema
 */
export declare const IdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * Common pagination schema
 */
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
/**
 * Common status values
 */
export declare const CommonStatusSchema: z.ZodEnum<["ACTIVE", "COMPLETED", "ARCHIVED", "DRAFT", "PAUSED"]>;
/**
 * Common priority values
 */
export declare const CommonPrioritySchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
/**
 * Base target schema with fuzzy matching support
 */
export declare const BaseTargetSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodNumber>;
    name: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    id?: string | undefined;
    index?: number | undefined;
}, {
    name?: string | undefined;
    id?: string | undefined;
    index?: number | undefined;
}>;
//# sourceMappingURL=copilot-crud-framework.d.ts.map