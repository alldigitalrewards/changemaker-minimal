"use client";

import { createContext, useContext } from "react";
import type { ThemeName } from "@/lib/theme/types";

/**
 * Theme Context
 * Provides theme state and update function to all components
 */

interface ThemeContextValue {
  currentTheme: ThemeName;
  updateTheme: (newTheme: ThemeName) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

/**
 * Hook to access theme context
 * Must be used within a ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
