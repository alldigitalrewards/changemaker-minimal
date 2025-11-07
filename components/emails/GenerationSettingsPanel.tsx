'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'conversational'
export type LengthType = 'concise' | 'standard' | 'detailed'
export type CreativityLevel = 'conservative' | 'balanced' | 'creative'

export interface GenerationSettings {
  tone: ToneType
  length: LengthType
  creativity: CreativityLevel
  designElements: {
    includeCTA: boolean
    includeImages: boolean
    useTables: boolean
  }
}

interface GenerationSettingsPanelProps {
  settings: GenerationSettings
  onChange: (settings: GenerationSettings) => void
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  tone: 'professional',
  length: 'standard',
  creativity: 'balanced',
  designElements: {
    includeCTA: true,
    includeImages: true,
    useTables: true,
  },
}

export function GenerationSettingsPanel({ settings, onChange }: GenerationSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const updateSetting = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    onChange({
      ...settings,
      [key]: value,
    })
  }

  const updateDesignElement = (key: keyof GenerationSettings['designElements'], value: boolean) => {
    onChange({
      ...settings,
      designElements: {
        ...settings.designElements,
        [key]: value,
      },
    })
  }

  const toneDescriptions: Record<ToneType, string> = {
    professional: 'Clear, polished business communication',
    casual: 'Relaxed, approachable style',
    friendly: 'Warm and personable tone',
    formal: 'Traditional, strictly professional',
    conversational: 'Natural, dialogue-like approach',
  }

  const lengthDescriptions: Record<LengthType, string> = {
    concise: 'Brief and to the point',
    standard: 'Balanced length with key details',
    detailed: 'Comprehensive with full explanation',
  }

  const creativityDescriptions: Record<CreativityLevel, string> = {
    conservative: 'Safe, predictable content',
    balanced: 'Mix of standard and creative',
    creative: 'Innovative, unique approach',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Generation Settings</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Control how AI generates your email content
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Tone Control */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select
              value={settings.tone}
              onValueChange={(value) => updateSetting('tone', value as ToneType)}
            >
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {toneDescriptions[settings.tone]}
            </p>
          </div>

          {/* Length Control */}
          <div className="space-y-2">
            <Label htmlFor="length">Email Length</Label>
            <Select
              value={settings.length}
              onValueChange={(value) => updateSetting('length', value as LengthType)}
            >
              <SelectTrigger id="length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {lengthDescriptions[settings.length]}
            </p>
          </div>

          {/* Creativity Level */}
          <div className="space-y-2">
            <Label htmlFor="creativity">Creativity Level</Label>
            <Select
              value={settings.creativity}
              onValueChange={(value) => updateSetting('creativity', value as CreativityLevel)}
            >
              <SelectTrigger id="creativity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative (0.3)</SelectItem>
                <SelectItem value="balanced">Balanced (0.7)</SelectItem>
                <SelectItem value="creative">Creative (1.0)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {creativityDescriptions[settings.creativity]}
            </p>
          </div>

          {/* Design Elements */}
          <div className="space-y-4">
            <Label>Design Elements</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal cursor-pointer">
                    Include CTA Buttons
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add call-to-action buttons
                  </p>
                </div>
                <Switch
                  checked={settings.designElements.includeCTA}
                  onCheckedChange={(checked) => updateDesignElement('includeCTA', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal cursor-pointer">
                    Include Images
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add image placeholders
                  </p>
                </div>
                <Switch
                  checked={settings.designElements.includeImages}
                  onCheckedChange={(checked) => updateDesignElement('includeImages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal cursor-pointer">
                    Use Tables for Layout
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Structured table-based design
                  </p>
                </div>
                <Switch
                  checked={settings.designElements.useTables}
                  onCheckedChange={(checked) => updateDesignElement('useTables', checked)}
                />
              </div>
            </div>
          </div>

          {/* Settings Summary */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Current: {settings.tone} tone, {settings.length} length, {settings.creativity} creativity
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
