'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  workspaceSlug: string;
  templateType: string;
  workspaceName?: string;
  brandColor?: string;
  height?: string;
}

export function MonacoEditor({
  value,
  onChange,
  workspaceSlug,
  templateType,
  workspaceName,
  brandColor,
  height = '400px',
}: MonacoEditorProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAIAssist = async () => {
    if (!aiPrompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/emails/ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: {
            templateType,
            workspaceName,
            brandColor,
            existingHtml: value || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate template');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;

          const text = decoder.decode(chunk);
          result += text;
        }
      }

      // Auto-insert the completion into the editor
      onChange(result);
      setAiPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* AI Assist Input */}
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">AI Assist</Label>
        <div className="flex gap-2">
          <Textarea
            id="ai-prompt"
            placeholder="Describe what you want to change or add (e.g., 'Add a hero section with a call-to-action button')"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleAIAssist}
            disabled={!aiPrompt.trim() || isLoading}
            size="default"
            className="self-end"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive">
            Error: {error}
          </p>
        )}
        {isLoading && (
          <div className="text-sm text-muted-foreground">
            Generating template...
          </div>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="border rounded-md overflow-hidden">
        <div className="flex items-center justify-between p-2 bg-muted border-b">
          <span className="text-sm font-medium">HTML Template</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!value}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </>
            )}
          </Button>
        </div>
        <Editor
          height={height}
          defaultLanguage="html"
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Variable Hints with Validation */}
      <VariableHints value={value} templateType={templateType} />
    </div>
  );
}

/**
 * Component to show available variables and validation warnings
 */
function VariableHints({ value, templateType }: { value: string; templateType: string }) {
  const {
    TEMPLATE_VARIABLES,
    getVariablesForTemplate,
    validateTemplate
  } = require('@/lib/email/template-variables');

  const relevantVariables = getVariablesForTemplate(templateType);
  const allVariables = TEMPLATE_VARIABLES;
  const validation = validateTemplate(value);

  return (
    <div className="space-y-3">
      {/* Validation Warnings */}
      {!validation.valid && validation.warnings.length > 0 && (
        <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="font-medium text-yellow-900 mb-1">⚠️ Template Validation</p>
          {validation.warnings.map((warning: string, i: number) => (
            <p key={i} className="text-yellow-800">{warning}</p>
          ))}
        </div>
      )}

      {/* Available Variables */}
      <div className="text-sm text-muted-foreground">
        {relevantVariables.length > 0 && (
          <div className="mb-3">
            <p className="font-medium mb-2">Recommended for {templateType}:</p>
            <div className="flex flex-wrap gap-2">
              {relevantVariables.map((v: {name: string; description: string}) => (
                <code
                  key={v.name}
                  className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs"
                  title={v.description}
                >
                  {`{{${v.name}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="font-medium mb-2">All available variables:</p>
          <div className="flex flex-wrap gap-2">
            {allVariables.map((v: {name: string; description: string}) => {
              const isRecommended = relevantVariables.some((rv: {name: string; description: string}) => rv.name === v.name);
              return (
                <code
                  key={v.name}
                  className={`px-2 py-1 rounded text-xs ${
                    isRecommended
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-muted border border-muted'
                  }`}
                  title={v.description}
                >
                  {`{{${v.name}}}`}
                </code>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
