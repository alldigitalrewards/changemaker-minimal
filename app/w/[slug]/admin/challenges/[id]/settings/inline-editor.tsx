'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  enrollmentDeadline?: string | null;
  rewardType?: string | null;
  rewardConfig?: any;
  status?: string;
  workspaceId: string;
}

interface InlineEditorProps {
  challenge: Challenge;
  workspaceSlug: string;
}

const formSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be at most 100 characters'),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description must be at most 500 characters'),
    startDate: z
      .string()
      .min(1, 'Start date is required')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid start date'),
    endDate: z
      .string()
      .min(1, 'End date is required')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid end date'),
    enrollmentDeadline: z
      .string()
      .optional()
      .refine((s) => (s ? !Number.isNaN(Date.parse(s)) : true), 'Invalid enrollment deadline'),
  })
  .refine(
    (data) => new Date(data.endDate).getTime() > new Date(data.startDate).getTime(),
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) =>
      !data.enrollmentDeadline ||
      new Date(data.enrollmentDeadline).getTime() <= new Date(data.startDate).getTime(),
    {
      message: 'Enrollment deadline must be before or on start date',
      path: ['enrollmentDeadline'],
    }
  );

type FormValues = z.infer<typeof formSchema>;

type EditingField = 'title' | 'description' | 'dates' | null;

export function InlineEditor({ challenge, workspaceSlug }: InlineEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: challenge.title,
      description: challenge.description,
      startDate: new Date(challenge.startDate).toISOString().split('T')[0],
      endDate: new Date(challenge.endDate).toISOString().split('T')[0],
      enrollmentDeadline: challenge.enrollmentDeadline
        ? new Date(challenge.enrollmentDeadline).toISOString().split('T')[0]
        : '',
    },
  });

  const startDateValue = watch('startDate');

  const onSave = async (field: EditingField, values: Partial<FormValues>) => {
    setIsSaving(true);
    try {
      const updateData: any = {};

      if (field === 'title') {
        updateData.title = values.title?.trim();
      } else if (field === 'description') {
        updateData.description = values.description?.trim();
      } else if (field === 'dates') {
        updateData.startDate = values.startDate;
        updateData.endDate = values.endDate;
        updateData.enrollmentDeadline = values.enrollmentDeadline || undefined;
      }

      const response = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challenge.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Challenge updated successfully',
        });
        setEditingField(null);
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update challenge');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update challenge',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (field: EditingField) => {
    setEditingField(null);
    reset({
      title: challenge.title,
      description: challenge.description,
      startDate: new Date(challenge.startDate).toISOString().split('T')[0],
      endDate: new Date(challenge.endDate).toISOString().split('T')[0],
      enrollmentDeadline: challenge.enrollmentDeadline
        ? new Date(challenge.enrollmentDeadline).toISOString().split('T')[0]
        : '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Title</CardTitle>
              <CardDescription>The name of your challenge</CardDescription>
            </div>
            {editingField !== 'title' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingField('title')}
                disabled={editingField !== null}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingField === 'title' ? (
            <form
              onSubmit={handleSubmit((values) => onSave('title', values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Input
                  {...register('title')}
                  placeholder="Enter challenge title"
                  disabled={isSaving}
                  autoFocus
                />
                {errors.title?.message && (
                  <span className="text-sm text-red-500">{errors.title.message}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || !!errors.title}
                  style={{ backgroundColor: '#FF6B6B', color: 'white' }}
                  className="hover:opacity-90"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel('title')}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-lg font-medium">{challenge.title}</p>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Description</CardTitle>
              <CardDescription>Explain what this challenge is about</CardDescription>
            </div>
            {editingField !== 'description' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingField('description')}
                disabled={editingField !== null}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingField === 'description' ? (
            <form
              onSubmit={handleSubmit((values) => onSave('description', values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Textarea
                  {...register('description')}
                  placeholder="Describe the challenge"
                  rows={6}
                  disabled={isSaving}
                  autoFocus
                />
                {errors.description?.message && (
                  <span className="text-sm text-red-500">{errors.description.message}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || !!errors.description}
                  style={{ backgroundColor: '#FF6B6B', color: 'white' }}
                  className="hover:opacity-90"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel('description')}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{challenge.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Challenge dates and enrollment deadline</CardDescription>
            </div>
            {editingField !== 'dates' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingField('dates')}
                disabled={editingField !== null}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingField === 'dates' ? (
            <form
              onSubmit={handleSubmit((values) => onSave('dates', values))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    disabled={isSaving}
                  />
                  {errors.startDate?.message && (
                    <span className="text-sm text-red-500">{errors.startDate.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                    min={startDateValue}
                    disabled={isSaving}
                  />
                  {errors.endDate?.message && (
                    <span className="text-sm text-red-500">{errors.endDate.message}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollmentDeadline">Enrollment Deadline (Optional)</Label>
                <Input
                  id="enrollmentDeadline"
                  type="date"
                  {...register('enrollmentDeadline')}
                  max={startDateValue}
                  disabled={isSaving}
                />
                <div className="text-sm text-gray-500">
                  If not set, participants can enroll until the challenge starts
                </div>
                {errors.enrollmentDeadline?.message && (
                  <span className="text-sm text-red-500">{errors.enrollmentDeadline.message}</span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || !!errors.startDate || !!errors.endDate || !!errors.enrollmentDeadline}
                  style={{ backgroundColor: '#FF6B6B', color: 'white' }}
                  className="hover:opacity-90"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel('dates')}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div>
                <span className="font-medium">Start Date: </span>
                <span className="text-gray-700">
                  {new Date(challenge.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium">End Date: </span>
                <span className="text-gray-700">
                  {new Date(challenge.endDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium">Enrollment Deadline: </span>
                <span className="text-gray-700">
                  {challenge.enrollmentDeadline
                    ? new Date(challenge.enrollmentDeadline).toLocaleDateString()
                    : 'Until start date'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
