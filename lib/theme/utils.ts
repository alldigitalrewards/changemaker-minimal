import type { ThemeConfig, ThemeName, CSSVariables } from "./types";
import { themeDefinitions, defaultTheme } from "./definitions";

/**
 * Theme Utilities
 * Helper functions for working with workspace themes
 */

/**
 * Get theme configuration by name
 * Returns default theme if name is invalid
 */
export function getThemeConfig(name: string | null | undefined): ThemeConfig {
  if (!name || !isValidTheme(name)) {
    return defaultTheme;
  }
  return themeDefinitions[name];
}

/**
 * Check if a theme name is valid
 */
export function isValidTheme(name: string): name is ThemeName {
  return name in themeDefinitions;
}

/**
 * Get all available theme names
 */
export function getThemeNames(): ThemeName[] {
  return Object.keys(themeDefinitions) as ThemeName[];
}

/**
 * Get all theme configurations
 */
export function getAllThemes(): ThemeConfig[] {
  return Object.values(themeDefinitions);
}

/**
 * Convert CSS variables object to style string
 * Used for injecting into <style> tags
 */
export function cssVariablesToString(variables: CSSVariables): string {
  return Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Generate complete CSS for a theme
 * Returns a string that can be injected into a <style> tag
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  return `:root {\n${cssVariablesToString(theme.cssVariables)}\n}`;
}

/**
 * Apply theme to document root (client-side only)
 * Updates CSS variables on the document's root element
 */
export function applyThemeToRoot(theme: ThemeConfig): void {
  if (typeof document === "undefined") {
    console.warn("applyThemeToRoot called in non-browser environment");
    return;
  }

  const root = document.documentElement;
  const variables = theme.cssVariables;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
