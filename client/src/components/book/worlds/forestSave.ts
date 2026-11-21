import {
  forestActions,
  forestProgress,
  type ForestAction,
} from "@shared/hiddenForest";

const guestKey = "seven-emirates:hidden-forest:guest:v1";

export function readGuestForest(): ForestAction[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(guestKey) || "null");
    if (
      !saved ||
      typeof saved !== "object" ||
      !("version" in saved) ||
      saved.version !== 1 ||
      !("actions" in saved) ||
      !Array.isArray(saved.actions)
    )
      return [];
    return forestActions.filter(action =>
      (saved.actions as unknown[]).includes(action)
    );
  } catch {
    return [];
  }
}

export function saveGuestForest(action: ForestAction) {
  const actions = forestProgress([...readGuestForest(), action]).actions;
  try {
    localStorage.setItem(guestKey, JSON.stringify({ version: 1, actions }));
  } catch {
    // Guest preview can still use session progress if storage is restricted.
  }
  return actions;
}
