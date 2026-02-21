/**
 * Macro Recalculator Service
 *
 * Automatic macro recalculation when a food item is modified,
 * maintaining the plan's target macros.
 *
 * Refactored to use Vercel AI SDK (streamText + Output.object)
 * and decoupled from lib-ai-agents.
 */

import { createModel, getModelByTier } from '@onecoach/lib-ai';
import type { ModelTier } from '@onecoach/lib-ai';
import { NutritionDaySchema } from '@onecoach/schemas';
import type {
  NutritionPlan,
  NutritionDay,
  NutritionWeek,
  Food,
  Meal,
  Macros,
} from '@onecoach/types';
import { normalizeAgentPayload } from '@onecoach/one-nutrition';
import { streamText, Output } from 'ai';

// System prompt optimized for recalculation
const RECALCULATOR_SYSTEM_PROMPT = `You are a specialized nutrition macro recalculator.
Your task is to adjust the foods in a day to match target macros while preserving a specific modified food.
You have expert knowledge of food composition, meal structure, and dietary preferences.`;

export interface RecalculateRequest {
  plan: NutritionPlan;
  dayNumber: number;
  modifiedFoodId: string;
  modifiedFood: Food;
  userId: string;
  tier?: ModelTier;
  providerApiKey?: string;
}

export interface RecalculateResult {
  success: boolean;
  plan?: NutritionPlan;
  error?: string;
}

/**
 * Calculates total macros for a day
 */
