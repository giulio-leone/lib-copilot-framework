/**
 * @onecoach/lib-copilot-framework
 *
 * Copilot Framework - Agentic tool factories and utilities for AI-driven operations.
 *
 * @example
 * ```typescript
 * import { createAgenticTool, createCrudTool, McpTool, McpContext } from '@onecoach/lib-copilot-framework';
 *
 * const myTool = createAgenticTool({
 *   name: 'my_tool',
 *   domain: 'mydomain',
 *   // ...
 * });
 * ```
 */
export type { McpTool, McpContext, McpResponse, McpSuccessResponse, McpErrorResponse, McpHandler, McpTextChunk, CopilotDomain, BatchResult, } from './types';
export { getEffectiveUserId, isDomain, getDomainContext, } from './types';
export { createAgenticTool, type AgenticToolConfig, type AgenticActionHandler, createCrudTool, type CrudToolConfig, type CrudOperations, createTargetSchema, SetGroupSchema, MacrosSchema, generateId, type TargetSchemaOptions, successResult, errorResult, safeExecute, type ModificationResult, fuzzyMatch, fuzzyFindIndex, fuzzyFind, fuzzyFindAll, } from './core';
//# sourceMappingURL=index.d.ts.map