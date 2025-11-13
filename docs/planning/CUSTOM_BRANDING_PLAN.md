# Custom Workspace Branding Implementation Plan

## Overview

Extend the existing theme system to support custom workspace branding, allowing admins to configure logos, custom colors, and typography beyond the preset themes.

## Current State

**Existing Branding Capabilities:**
- ✅ Theme system with 4 preset color palettes
- ✅ `WorkspaceEmailSettings.brandColor` for email customization
- ✅ Theme selector UI at `/w/[slug]/admin/settings`

**What's Missing:**
- Custom logo upload
- Custom color overrides (beyond presets)
- Custom typography
- Brand asset management

## Design Philosophy

Following MVP minimalism principles:
- Start with logo + custom colors (high impact, low complexity)
- Defer custom fonts to Phase 2 (requires font loading infrastructure)
- Reuse existing theme system as foundation
- Admin-only feature (no participant customization)

---

## Phase 1: Database Schema Extension

### Add Branding Fields to Workspace

```prisma
model Workspace {
  // ... existing fields
  theme     String?  @default("bold")

  // Custom branding (optional, overrides theme)
  logoUrl           String?  // URL to uploaded logo
  logoWidth         Int?     // Display width in pixels
  logoHeight        Int?     // Display height in pixels
  customPrimaryColor    String?  // OKLCH format: "oklch(0.65 0.19 35)"
  customSecondaryColor  String?  // OKLCH format
  customAccentColor     String?  // OKLCH format
  brandingEnabled   Boolean  @default(false) // Feature flag
}
```

### Migration Strategy

```bash
# Add columns with nullable values (non-breaking)
pnpm prisma db push
```

---

## Phase 2: Type System & Utilities

### lib/branding/types.ts

```typescript
export interface WorkspaceBranding {
  logoUrl?: string | null;
  logoWidth?: number | null;
  logoHeight?: number | null;
  customPrimaryColor?: string | null;
  customSecondaryColor?: string | null;
  customAccentColor?: string | null;
  brandingEnabled: boolean;
}

export interface BrandingConfig {
  logo?: {
    url: string;
    width: number;
    height: number;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export interface BrandingFormData {
  logoFile?: File;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  enabled: boolean;
}
```

### lib/branding/utils.ts

```typescript
import { WorkspaceBranding, BrandingConfig } from "./types";

export function getBrandingConfig(
  workspace: WorkspaceBranding
): BrandingConfig | null {
  if (!workspace.brandingEnabled) return null;

  return {
    logo: workspace.logoUrl
      ? {
          url: workspace.logoUrl,
          width: workspace.logoWidth || 200,
          height: workspace.logoHeight || 60,
        }
      : undefined,
    colors: {
      primary: workspace.customPrimaryColor || undefined,
      secondary: workspace.customSecondaryColor || undefined,
      accent: workspace.customAccentColor || undefined,
    },
  };
}

export function validateOKLCH(color: string): boolean {
  const oklchPattern = /^oklch\([\d.]+\s+[\d.]+\s+[\d.]+\)$/;
  return oklchPattern.test(color.trim());
}

export function applyCustomBranding(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (branding.colors?.primary) {
    root.style.setProperty("--primary", branding.colors.primary);
  }
  if (branding.colors?.secondary) {
    root.style.setProperty("--secondary", branding.colors.secondary);
  }
  if (branding.colors?.accent) {
    root.style.setProperty("--accent", branding.colors.accent);
  }
}
```

---

## Phase 3: Branding Editor UI

### components/admin/branding-editor.tsx

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import type { WorkspaceBranding } from "@/lib/branding/types";

interface BrandingEditorProps {
  workspaceSlug: string;
  initialBranding: WorkspaceBranding;
}

