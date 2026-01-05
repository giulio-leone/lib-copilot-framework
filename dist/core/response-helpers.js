/**
 * Response Helpers
 *
 * Standardized response structures for modification tools.
 * Ensures consistent API across all domains.
 *
 * @module lib-mcp-server/tools/shared/response-helpers
 */
/**
 * Creates a successful modification result
 *
 * @param message - Description of what was modified
 * @param updated - The updated entity
 * @param affectedCount - Number of items affected
 */
export function successResult(message, updated, affectedCount) {
    return {
        success: true,
        message,
        updated,
        affectedCount,
    };
}
/**
 * Creates an error modification result
 *
 * @param error - Error message or Error object
 */
export function errorResult(error) {
    return {
        success: false,
        message: 'Modification failed',
        error: typeof error === 'string' ? error : error.message,
    };
}
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
export async function safeExecute(operation) {
    try {
        return await operation();
    }
    catch (error) {
        return errorResult(error instanceof Error ? error : String(error));
    }
}
//# sourceMappingURL=response-helpers.js.map