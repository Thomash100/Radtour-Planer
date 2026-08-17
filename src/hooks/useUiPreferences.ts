"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_EVENT,
  UI_PREFERENCES_STORAGE_KEY,
  parseUiPreferences,
  serializeUiPreferences,
  type UiPreferences
} from "@/lib/ui-preferences";

export function useUiPreferences() {
  const [preferences, setPreferencesState] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);

  useEffect(() => {
    const read = () => setPreferencesState(parseUiPreferences(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)));
    read();
    window.addEventListener("storage", read);
    window.addEventListener(UI_PREFERENCES_EVENT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(UI_PREFERENCES_EVENT, read);
    };
  }, []);

  const setPreferences = useCallback((next: UiPreferences | ((current: UiPreferences) => UiPreferences)) => {
    setPreferencesState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, serializeUiPreferences(resolved));
      window.dispatchEvent(new Event(UI_PREFERENCES_EVENT));
      return resolved;
    });
  }, []);

  return { preferences, setPreferences };
}
