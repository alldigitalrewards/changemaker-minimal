"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/theme-context";
import { getAllThemes } from "@/lib/theme/utils";
import type { ThemeName } from "@/lib/theme/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Theme Selector Component
 * Allows workspace admins to change the workspace theme
 */
export function ThemeSelector() {
  const { currentTheme, updateTheme } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const themes = getAllThemes();

  const handleThemeChange = async (newTheme: string) => {
    if (newTheme === currentTheme) return;

    setIsUpdating(true);
    try {
      await updateTheme(newTheme as ThemeName);
      toast.success("Theme updated successfully");
    } catch (error) {
      console.error("Failed to update theme:", error);
      toast.error("Failed to update theme. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="theme-select">Workspace Theme</Label>
        <Select
          value={currentTheme}
          onValueChange={handleThemeChange}
          disabled={isUpdating}
        >
          <SelectTrigger id="theme-select" className="w-full max-w-xs">
            <SelectValue placeholder="Select a theme" />
          </SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme.name} value={theme.name}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{theme.label}</span>
                  {isUpdating && currentTheme === theme.name && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose a color theme for your workspace. Changes apply immediately.
        </p>
      </div>

      {/* Theme Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => (
          <Card
            key={theme.name}
            className={`p-4 cursor-pointer transition-all ${
              currentTheme === theme.name
                ? "ring-2 ring-primary"
                : "hover:shadow-md"
            }`}
            onClick={() => handleThemeChange(theme.name)}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{theme.label}</h3>
                {currentTheme === theme.name && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {theme.description}
              </p>
              {/* Color swatches */}
              <div className="flex gap-2 mt-3">
                <div
                  className="h-8 w-8 rounded border"
                  style={{
                    backgroundColor: theme.cssVariables["--primary"],
                  }}
                  title="Primary color"
                />
                <div
                  className="h-8 w-8 rounded border"
                  style={{
                    backgroundColor: theme.cssVariables["--secondary"],
                  }}
                  title="Secondary color"
                />
                <div
                  className="h-8 w-8 rounded border"
                  style={{
                    backgroundColor: theme.cssVariables["--accent"],
                  }}
                  title="Accent color"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
