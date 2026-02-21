/**
 * Modification Service
 *
 * Centralized service for modifying nutrition plans and workout programs.
 * Handles day/week modifications with validation and atomic persistence.
 *
 * This service lives in lib-copilot-framework because it orchestrates
 * cross-domain operations (nutrition + workout).
 */

import { prisma } from '@onecoach/lib-core';
import {
  normalizeNutritionPlan,
  preparePlanForPersistence,
  normalizeAgentPayload,
} from '@onecoach/one-nutrition';
import { prepareProgramForPersistence } from '@onecoach/one-workout/program-transform';
import { normalizeWorkoutProgram } from '@onecoach/one-workout/normalizers/workout-normalizer';
import { normalizeAgentWorkoutPayload } from '@onecoach/one-workout/program-server-transform';
import type {
  NutritionPlan,
  Macros,
  Meal,
  NutritionWeek,
  NutritionDay,
  WorkoutProgram,
  WorkoutWeek,
} from '@onecoach/types';
import { createId, toPrismaJsonValue, toNullablePrismaJsonValue } from '@onecoach/lib-shared';

/**
 * Modified nutrition day data structure (from AI agent)
 */
export interface ModifiedNutritionDayData {
  dayNumber: number;
  dayName?: string;
  meals: Meal[];
  totalMacros: Macros;
  waterIntake?: number;
  notes?: string;
}

/**
 * Parameters for modifying a nutrition day
 */
export interface ModifyNutritionDayParams {
  planId: string;
  dayNumber: number;
  modifiedDayData: ModifiedNutritionDayData;
  userId: string;
}

/**
 * Parameters for modifying a workout week
 */
export interface ModifyWorkoutWeekParams {
  programId: string;
  weekNumber: number;
  modifiedWeekData: WorkoutWeek;
  userId: string;
}

/**
 * Modification Service
 * Handles all plan/program modifications with atomic persistence
 */
export class ModificationService {
  /**
   * Modify a specific day in a nutrition plan
   */
  static async modifyNutritionDay(params: ModifyNutritionDayParams): Promise<NutritionPlan> {
    const { planId, dayNumber, modifiedDayData, userId } = params;

    const planToUpdate = await prisma.nutrition_plans.findUnique({
      where: { id: planId },
    });

    if (!planToUpdate) {
      throw new Error('Plan not found');
    }

    if (planToUpdate.userId !== userId) {
      throw new Error('Unauthorized: Plan does not belong to user');
    }

    const normalizedPlanToUpdate = normalizeNutritionPlan(planToUpdate as any);

    const { getNutritionPlanDay, getNutritionPlanTotalDays } =
      await import('@onecoach/lib-shared');

    const totalDays = getNutritionPlanTotalDays(normalizedPlanToUpdate);
    if (dayNumber < 1 || dayNumber > totalDays) {
      throw new Error(`Invalid day number: ${dayNumber}. Plan has ${totalDays} day(s)`);
    }

    const dayToModify = getNutritionPlanDay(normalizedPlanToUpdate, dayNumber);
    if (!dayToModify) {
      throw new Error(`Day ${dayNumber} not found in plan`);
    }

    let weekNum = 1;
    let dayCounter = 0;
    for (const week of normalizedPlanToUpdate.weeks) {
      const daysInWeek = week.days?.length || 0;
      if (dayCounter + daysInWeek >= dayNumber) {
        weekNum = week.weekNumber;
        break;
      }
      dayCounter += daysInWeek;
      weekNum++;
    }

    const tempPlanData = {
      name: normalizedPlanToUpdate.name,
      description: normalizedPlanToUpdate.description,
      goals: normalizedPlanToUpdate.goals,
      durationWeeks: normalizedPlanToUpdate.durationWeeks,
      targetMacros: normalizedPlanToUpdate.targetMacros,
      weeks: [
        {
          weekNumber: weekNum,
          days: [modifiedDayData],
        },
      ],
      restrictions: normalizedPlanToUpdate.restrictions || [],
      preferences: normalizedPlanToUpdate.preferences || [],
    };

    const normalizedTempPlan = normalizeAgentPayload(tempPlanData, {
      ...normalizedPlanToUpdate,
      updatedAt: new Date().toISOString(),
    });

    const modifiedDay = normalizedTempPlan.weeks[0]?.days?.[0];
    if (!modifiedDay) {
      throw new Error('Failed to normalize modified day');
    }

    const updatedWeeks = normalizedPlanToUpdate.weeks.map((week: NutritionWeek) => {
      if (week.weekNumber === weekNum) {
        return {
          ...week,
          days:
            week.days?.map((d: NutritionDay) => (d.dayNumber === dayNumber ? modifiedDay : d)) ||
            [],
        };
      }
      return week;
    });

    const planWithModifiedDay = {
      ...normalizedPlanToUpdate,
      weeks: updatedWeeks,
    };

    const persistenceData = preparePlanForPersistence(planWithModifiedDay);

    await prisma.$transaction(async (tx) => {
      await tx.nutrition_plan_versions.create({
        data: {
          id: createId(),
          planId: planToUpdate.id,
          version: planToUpdate.version,
          name: planToUpdate.name,
          description: planToUpdate.description,
          goals: planToUpdate.goals,
          durationWeeks: planToUpdate.durationWeeks,
          targetMacros: toPrismaJsonValue(planToUpdate.targetMacros as Record<string, unknown>),
          weeks: toPrismaJsonValue(planToUpdate.weeks as unknown[]),
          restrictions: planToUpdate.restrictions,
          preferences: planToUpdate.preferences,
          status: planToUpdate.status,
          metadata:
            toNullablePrismaJsonValue(planToUpdate.metadata as Record<string, unknown> | null | undefined),
          createdBy: userId,
        },
      });

      await tx.nutrition_plans.update({
        where: { id: planId },
        data: {
          name: persistenceData.name,
          description: persistenceData.description,
          goals: persistenceData.goals,
          durationWeeks: persistenceData.durationWeeks,
          targetMacros: toPrismaJsonValue(persistenceData.targetMacros as Record<string, unknown>),
          weeks: toPrismaJsonValue(persistenceData.weeks as unknown[]),
          restrictions: persistenceData.restrictions,
          preferences: persistenceData.preferences,
          status: persistenceData.status,
          metadata: toNullablePrismaJsonValue(persistenceData.metadata as Record<string, unknown> | null | undefined),
          version: { increment: 1 },
        },
      });
    });

    const updatedPlan = await prisma.nutrition_plans.findUnique({
      where: { id: planId },
    });

    if (!updatedPlan) {
      throw new Error('Failed to load updated plan');
    }

    return normalizeNutritionPlan(updatedPlan as any);
  }