function calculateDayMacros(day: NutritionDay): Macros {
  return day.meals.reduce(
    (acc: Macros, meal: Meal): Macros => ({
      calories: acc.calories + meal.totalMacros.calories,
      protein: acc.protein + meal.totalMacros.protein,
      carbs: acc.carbs + meal.totalMacros.carbs,
      fats: acc.fats + meal.totalMacros.fats,
      fiber: (acc.fiber || 0) + (meal.totalMacros.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );
}

/**
 * Calculates difference between current and target macros
 */
function calculateMacroDifference(current: Macros, target: Macros): Macros {
  return {
    calories: target.calories - current.calories,
    protein: target.protein - current.protein,
    carbs: target.carbs - current.carbs,
    fats: target.fats - current.fats,
    fiber: (target.fiber || 0) - (current.fiber || 0),
  };
}

/**
 * Builds the prompt for macro recalculation
 */
function buildRecalculatePrompt(
  plan: NutritionPlan,
  day: NutritionDay,
  modifiedFood: Food,
  macroDifference: Macros
): string {
  const restrictions = plan.restrictions?.length ? plan.restrictions.join(', ') : 'none';
  const preferences = plan.preferences?.length ? plan.preferences.join(', ') : 'none';

  return `User has modified a food in their nutrition plan. Adjust OTHER foods in the day to maintain target macros.

IMPORTANT: You MUST keep the modified food EXACTLY as provided. Do NOT change it.

Current Plan Context:
- Goals: ${plan.goals?.join(', ') || 'N/A'}
- Target Macros (daily): ${plan.targetMacros.calories} kcal, ${plan.targetMacros.protein}g protein, ${plan.targetMacros.carbs}g carbs, ${plan.targetMacros.fats}g fats
- Restrictions: ${restrictions}
- Preferences: ${preferences}

Modified Food (DO NOT CHANGE):
- Name: ${modifiedFood.name || 'N/A'}
- Quantity: ${modifiedFood.quantity}${modifiedFood.unit || 'g'}
- Macros: ${modifiedFood.macros ? `${modifiedFood.macros.calories} kcal, ${modifiedFood.macros.protein}g P, ${modifiedFood.macros.carbs}g C, ${modifiedFood.macros.fats}g F` : 'N/A'}

Current Day Structure:
${JSON.stringify(day, null, 2)}

Macro Difference to Compensate:
- Calories: ${macroDifference.calories.toFixed(1)} kcal
- Protein: ${macroDifference.protein.toFixed(1)}g
- Carbs: ${macroDifference.carbs.toFixed(1)}g
- Fats: ${macroDifference.fats.toFixed(1)}g

Task:
1. Keep the modified food EXACTLY as provided.
2. Adjust OTHER foods to compensate for the difference.
3. Modify quantities or add/remove foods as needed.
4. Ensure final daily totals match target macros within ±5%.
5. Respect restrictions and preferences.

Return the complete day structure.`;
}

/**
 * Recalculates macros for a day after a food modification
 */
export async function recalculateMacrosForDay(
  request: RecalculateRequest
): Promise<RecalculateResult> {
  try {
    const {
      plan,
      dayNumber,
      modifiedFoodId,
      modifiedFood,
      tier = 'balanced',
      providerApiKey,
    } = request;

    // Helper to find the day
    const { getNutritionPlanDay } = await import('@onecoach/lib-shared');
    const day = getNutritionPlanDay(plan, dayNumber);

    if (!day) {
      return {
        success: false,
        error: `Day ${dayNumber} not found in plan`,
      };
    }

    // Calculate current macros
    const currentDayMacros = calculateDayMacros(day);
    const targetMacros = plan.targetMacros;

    // Calculate difference
    const macroDifference = calculateMacroDifference(currentDayMacros, targetMacros);

    // Check tolerance (±5%)
    const tolerance = 0.05;
    const caloriesDiff = Math.abs(macroDifference.calories) / targetMacros.calories;
    const proteinDiff = Math.abs(macroDifference.protein) / targetMacros.protein;
    const carbsDiff = Math.abs(macroDifference.carbs) / targetMacros.carbs;
    const fatsDiff = Math.abs(macroDifference.fats) / targetMacros.fats;

    if (
      caloriesDiff <= tolerance &&
      proteinDiff <= tolerance &&
      carbsDiff <= tolerance &&
      fatsDiff <= tolerance
    ) {
      return { success: true, plan };
    }

    // Prepare Prompt
    const prompt = buildRecalculatePrompt(plan, day, modifiedFood, macroDifference);

    // AI Configuration
    const modelConfig = await getModelByTier(tier);
    const apiKey = providerApiKey || process.env.OPENROUTER_API_KEY || '';
    const model = createModel(modelConfig, apiKey);

    // Generate response using Vercel AI SDK
    const streamResult = streamText({
      model,
      output: Output.object({
        schema: NutritionDaySchema,
      }),
      prompt: `${RECALCULATOR_SYSTEM_PROMPT}\n\n${prompt}`,
    });

    // Consume stream (required for AI SDK v6+)
    for await (const _partial of streamResult.partialOutputStream) {
      // no-op, just consuming the stream
    }

    const completeObject = await streamResult.output;

    if (!completeObject) {
      throw new Error('Failed to generate recalculated day');
    }

    // Validate and use output
    // NutritionDaySchema ensures structure, but we cast to NutritionDay generic type
    const recalculatedDayData = completeObject as NutritionDay;

    // Normalize to ensure safe types if needed
    // Create temp plan structure for normalization
    const tempPlan = normalizeAgentPayload(
      {
        weeks: [
          {
            weekNumber: 1,
            days: [recalculatedDayData],
          },
        ],
      },
      { ...plan }
    );

    const recalculatedDay = tempPlan.weeks[0]?.days?.find(
      (d: NutritionDay) => d.dayNumber === dayNumber
    );

    if (!recalculatedDay) {
      return {
        success: false,
        error: 'Failed to normalize recalculated day',
      };
    }

    // Verify modified food is preserved
    const recalculatedDayFoods = recalculatedDay.meals.flatMap((m: Meal) => m.foods);
    const modifiedFoodStillPresent = recalculatedDayFoods.find(
      (f: Food) =>
        f.id === modifiedFoodId ||
        (modifiedFood.foodItemId && f.foodItemId === modifiedFood.foodItemId)
    );

    if (!modifiedFoodStillPresent) {
      return {
        success: false,
        error: 'Modified food was lost during recalculation',
      };
    }

    // Verify quantity preservation
    const quantityMatches =
      Math.abs(modifiedFoodStillPresent.quantity - modifiedFood.quantity) < 0.1;
    if (!quantityMatches) {
      return {
        success: false,
        error: 'Modified food quantity was altered during recalculation',
      };
    }

    // Update plan with new day
    const updatedWeeks: NutritionWeek[] = plan.weeks.map((week: NutritionWeek) => ({
      ...week,
      days: week.days.map((d: NutritionDay) => (d.dayNumber === dayNumber ? recalculatedDay : d)),
    }));

    const updatedPlan: NutritionPlan = {
      ...plan,
      weeks: updatedWeeks,
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      plan: updatedPlan,
    };
  } catch (error: unknown) {
    console.error('[MacroRecalculator] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during recalculation',
    };
  }
}
