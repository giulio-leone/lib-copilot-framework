/**
 * Copilot Framework - Core exports
 *
 * Re-exports all utilities from core modules.
 */

// Agentic Framework
export { createAgenticTool } from './agentic-framework';
export type { AgenticToolConfig, AgenticActionHandler } from './agentic-framework';

// CRUD Framework
export { createCrudTool } from './copilot-crud-framework';
export type { CrudToolConfig, CrudOperations } from './copilot-crud-framework';

// Schema Builders
export {
  createTargetSchema,
  SetGroupSchema,
  MacrosSchema,
  generateId,
  type TargetSchemaOptions,
} from './schema-builders';

// Response Helpers
export {
  successResult,
  errorResult,
  safeExecute,
  type ModificationResult,
} from './response-helpers';

// Fuzzy Matching
export {
  fuzzyMatch,
  fuzzyFindIndex,
  fuzzyFind,
  fuzzyFindAll,
} from './fuzzy-matching';
