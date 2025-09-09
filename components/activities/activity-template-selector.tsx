'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Activity, Clock, Trophy, Users, Calendar } from 'lucide-react';
import { ActivityType } from '@/lib/types';

interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  basePoints: number;
  requiresApproval: boolean;
  allowMultiple: boolean;
}

interface ActivityTemplateSelectorProps {
  challengeId: string;
  workspaceSlug: string;
  onAssigned: () => void;
}

export function ActivityTemplateSelector({ challengeId, workspaceSlug, onAssigned }: ActivityTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Activity configuration
  const [pointsValue, setPointsValue] = useState<number | null>(null);
  const [maxSubmissions, setMaxSubmissions] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceSlug}/activity-templates`);
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [workspaceSlug]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleAssign = async () => {
    if (!selectedTemplateId) {
      setError('Please select an activity template');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          pointsValue: pointsValue ?? selectedTemplate?.basePoints,
          maxSubmissions,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          isRequired,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign activity');
      }

      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign activity');
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    switch (type) {
      case 'TEXT_SUBMISSION': return 'Text';
      case 'FILE_UPLOAD': return 'File';
      case 'PHOTO_UPLOAD': return 'Photo';
      case 'LINK_SUBMISSION': return 'Link';
      case 'MULTIPLE_CHOICE': return 'Quiz';
      case 'VIDEO_SUBMISSION': return 'Video';
      default: return type;
    }
  };

  const getActivityTypeVariant = (type: ActivityType): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'TEXT_SUBMISSION': return 'default';
      case 'FILE_UPLOAD': return 'secondary';
      case 'PHOTO_UPLOAD': return 'outline';
      case 'LINK_SUBMISSION': return 'secondary';
      case 'MULTIPLE_CHOICE': return 'default';
      case 'VIDEO_SUBMISSION': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-b-2 border-coral-500 rounded-full"></div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">No activity templates available</p>
        <p className="text-sm text-gray-500">
          Create activity templates first to assign them to challenges
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <Label className="text-base font-medium mb-4 block">Select Activity Template</Label>
        <RadioGroup value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <div key={template.id} className="flex items-start space-x-3">
                <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={template.id} className="cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant={getActivityTypeVariant(template.type)} className="text-xs">
                        {getActivityTypeLabel(template.type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {template.basePoints} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Configuration Section */}
      {selectedTemplate && (
        <>
          <Separator />
          <div>
            <Label className="text-base font-medium mb-4 block">Configure for This Challenge</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Points Value */}
              <div>
                <Label htmlFor="points" className="flex items-center space-x-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>Points Value</span>
                </Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  max="1000"
                  value={pointsValue ?? selectedTemplate.basePoints}
                  onChange={(e) => setPointsValue(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={`Default: ${selectedTemplate.basePoints}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Override the template's default points ({selectedTemplate.basePoints})
                </p>
              </div>

              {/* Max Submissions */}
              <div>
                <Label htmlFor="maxSubmissions" className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Max Submissions</span>
                </Label>
                <Input
                  id="maxSubmissions"
                  type="number"
                  min="1"
                  max="10"
                  value={maxSubmissions}
                  onChange={(e) => setMaxSubmissions(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many times can participants submit this activity
                </p>
              </div>

              {/* Deadline */}
              <div>
                <Label htmlFor="deadline" className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-red-500" />
                  <span>Deadline (Optional)</span>
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  When must participants complete this activity
                </p>
              </div>

              {/* Required */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={isRequired}
                  onCheckedChange={(checked) => setIsRequired(checked as boolean)}
                />
                <Label htmlFor="required" className="text-sm">
                  Mark as required for challenge completion
                </Label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={() => onAssigned()} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleAssign} disabled={!selectedTemplateId || submitting}>
          {submitting ? 'Assigning...' : 'Assign Activity'}
        </Button>
      </div>
    </div>
  );
}