export function BrandingEditor({ workspaceSlug, initialBranding }: BrandingEditorProps) {
  const [enabled, setEnabled] = useState(initialBranding.brandingEnabled);
  const [logoUrl, setLogoUrl] = useState(initialBranding.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(initialBranding.customPrimaryColor || "");
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.customSecondaryColor || "");
  const [accentColor, setAccentColor] = useState(initialBranding.customAccentColor || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch(`/api/workspaces/${workspaceSlug}/branding/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      setLogoUrl(url);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: logoUrl || null,
          customPrimaryColor: primaryColor || null,
          customSecondaryColor: secondaryColor || null,
          customAccentColor: accentColor || null,
          brandingEnabled: enabled,
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      toast.success("Branding updated successfully");

      // Reload page to apply new branding
      window.location.reload();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save branding");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Custom Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Branding</CardTitle>
              <CardDescription>
                Override theme with custom logo and colors
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
      </Card>

      {enabled && (
        <>
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Upload your workspace logo (PNG, JPG, SVG - max 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoUrl ? (
                <div className="relative inline-block">
                  <img
                    src={logoUrl}
                    alt="Workspace logo"
                    className="max-w-xs max-h-24 object-contain border rounded p-2"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2"
                    onClick={() => setLogoUrl("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">
                      Click to upload
                    </span>
                    {" or drag and drop"}
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Colors</CardTitle>
              <CardDescription>
                Override theme colors with custom OKLCH values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      placeholder="oklch(0.65 0.19 35)"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                    {primaryColor && (
                      <div
                        className="w-10 h-10 rounded border shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      placeholder="oklch(0.55 0.12 45)"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                    />
                    {secondaryColor && (
                      <div
                        className="w-10 h-10 rounded border shrink-0"
                        style={{ backgroundColor: secondaryColor }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      placeholder="oklch(0.75 0.15 35)"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                    />
                    {accentColor && (
                      <div
                        className="w-10 h-10 rounded border shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Use OKLCH format for perceptually uniform colors. Try{" "}
                <a
                  href="https://oklch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  oklch.com
                </a>{" "}
                to generate values.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Phase 4: API Routes

### app/api/workspaces/[slug]/branding/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceRole } from "@/lib/workspace-context";
import { prisma } from "@/lib/db";
import { validateOKLCH } from "@/lib/branding/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserWorkspaceRole(slug);
  if (role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can update branding" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    logoUrl,
    customPrimaryColor,
    customSecondaryColor,
    customAccentColor,
    brandingEnabled,
  } = body;

  // Validate OKLCH colors if provided
  if (customPrimaryColor && !validateOKLCH(customPrimaryColor)) {
    return NextResponse.json(
      { error: "Invalid primary color format. Use OKLCH: oklch(L C H)" },
      { status: 400 }
    );
  }
  if (customSecondaryColor && !validateOKLCH(customSecondaryColor)) {
    return NextResponse.json(
      { error: "Invalid secondary color format. Use OKLCH: oklch(L C H)" },
      { status: 400 }
    );
  }
  if (customAccentColor && !validateOKLCH(customAccentColor)) {
    return NextResponse.json(
      { error: "Invalid accent color format. Use OKLCH: oklch(L C H)" },
      { status: 400 }
    );
  }

  try {
    const workspace = await prisma.workspace.update({
      where: { slug },
      data: {
        logoUrl: logoUrl || null,
        customPrimaryColor: customPrimaryColor || null,
        customSecondaryColor: customSecondaryColor || null,
        customAccentColor: customAccentColor || null,
        brandingEnabled: brandingEnabled ?? false,
      },
    });

    return NextResponse.json({ workspace }, { status: 200 });
  } catch (error) {
    console.error("Branding update error:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: {
        logoUrl: true,
        logoWidth: true,
        logoHeight: true,
        customPrimaryColor: true,
        customSecondaryColor: true,
        customAccentColor: true,
        brandingEnabled: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ branding: workspace }, { status: 200 });
  } catch (error) {
    console.error("Branding fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 }
    );
  }
}
```

### app/api/workspaces/[slug]/branding/upload/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceRole } from "@/lib/workspace-context";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserWorkspaceRole(slug);
  if (role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can upload logos" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be less than 2MB" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${slug}-logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { data, error } = await supabase.storage
      .from("workspace-logos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload logo" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("workspace-logos")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}
```

---

## Phase 5: Integration into Layouts

### Update ThemeProvider to Support Custom Branding

**components/theme/theme-provider.tsx** (extend existing):

```typescript
// Add to existing ThemeProvider
useEffect(() => {
  // Apply theme
  const themeConfig = getThemeConfig(currentTheme);
  applyThemeToRoot(themeConfig);

  // Apply custom branding overrides if enabled
  if (customBranding?.brandingEnabled) {
    const brandingConfig = getBrandingConfig(customBranding);
    if (brandingConfig) {
      applyCustomBranding(brandingConfig);
    }
  }
}, [currentTheme, customBranding]);
```

---

## Phase 6: Settings Page Integration

### Add to app/w/[slug]/admin/settings/page.tsx

```typescript
import { BrandingEditor } from "@/components/admin/branding-editor";

// In settings page, add after ThemeSelector:

<Card>
  <CardHeader>
    <CardTitle>Custom Branding</CardTitle>
    <CardDescription>
      Upload logo and customize colors beyond preset themes
    </CardDescription>
  </CardHeader>
  <CardContent>
    <BrandingEditor
      workspaceSlug={workspace.slug}
      initialBranding={{
        logoUrl: workspace.logoUrl,
        logoWidth: workspace.logoWidth,
        logoHeight: workspace.logoHeight,
        customPrimaryColor: workspace.customPrimaryColor,
        customSecondaryColor: workspace.customSecondaryColor,
        customAccentColor: workspace.customAccentColor,
        brandingEnabled: workspace.brandingEnabled,
      }}
    />
  </CardContent>
</Card>
```

---

## Testing Checklist

- [ ] Branding schema migration applies cleanly
- [ ] Logo upload works (Supabase Storage bucket created)
- [ ] OKLCH color validation works
- [ ] Custom colors override theme correctly
- [ ] Branding persists across page reloads
- [ ] Branding applies to all workspace pages
- [ ] Only admins can access branding settings
- [ ] Disabling custom branding reverts to theme

---

## Future Enhancements (Phase 2)

### Custom Typography
- Font family upload/Google Fonts integration
- Heading/body font customization
- Font weight/size presets

### Brand Asset Library
- Multiple logo variants (light/dark mode)
- Favicon upload
- Social media preview images
- Email header/footer customization

### Advanced Color Controls
- Visual color picker with OKLCH preview
- Auto-generate complementary colors
- Dark mode color variants
- Accessibility contrast checker

### Branding Templates
- Industry-specific presets (Healthcare, Education, Tech)
- One-click brand import from existing sites
- Export/import branding configs

---

## Implementation Estimate

**Minimal MVP (Logo + Custom Colors)**:
- Database: 1 hour
- Types/Utils: 1 hour
- BrandingEditor UI: 3 hours
- API routes: 2 hours
- Integration: 2 hours
- Testing: 2 hours

**Total: ~11 hours** (achievable in 1-2 days)

**Full Phase 2 (Typography + Advanced Features)**: Additional 2-3 days

---

## Security Considerations

1. **File Upload**: Validate file types, scan for malware, size limits
2. **Storage**: Use Supabase Storage with proper bucket policies
3. **RBAC**: Admin-only access to branding endpoints
4. **Color Injection**: Sanitize OKLCH values to prevent CSS injection
5. **Rate Limiting**: Prevent abuse of logo upload endpoint

---

## References

- OKLCH Color Picker: https://oklch.com
- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