  /**
   * Modify a specific week in a workout program
   */
  static async modifyWorkoutWeek(params: ModifyWorkoutWeekParams): Promise<WorkoutProgram> {
    const { programId, weekNumber, modifiedWeekData, userId } = params;

    const programToUpdate = await prisma.workout_programs.findUnique({
      where: { id: programId },
    });

    if (!programToUpdate) {
      throw new Error('Program not found');
    }

    if (programToUpdate.userId !== userId) {
      throw new Error('Unauthorized: Program does not belong to user');
    }

    const normalizedProgramToUpdate = normalizeWorkoutProgram(programToUpdate);

    if (weekNumber < 1 || weekNumber > normalizedProgramToUpdate.weeks.length) {
      throw new Error(
        `Invalid week number: ${weekNumber}. Program has ${normalizedProgramToUpdate.weeks.length} week(s)`
      );
    }

    const tempProgramData = {
      name: normalizedProgramToUpdate.name,
      description: normalizedProgramToUpdate.description,
      difficulty: normalizedProgramToUpdate.difficulty,
      durationWeeks: normalizedProgramToUpdate.durationWeeks,
      goals: normalizedProgramToUpdate.goals || [],
      weeks: [modifiedWeekData],
      status: normalizedProgramToUpdate.status,
    };

    const normalizedTempProgram = await normalizeAgentWorkoutPayload(tempProgramData, {
      ...normalizedProgramToUpdate,
      updatedAt: new Date().toISOString(),
    });

    const modifiedWeek = normalizedTempProgram.weeks[0];
    if (!modifiedWeek) {
      throw new Error('Failed to normalize modified week');
    }

    const updatedWeeks = [...normalizedProgramToUpdate.weeks];
    const weekIndex = updatedWeeks.findIndex((w) => w.weekNumber === weekNumber);
    if (weekIndex >= 0) {
      updatedWeeks[weekIndex] = modifiedWeek;
    } else {
      throw new Error(`Week ${weekNumber} not found in program`);
    }

    const programWithModifiedWeek = {
      ...normalizedProgramToUpdate,
      weeks: updatedWeeks,
    };

    const { calculateWeightsInProgram } =
      await import('@onecoach/one-workout/workout-weight-calculator.service');
    const programWithSyncedWeights = await calculateWeightsInProgram(
      userId,
      programWithModifiedWeek
    );

    const persistenceData = prepareProgramForPersistence(programWithSyncedWeights);

    await prisma.$transaction(async (tx) => {
      await tx.workout_program_versions.create({
        data: {
          id: createId(),
          programId: programToUpdate.id,
          version: programToUpdate.version,
          name: programToUpdate.name,
          description: programToUpdate.description,
          difficulty: programToUpdate.difficulty,
          durationWeeks: programToUpdate.durationWeeks,
          goals: programToUpdate.goals,
          status: programToUpdate.status,
          weeks: toPrismaJsonValue(programToUpdate.weeks as unknown[]),
          metadata:
            toNullablePrismaJsonValue(programToUpdate.metadata as Record<string, unknown> | null | undefined),
          createdBy: userId,
        },
      });

      await tx.workout_programs.update({
        where: { id: programId },
        data: {
          name: persistenceData.name,
          description: persistenceData.description,
          difficulty: persistenceData.difficulty,
          durationWeeks: persistenceData.durationWeeks,
          goals: persistenceData.goals,
          weeks: toPrismaJsonValue(persistenceData.weeks as unknown[]),
          status: persistenceData.status,
          metadata: toNullablePrismaJsonValue(persistenceData.metadata as Record<string, unknown> | null | undefined),
          version: { increment: 1 },
        },
      });
    });

    const updatedProgram = await prisma.workout_programs.findUnique({
      where: { id: programId },
    });

    if (!updatedProgram) {
      throw new Error('Failed to load updated program');
    }

    return normalizeWorkoutProgram(updatedProgram);
  }
}
