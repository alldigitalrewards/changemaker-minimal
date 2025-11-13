"use client";

import { useState, useCallback, ReactNode } from "react";
import { ThemeContext } from "./theme-context";
import { getThemeConfig, applyThemeToRoot } from "@/lib/theme/utils";
import type { ThemeName } from "@/lib/theme/types";

/**
 * Theme Provider
 * Manages theme state and provides theme switching functionality
 */

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme: ThemeName;
  workspaceSlug: string;
}

export function ThemeProvider({
  children,
  initialTheme,
  workspaceSlug,
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme);

  /**
   * Update theme in both client state and database
   * Applies theme immediately and persists to server
   */
  const updateTheme = useCallback(
    async (newTheme: ThemeName) => {
      try {
        // Optimistic update - apply theme immediately
        const themeConfig = getThemeConfig(newTheme);
        applyThemeToRoot(themeConfig);
        setCurrentTheme(newTheme);

        // Persist to database via API
        const response = await fetch(`/api/workspaces/${workspaceSlug}/theme`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!response.ok) {
          // Revert on error
          const previousTheme = getThemeConfig(currentTheme);
          applyThemeToRoot(previousTheme);
          setCurrentTheme(currentTheme);
          throw new Error("Failed to update theme");
        }
      } catch (error) {
        console.error("Failed to update theme:", error);
        throw error;
      }
    },
    [workspaceSlug, currentTheme]
  );

  return (
    <ThemeContext.Provider value={{ currentTheme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
