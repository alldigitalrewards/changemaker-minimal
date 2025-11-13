import type { ThemeConfig } from "./types";

/**
 * Theme Definitions
 * All available workspace themes with their color palettes
 */

export const themeDefinitions: Readonly<Record<string, ThemeConfig>> = Object.freeze({
  bold: {
    name: "bold",
    label: "Bold",
    description: "Vibrant coral and terracotta tones for energetic brands",
    cssVariables: {
      // Light background with warm undertones
      "--background": "oklch(0.99 0.005 35)",
      "--foreground": "oklch(0.2 0.015 25)",

      // Card colors
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.2 0.015 25)",

      // Popover colors
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.2 0.015 25)",

      // Primary - vibrant coral
      "--primary": "oklch(0.65 0.19 35)",
      "--primary-foreground": "oklch(1 0 0)",

      // Secondary - terracotta
      "--secondary": "oklch(0.55 0.12 45)",
      "--secondary-foreground": "oklch(1 0 0)",

      // Muted - warm gray
      "--muted": "oklch(0.96 0.005 35)",
      "--muted-foreground": "oklch(0.5 0.01 25)",

      // Accent - lighter coral
      "--accent": "oklch(0.75 0.15 35)",
      "--accent-foreground": "oklch(0.2 0.015 25)",

      // Destructive - warm red
      "--destructive": "oklch(0.55 0.22 25)",
      "--destructive-foreground": "oklch(1 0 0)",

      // Borders and inputs
      "--border": "oklch(0.9 0.01 35)",
      "--input": "oklch(0.9 0.01 35)",
      "--ring": "oklch(0.65 0.19 35)",

      // Border radius
      "--radius": "0.625rem",

      // Chart colors - warm palette
      "--chart-1": "oklch(0.65 0.19 35)", // Coral
      "--chart-2": "oklch(0.55 0.12 45)", // Terracotta
      "--chart-3": "oklch(0.75 0.15 55)", // Peach
      "--chart-4": "oklch(0.45 0.08 30)", // Deep brown
      "--chart-5": "oklch(0.85 0.1 40)", // Light coral
    },
  },

  professional: {
    name: "professional",
    label: "Professional",
    description: "Classic navy and slate for corporate environments",
    cssVariables: {
      // Clean white background
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.2 0.02 250)",

      // Card colors
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.2 0.02 250)",

      // Popover colors
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.2 0.02 250)",

      // Primary - professional navy
      "--primary": "oklch(0.35 0.08 250)",
      "--primary-foreground": "oklch(1 0 0)",

      // Secondary - slate blue
      "--secondary": "oklch(0.45 0.05 240)",
      "--secondary-foreground": "oklch(1 0 0)",

      // Muted - cool gray
      "--muted": "oklch(0.96 0.003 250)",
      "--muted-foreground": "oklch(0.5 0.01 250)",

      // Accent - medium blue
      "--accent": "oklch(0.55 0.12 250)",
      "--accent-foreground": "oklch(1 0 0)",

      // Destructive - professional red
      "--destructive": "oklch(0.5 0.18 20)",
      "--destructive-foreground": "oklch(1 0 0)",

      // Borders and inputs
      "--border": "oklch(0.88 0.005 250)",
      "--input": "oklch(0.88 0.005 250)",
      "--ring": "oklch(0.35 0.08 250)",

      // Border radius
      "--radius": "0.5rem",

      // Chart colors - professional palette
      "--chart-1": "oklch(0.35 0.08 250)", // Navy
      "--chart-2": "oklch(0.55 0.12 250)", // Medium blue
      "--chart-3": "oklch(0.65 0.1 260)", // Light blue
      "--chart-4": "oklch(0.45 0.05 240)", // Slate
      "--chart-5": "oklch(0.75 0.06 255)", // Pale blue
    },
  },

  minimal: {
    name: "minimal",
    label: "Minimal",
    description: "Subtle grays and muted tones for clean, focused interfaces",
    cssVariables: {
      // Pure white background
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.15 0 0)",

      // Card colors
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.15 0 0)",

      // Popover colors
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.15 0 0)",

      // Primary - charcoal
      "--primary": "oklch(0.25 0 0)",
      "--primary-foreground": "oklch(0.98 0 0)",

      // Secondary - medium gray
      "--secondary": "oklch(0.6 0 0)",
      "--secondary-foreground": "oklch(0.98 0 0)",

      // Muted - very light gray
      "--muted": "oklch(0.97 0 0)",
      "--muted-foreground": "oklch(0.5 0 0)",

      // Accent - slightly darker than muted
      "--accent": "oklch(0.94 0 0)",
      "--accent-foreground": "oklch(0.15 0 0)",

      // Destructive - simple red
      "--destructive": "oklch(0.5 0.15 15)",
      "--destructive-foreground": "oklch(1 0 0)",

      // Borders and inputs
      "--border": "oklch(0.92 0 0)",
      "--input": "oklch(0.92 0 0)",
      "--ring": "oklch(0.6 0 0)",

      // Border radius - smaller for minimal look
      "--radius": "0.375rem",

      // Chart colors - grayscale with hints
      "--chart-1": "oklch(0.25 0 0)", // Dark gray
      "--chart-2": "oklch(0.45 0 0)", // Medium dark gray
      "--chart-3": "oklch(0.65 0 0)", // Medium gray
      "--chart-4": "oklch(0.8 0 0)", // Light gray
      "--chart-5": "oklch(0.9 0 0)", // Very light gray
    },
  },

  current: {
    name: "current",
    label: "Current",
    description: "The existing neutral theme (default from template)",
    cssVariables: {
      // From existing globals.css
      "--background": "oklch(1 0 0)",
      "--foreground": "oklch(0.141 0.005 285.823)",

      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.141 0.005 285.823)",

      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.141 0.005 285.823)",

      "--primary": "oklch(0.21 0.006 285.885)",
      "--primary-foreground": "oklch(0.985 0 0)",

      "--secondary": "oklch(0.967 0.001 286.375)",
      "--secondary-foreground": "oklch(0.21 0.006 285.885)",

      "--muted": "oklch(0.967 0.001 286.375)",
      "--muted-foreground": "oklch(0.552 0.016 285.938)",

      "--accent": "oklch(0.967 0.001 286.375)",
      "--accent-foreground": "oklch(0.21 0.006 285.885)",

      "--destructive": "oklch(0.577 0.245 27.325)",
      "--destructive-foreground": "oklch(1 0 0)",

      "--border": "oklch(0.92 0.004 286.32)",
      "--input": "oklch(0.92 0.004 286.32)",
      "--ring": "oklch(0.705 0.015 286.067)",

      "--radius": "0.625rem",

      "--chart-1": "oklch(0.646 0.222 41.116)",
      "--chart-2": "oklch(0.6 0.118 184.704)",
      "--chart-3": "oklch(0.398 0.07 227.392)",
      "--chart-4": "oklch(0.828 0.189 84.429)",
      "--chart-5": "oklch(0.769 0.188 70.08)",
    },
  },
});

export const defaultTheme: ThemeConfig = themeDefinitions.bold;
