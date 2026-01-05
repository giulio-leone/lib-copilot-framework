/**
 * Copilot Framework Types
 *
 * Core type definitions for MCP tools and context.
 */
// =====================================================
// Context Helpers
// =====================================================
/**
 * Get effective userId from context (priority: athleteId > clientId > userId)
 */
export function getEffectiveUserId(context) {
    return context.athleteId || context.clientId || context.userId;
}
/**
 * Check if context has specific domain
 */
export function isDomain(context, domain) {
    return context.domain === domain;
}
/**
 * Get domain-specific context
 */
export function getDomainContext(context) {
    switch (context.domain) {
        case 'nutrition':
            return context.nutrition ?? null;
        case 'workout':
            return context.workout ?? null;
        case 'exercise':
            return context.exercise ?? null;
        default:
            return null;
    }
}
//# sourceMappingURL=types.js.map