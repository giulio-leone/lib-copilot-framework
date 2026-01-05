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

// =====================================================
// Types
// =====================================================

export type {
  McpTool,
  McpContext,
  McpResponse,
  McpSuccessResponse,
  McpErrorResponse,
  McpHandler,
  McpTextChunk,
  CopilotDomain,
  BatchResult,
} from './types';

export {
  getEffectiveUserId,
  isDomain,
  getDomainContext,
} from './types';

// =====================================================
// Core Framework
// =====================================================

export {
  // Agentic Framework
  createAgenticTool,
  type AgenticToolConfig,
  type AgenticActionHandler,

  // CRUD Framework
  createCrudTool,
  type CrudToolConfig,
  type CrudOperations,

  // Schema Builders
  createTargetSchema,
  SetGroupSchema,
  MacrosSchema,
  generateId,
  type TargetSchemaOptions,

  // Response Helpers
  successResult,
  errorResult,
  safeExecute,
  type ModificationResult,

  // Fuzzy Matching
  fuzzyMatch,
  fuzzyFindIndex,
  fuzzyFind,
  fuzzyFindAll,
} from './core';
