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
export { getEffectiveUserId, isDomain, getDomainContext, } from './types';
// =====================================================
// Core Framework
// =====================================================
export { 
// Agentic Framework
createAgenticTool, 
// CRUD Framework
createCrudTool, 
// Schema Builders
createTargetSchema, SetGroupSchema, MacrosSchema, generateId, 
// Response Helpers
successResult, errorResult, safeExecute, 
// Fuzzy Matching
fuzzyMatch, fuzzyFindIndex, fuzzyFind, fuzzyFindAll, } from './core';
//# sourceMappingURL=index.js.map