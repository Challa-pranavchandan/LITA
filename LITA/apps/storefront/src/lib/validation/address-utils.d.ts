export const INDIAN_STATES: readonly [string, ...string[]];
export function hasFirstAndLastName(value: string): boolean;
export function normalizeIndianPhone(value: string): string;
export function isValidIndianPhone(value: string): boolean;
export function isValidIndianPincode(value: string): boolean;
export function splitFullName(value: string): {
  first_name: string;
  last_name: string;
};
