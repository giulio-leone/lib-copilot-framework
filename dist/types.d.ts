/**
 * Copilot Framework Types
 *
 * Core type definitions for MCP tools and context.
 */
import { z } from 'zod';
/**
 * Domain types supported by the framework
 */
export type CopilotDomain = 'nutrition' | 'workout' | 'exercise' | 'athlete' | 'oneagenda' | 'marketplace' | 'analytics' | 'chat' | 'settings' | 'admin' | null;
/**
 * MCP Context - Extended context for all MCP tools
 */
export interface McpContext {
    userId?: string;
    coachId?: string;
    athleteId?: string;
    clientId?: string;
    isAdmin?: boolean;
    domain?: CopilotDomain;
    route?: string;
    locale?: string;
    nutrition?: {
        planId?: string | null;
        dayNumber?: number | null;
        mealIndex?: number | null;
        athleteId?: string | null;
        totalDays?: number | null;
    };
    workout?: {
        programId?: string | null;
        weekNumber?: number | null;
        dayNumber?: number | null;
        exerciseIndex?: number | null;
        setGroupIndex?: number | null;
        athleteId?: string | null;
        totalWeeks?: number | null;
        defaultWeekIndex?: number;
        defaultDayIndex?: number;
    };
    exercise?: {
        exerciseId?: string | null;
        categoryFilter?: string | null;
        muscleGroupFilter?: string | null;
        searchQuery?: string | null;
    };
    oneAgenda?: {
        projectId?: string | null;
        taskId?: string | null;
        milestoneId?: string | null;
        habitId?: string | null;
    };
    marketplace?: {
        productId?: string | null;
        categoryId?: string | null;
        affiliateCode?: string | null;
        orderId?: string | null;
    };
    analytics?: {
        athleteId?: string | null;
        dateRange?: {
            start: string;
            end: string;
        } | null;
        metricType?: 'nutrition' | 'workout' | 'progress' | 'all' | null;
    };
}
type ResolveInput<T> = unknown extends T ? unknown : T;
export type McpTextChunk = {
    type: 'text';
    text: string;
};
export interface McpSuccessResponse<T = unknown> {
    content: McpTextChunk[];
    data?: T;
    isError?: false;
}
export interface McpErrorResponse {
    content: McpTextChunk[];
    isError: true;
    code?: number;
    message?: string;
}
export type McpResponse<T = unknown> = McpSuccessResponse<T> | McpErrorResponse;
export type McpHandler<TSchema extends z.ZodTypeAny, TResult> = (args: ResolveInput<z.infer<TSchema>>, context: McpContext, signal?: AbortSignal) => Promise<TResult>;
export interface McpTool<TInput = unknown, TOutput = unknown, TSchema extends z.ZodType<TInput> = z.ZodType<TInput>> {
    name: string;
    description: string;
    parameters: TSchema;
    execute: (args: z.infer<TSchema> | Record<string, unknown>, context: McpContext) => Promise<TOutput>;
}
export interface BatchResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    id?: string;
}
/**
 * Get effective userId from context (priority: athleteId > clientId > userId)
 */
export declare function getEffectiveUserId(context: McpContext): string | undefined;
/**
 * Check if context has specific domain
 */
export declare function isDomain(context: McpContext, domain: McpContext['domain']): boolean;
/**
 * Get domain-specific context
 */
export declare function getDomainContext(context: McpContext): McpContext['nutrition'] | McpContext['workout'] | McpContext['exercise'] | null;
export {};
//# sourceMappingURL=types.d.ts.map