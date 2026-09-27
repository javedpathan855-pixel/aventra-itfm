// Location & department domain constants (framework-independent).
//
// Codes are the human-stable identifiers shown in UI and used for
// operational reference. They are normalized to trimmed uppercase so
// uniqueness checks behave identically at every boundary.

export const LOCATION_NAME_MIN_LENGTH = 2;
export const LOCATION_NAME_MAX_LENGTH = 100;
export const LOCATION_CODE_MIN_LENGTH = 2;
export const LOCATION_CODE_MAX_LENGTH = 20;
export const LOCATION_DESCRIPTION_MAX_LENGTH = 500;

export const DEPARTMENT_NAME_MIN_LENGTH = 2;
export const DEPARTMENT_NAME_MAX_LENGTH = 100;
export const DEPARTMENT_CODE_MIN_LENGTH = 2;
export const DEPARTMENT_CODE_MAX_LENGTH = 20;
export const DEPARTMENT_DESCRIPTION_MAX_LENGTH = 500;

export const LOCATION_LIST_DEFAULT_PAGE_SIZE = 20;
export const LOCATION_LIST_MAX_PAGE_SIZE = 100;

/** Normalize a human-entered code to its canonical stored form. */
export const normalizeEntityCode = (code: string): string =>
  code.trim().toUpperCase();

/** Normalize a human-entered name to its canonical stored form. */
export const normalizeEntityName = (name: string): string =>
  name.trim().replace(/\s+/g, " ");
