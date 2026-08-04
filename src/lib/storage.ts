export const STORAGE_KEYS = {
  projects: 'kanbangxp_projects',
  goals: 'kanbangxp_goals',
  sprints: 'kanbangxp_sprints',
  labels: 'kanbangxp_labels',
  workflowColumns: 'kanbangxp_workflow_columns',
  theme: 'kanbangxp-theme',
  legacyTheme: 'planner-spell-theme',
} as const;

const PREVIOUS_APP_PREFIX = ['goal', 'stride'].join('');

export const PREVIOUS_STORAGE_KEYS = {
  projects: `${PREVIOUS_APP_PREFIX}_projects`,
  goals: `${PREVIOUS_APP_PREFIX}_goals`,
  sprints: `${PREVIOUS_APP_PREFIX}_sprints`,
  labels: `${PREVIOUS_APP_PREFIX}_labels`,
  workflowColumns: `${PREVIOUS_APP_PREFIX}_workflow_columns`,
} as const;

export function getLocalStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Unable to read browser storage key "${key}"`, error);
    return null;
  }
}

export function setLocalStorageItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Unable to save browser storage key "${key}"`, error);
    return false;
  }
}

export function getLocalStorageItemWithMigration(currentKey: string, previousKey: string): string | null {
  const currentValue = getLocalStorageItem(currentKey);
  if (currentValue !== null) return currentValue;

  const previousValue = getLocalStorageItem(previousKey);
  if (previousValue === null) return null;

  if (setLocalStorageItem(currentKey, previousValue)) {
    try {
      window.localStorage.removeItem(previousKey);
    } catch (error) {
      console.error(`Unable to remove migrated browser storage key "${previousKey}"`, error);
    }
  }
  return previousValue;
}

export function isLocalStorageAvailable(): boolean {
  const testKey = '__kanbangxp_storage_test__';
  try {
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('Browser local storage is unavailable', error);
    return false;
  }
}
