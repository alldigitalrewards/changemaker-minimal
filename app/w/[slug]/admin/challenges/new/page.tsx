'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ParticipantSelector } from '@/components/ui/participant-selector';
import { ActivityAddDialog } from '@/components/activities/ActivityAddDialog';

const formSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(500, 'Description must be at most 500 characters'),
    startDate: z.string().min(1, 'Start date is required').refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid start date'),
    endDate: z.string().min(1, 'End date is required').refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid end date'),
    enrollmentDeadline: z.string().optional().refine((s) => (s ? !Number.isNaN(Date.parse(s)) : true), 'Invalid enrollment deadline'),
  })
  .refine((data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(), {
    path: ['endDate'],
    message: 'End date must be on or after start date',
  })
  .refine((data) => !data.enrollmentDeadline || new Date(data.enrollmentDeadline).getTime() <= new Date(data.startDate).getTime(), {
    path: ['enrollmentDeadline'],
    message: 'Enrollment deadline must be before or on start date',
  });

type FormValues = z.infer<typeof formSchema>;

export default function NewChallengePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantData, setParticipantData] = useState<{ invited: string[]; enrolled: string[] }>({ invited: [], enrolled: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [draftActivities, setDraftActivities] = useState<Array<{ templateId: string; pointsValue: number; maxSubmissions: number; deadline: string | null; isRequired: boolean; template?: any }>>([])
  const [workspaceBudget, setWorkspaceBudget] = useState<{ totalBudget: number; allocated: number } | null>(null)
  const [initialChallengeBudget, setInitialChallengeBudget] = useState<string>('')

  const { register, handleSubmit, watch, reset, formState: { errors, isValid, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: { title: '', description: '', startDate: '', endDate: '', enrollmentDeadline: '' },
  });

  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');
  const enrollmentDeadlineValue = watch('enrollmentDeadline');

  const onSubmit = async (values: FormValues) => {
    if (!params?.slug) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: values.title.trim(),
          description: values.description.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          enrollmentDeadline: values.enrollmentDeadline || undefined,
          invitedParticipantIds: participantData.invited.length > 0 ? participantData.invited : undefined,
          enrolledParticipantIds: participantData.enrolled.length > 0 ? participantData.enrolled : undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Assign any draft activities sequentially (best-effort)
        try {
          for (const a of draftActivities) {
            await fetch(`/api/workspaces/${params.slug}/challenges/${data.challenge.id}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                templateId: a.templateId,
                pointsValue: a.pointsValue,
                maxSubmissions: a.maxSubmissions,
                deadline: a.deadline,
                isRequired: a.isRequired
              })
            })
          }
        } catch {}
        // Optional: set initial challenge points budget
        try {
          const b = Number(initialChallengeBudget)
          if (!Number.isNaN(b) && initialChallengeBudget.trim() !== '') {
            await fetch(`/api/workspaces/${params.slug}/challenges/${data.challenge.id}/budget`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ totalBudget: Math.max(0, b) })
            })
          }
        } catch {}
        toast({ title: 'Challenge created', description: 'Your challenge has been created successfully.' });
        router.push(`/w/${params.slug}/admin/challenges/${data.challenge.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create challenge');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create challenge', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/w/${params?.slug}/admin/challenges`);
  };

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const setToday = () => {
    const todayStr = formatDate(new Date());
    reset({
      title: watch('title'),
      description: watch('description'),
      startDate: todayStr,
      endDate: endDateValue,
      enrollmentDeadline: enrollmentDeadlineValue,
    }, { keepErrors: true, keepDirty: true });
  };
  const addOneWeek = () => {
    if (!startDateValue) return;
    const d = new Date(startDateValue);
    d.setDate(d.getDate() + 7);
    reset({
      title: watch('title'),
      description: watch('description'),
      startDate: startDateValue,
      endDate: formatDate(d),
      enrollmentDeadline: enrollmentDeadlineValue,
    }, { keepErrors: true, keepDirty: true });
  };

  useEffect(() => {
    const load = async () => {
      if (!params?.slug) return
      try {
        const res = await fetch(`/api/workspaces/${params.slug}/points`)
        if (res.ok) {
          const j = await res.json()
          setWorkspaceBudget(j.budget || { totalBudget: 0, allocated: 0 })
        }
      } catch {}
    }
    load()
  }, [params?.slug])

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/w/${params?.slug}/admin/challenges`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">Create Challenge</h1>
        </div>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Challenge Details</CardTitle>
          <CardDescription>
            Fill in the details to create a new challenge for your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Challenge Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter challenge title"
                required
                disabled={isSaving}
                maxLength={100}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{errors.title?.message ? (<span className="text-red-500">{errors.title.message}</span>) : 'Minimum 3 characters'}</span>
                <span>{(watch('title') || '').length}/100</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">
                Challenge Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the challenge objectives, requirements, and expectations"
                rows={6}
                required
                disabled={isSaving}
                maxLength={500}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{errors.description?.message ? (<span className="text-red-500">{errors.description.message}</span>) : 'Minimum 10 characters'}</span>
                <span>{(watch('description') || '').length}/500</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  required
                  disabled={isSaving}
                />
                {errors.startDate?.message && (<span className="text-sm text-red-500">{errors.startDate.message}</span>)}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" type="button" size="sm" onClick={setToday} disabled={isSaving}>Today</Button>
                  <Button variant="outline" type="button" size="sm" onClick={addOneWeek} disabled={isSaving || !startDateValue}>+1 week (end)</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  min={startDateValue || new Date().toISOString().split('T')[0]}
                  required
                  disabled={isSaving}
                />
                {errors.endDate?.message && (<span className="text-sm text-red-500">{errors.endDate.message}</span>)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentDeadline">
                Enrollment Deadline (Optional)
              </Label>
              <Input
                id="enrollmentDeadline"
                type="date"
                {...register('enrollmentDeadline')}
                max={startDateValue}
                disabled={isSaving}
              />
              <div className="text-sm text-gray-500">
                If not set, participants can enroll until the challenge starts. Times use your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
              </div>
              {errors.enrollmentDeadline?.message && (<span className="text-sm text-red-500">{errors.enrollmentDeadline.message}</span>)}
            </div>

            {/* Participant Management */}
            <ParticipantSelector
              workspaceSlug={params?.slug || ''}
              selectedParticipantIds={participantIds}
              onParticipantsChange={setParticipantIds}
              onParticipantDataChange={setParticipantData}
              disabled={isSaving}
            />

            {/* Activities before create (optional) */}
            <div className="space-y-3">
              <Label>Activities (optional)</Label>
              {draftActivities.length === 0 ? (
                <div className="text-sm text-gray-600">No activities added yet</div>
              ) : (
                <div className="space-y-2">
                  {draftActivities.map((a, idx) => (
                    <div key={idx} className="border rounded p-3 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{a.template?.name || 'Template'}</div>
                        <div className="text-gray-600">{a.pointsValue} pts • Max {a.maxSubmissions} • {a.isRequired ? 'Required' : 'Optional'}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setDraftActivities(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
              <ActivityAddDialog
                mode="local"
                workspaceSlug={params?.slug || ''}
                onAdd={(activity) => setDraftActivities(prev => [...prev, activity])}
                trigger={<Button type="button" variant="outline">Add Activity</Button>}
              />
            </div>

            {/* Initial Budget (optional) */}
            <div className="space-y-2">
              <Label htmlFor="initialBudget">Challenge Points Budget (optional)</Label>
              <div className="text-sm text-gray-500">Set an initial budget for this challenge. If left blank, the workspace budget will be used for awards.</div>
              {workspaceBudget && (
                <div className="text-xs text-gray-600">Workspace budget: total {workspaceBudget.totalBudget} · allocated {workspaceBudget.allocated} · remaining {Math.max(0, (workspaceBudget.totalBudget||0)-(workspaceBudget.allocated||0))}</div>
              )}
              <div className="flex items-end gap-2 max-w-md">
                <Input
                  id="initialBudget"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g., 2000"
                  value={initialChallengeBudget}
                  onChange={(e) => setInitialChallengeBudget(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || !isValid}
                className="px-4 py-2 font-medium rounded-md shadow-sm inline-flex items-center transition-all"
                style={{
                  backgroundColor: isSaving || !isValid ? '#d1d5db' : '#ff6b6b',
                  color: isSaving || !isValid ? '#6b7280' : 'white',
                  cursor: isSaving || !isValid ? 'not-allowed' : 'pointer',
                  opacity: isSaving || !isValid ? 0.6 : 1
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" style={{ color: '#6b7280' }} />
                    <span style={{ color: '#6b7280' }}>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" style={{ color: isSaving || !isValid ? '#6b7280' : 'white' }} />
                    <span style={{ color: isSaving || !isValid ? '#6b7280' : 'white' }}>Create Challenge</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}