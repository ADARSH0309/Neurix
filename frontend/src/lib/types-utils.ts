/**
 * Type utility helpers
 */

/** Make specific keys of T required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Make all properties of T optional except those in K */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/** Extract the value type of a Record */
export type ValueOf<T> = T[keyof T];

/** Ensure a value is non-nullable */
export type NonNullableFields<T> = { [K in keyof T]: NonNullable<T[K]> };
