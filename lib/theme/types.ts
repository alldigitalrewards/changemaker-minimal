/**
 * Theme System Types
 * Defines the type-safe structure for workspace themes
 */

export type ThemeName = "bold" | "professional" | "minimal" | "current";

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  description: string;
  cssVariables: CSSVariables;
}

export interface CSSVariables {
  // Background colors
  "--background": string;
  "--foreground": string;

  // Card colors
  "--card": string;
  "--card-foreground": string;

  // Popover colors
  "--popover": string;
  "--popover-foreground": string;

  // Primary colors (main brand color)
  "--primary": string;
  "--primary-foreground": string;

  // Secondary colors
  "--secondary": string;
  "--secondary-foreground": string;

  // Muted colors (for subtle backgrounds)
  "--muted": string;
  "--muted-foreground": string;

  // Accent colors
  "--accent": string;
  "--accent-foreground": string;

  // Destructive/error colors
  "--destructive": string;
  "--destructive-foreground": string;

  // Border and input
  "--border": string;
  "--input": string;
  "--ring": string;

  // Radius
  "--radius": string;

  // Chart colors (for data visualization)
  "--chart-1": string;
  "--chart-2": string;
  "--chart-3": string;
  "--chart-4": string;
  "--chart-5": string;
}
