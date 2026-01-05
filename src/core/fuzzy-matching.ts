/**
 * Fuzzy Matching Utilities
 * 
 * Shared utilities for fuzzy name matching across all modification tools.
 * Used by workout, nutrition, and oneagenda domains for flexible entity targeting.
 * 
 * @module lib-mcp-server/tools/shared/fuzzy-matching
 * @example
 * ```typescript
 * import { fuzzyMatch, fuzzyFindIndex } from './shared/fuzzy-matching';
 * 
 * // Find meal by partial name
 * const index = fuzzyFindIndex(meals, 'name', 'col'); // matches "Colazione"
 * 
 * // Check if name matches
 * const matches = fuzzyMatch('Squat con bilanciere', 'squat'); // true
 * ```
 */

/**
 * Configuration options for fuzzy matching
 */
export interface FuzzyMatchOptions {
  /** If true, match must be exact (default: false) */
  exact?: boolean;
  /** If true, search term must be at start of string (default: false) */
  startsWith?: boolean;
  /** Minimum similarity score for match (0-1, default: 0.3) */
  minScore?: number;
}

/**
 * Performs case-insensitive fuzzy matching between a target and search term.
 * 
 * @param target - The string to search in
 * @param searchTerm - The term to search for
 * @param options - Optional matching configuration
 * @returns True if the target matches the search term
 * 
 * @example
 * ```typescript
 * fuzzyMatch('Colazione', 'cola'); // true (contains)
 * fuzzyMatch('Pranzo', 'cena');    // false
 * fuzzyMatch('Design', 'design');  // true (case-insensitive)
 * ```
 */
export function fuzzyMatch(
  target: string,
  searchTerm: string,
  options: FuzzyMatchOptions = {}
): boolean {
  const { exact = false, startsWith = false } = options;
  
  const normalizedTarget = target.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  if (exact) {
    return normalizedTarget === normalizedSearch;
  }
  
  if (startsWith) {
    return normalizedTarget.startsWith(normalizedSearch);
  }
  
  return normalizedTarget.includes(normalizedSearch);
}

/**
 * Finds the index of an item in an array using fuzzy name matching.
 * 
 * @param items - Array of items to search
 * @param nameField - The field name containing the string to match
 * @param searchTerm - The term to search for
 * @param options - Optional matching configuration
 * @returns The index of the first matching item, or -1 if not found
 * 
 * @example
 * ```typescript
 * const meals = [{ name: 'Colazione' }, { name: 'Pranzo' }];
 * fuzzyFindIndex(meals, 'name', 'pran'); // returns 1
 * fuzzyFindIndex(meals, 'name', 'cena'); // returns -1
 * ```
 */
export function fuzzyFindIndex<T extends Record<string, unknown>>(
  items: T[],
  nameField: keyof T,
  searchTerm: string,
  options: FuzzyMatchOptions = {}
): number {
  return items.findIndex(item => {
    const fieldValue = item[nameField];
    if (typeof fieldValue !== 'string') return false;
    return fuzzyMatch(fieldValue, searchTerm, options);
  });
}

/**
 * Finds an item in an array using fuzzy name matching.
 * 
 * @param items - Array of items to search
 * @param nameField - The field name containing the string to match
 * @param searchTerm - The term to search for
 * @param options - Optional matching configuration
 * @returns The first matching item, or undefined if not found
 */
export function fuzzyFind<T extends Record<string, unknown>>(
  items: T[],
  nameField: keyof T,
  searchTerm: string,
  options: FuzzyMatchOptions = {}
): T | undefined {
  const index = fuzzyFindIndex(items, nameField, searchTerm, options);
  return index >= 0 ? items[index] : undefined;
}

/**
 * Finds all items matching a fuzzy search term.
 * 
 * @param items - Array of items to search
 * @param nameField - The field name containing the string to match
 * @param searchTerm - The term to search for
 * @param options - Optional matching configuration
 * @returns Array of all matching items
 */
export function fuzzyFindAll<T extends Record<string, unknown>>(
  items: T[],
  nameField: keyof T,
  searchTerm: string,
  options: FuzzyMatchOptions = {}
): T[] {
  return items.filter(item => {
    const fieldValue = item[nameField];
    if (typeof fieldValue !== 'string') return false;
    return fuzzyMatch(fieldValue, searchTerm, options);
  });
}
