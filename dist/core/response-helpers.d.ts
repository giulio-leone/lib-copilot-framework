/**
 * Response Helpers
 *
 * Standardized response structures for modification tools.
 * Ensures consistent API across all domains.
 *
 * @module lib-mcp-server/tools/shared/response-helpers
 */
/**
 * Standard result from a modification operation
 */
export interface ModificationResult<T = unknown> {
    /** Whether the operation succeeded */
    success: boolean;
    /** Human-readable message describing the result */
    message: string;
    /** The updated entity (if applicable) */
    updated?: T;
    /** Number of items affected */
    affectedCount?: number;
    /** Error message if success is false */
    error?: string;
}
/**
 * Creates a successful modification result
 *
 * @param message - Description of what was modified
 * @param updated - The updated entity
 * @param affectedCount - Number of items affected
 */
export declare function successResult<T>(message: string, updated?: T, affectedCount?: number): ModificationResult<T>;
/**
 * Creates an error modification result
 *
 * @param error - Error message or Error object
 */
export declare function errorResult(error: string | Error): ModificationResult;
/**
 * Wraps an async operation with error handling
 *
 * @param operation - The async operation to execute
 * @returns ModificationResult with success or error
 *
 * @example
 * ```typescript
 * const result = await safeExecute(async () => {
 *   await updateMeal(mealId, changes);
 *   return successResult('Meal updated');
 * });
 * ```
 */
export declare function safeExecute<T = unknown>(operation: () => Promise<ModificationResult<T>>): Promise<ModificationResult<T>>;
//# sourceMappingURL=response-helpers.d.ts.map