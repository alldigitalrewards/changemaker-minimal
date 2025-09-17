'use client';

import { useState, useEffect } from 'react';
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
import { StatusActions } from '../status-actions';
import { ChallengeActivities } from '@/components/activities/challenge-activities';

interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  enrollmentDeadline?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
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

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams<{ slug: string; id: string }>();
  const { toast } = useToast();
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantData, setParticipantData] = useState<{ invited: string[]; enrolled: string[] }>({ invited: [], enrolled: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      enrollmentDeadline: '',
    },
  });

  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');
  const enrollmentDeadlineValue = watch('enrollmentDeadline');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (params?.slug && params?.id) {
      fetchChallenge();
    }
  }, [params?.slug, params?.id]);

  const fetchChallenge = async () => {
    if (!params?.slug || !params?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        const challengeData = data.challenge || data;
        setChallenge(challengeData);
        reset({
          title: challengeData.title ?? '',
          description: challengeData.description ?? '',
          startDate: challengeData.startDate ? new Date(challengeData.startDate).toISOString().split('T')[0] : '',
          endDate: challengeData.endDate ? new Date(challengeData.endDate).toISOString().split('T')[0] : '',
          enrollmentDeadline: challengeData.enrollmentDeadline ? new Date(challengeData.enrollmentDeadline).toISOString().split('T')[0] : '',
        });
        
        // Load current participants by status
        if (challengeData.enrollments) {
          const invitedParticipants = challengeData.enrollments
            .filter((e: any) => e.status === 'INVITED')
            .map((e: any) => e.userId);
          const enrolledParticipants = challengeData.enrollments
            .filter((e: any) => e.status === 'ENROLLED')
            .map((e: any) => e.userId);
          
          setParticipantIds(invitedParticipants); // Keep for legacy support
          setParticipantData({ 
            invited: invitedParticipants,
            enrolled: enrolledParticipants 
          });
        }
      } else {
        throw new Error('Failed to fetch challenge');
      }
    } catch (error) {
      console.error('Failed to fetch challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challenge details',
        variant: 'destructive',
      });
      router.push(`/w/${params.slug}/admin/challenges`);
    } finally {
      setIsLoading(false);
      setInitialized(true);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!params?.slug || !params?.id) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          enrollmentDeadline: values.enrollmentDeadline || undefined,
          invitedParticipantIds: participantData.invited,
          enrolledParticipantIds: participantData.enrolled,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Challenge updated',
          description: 'Your challenge has been updated successfully.',
        });
        router.push(`/w/${params.slug}/admin/challenges/${params.id}`);
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

  // Debounced autosave for DRAFT challenges
  useEffect(() => {
    if (!initialized) return;
    if (!challenge) return;
    if (challenge.status !== 'DRAFT') return;
    if (!isValid) return;
    if (!isDirty && participantData) {
      // still allow autosave if participantData changed? we'll skip here
    }

    const timer = setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        const response = await fetch(`/api/workspaces/${params.slug}/challenges/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: watch('title').trim(),
            description: watch('description').trim(),
            startDate: startDateValue,
            endDate: endDateValue,
            enrollmentDeadline: enrollmentDeadlineValue || undefined,
            invitedParticipantIds: participantData.invited,
            enrolledParticipantIds: participantData.enrolled,
          }),
        });
        if (response.ok) {
          setLastSavedAt(Date.now());
        }
      } catch (_) {
        // quiet fail; global toasts reserved for explicit actions
      } finally {
        setIsAutoSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialized,
    challenge?.status,
    isValid,
    isDirty,
    startDateValue,
    endDateValue,
    enrollmentDeadlineValue,
    participantData.invited.join(','),
    participantData.enrolled.join(','),
  ]);

  // Warn on unsaved changes before navigation (hard refresh/close)
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
    const today = new Date();
    const todayStr = formatDate(today);
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

  const handleCancel = () => {
    router.push(`/w/${params?.slug}/admin/challenges/${params?.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Challenge not found</h3>
            <p className="text-gray-500 mb-4">The challenge you're looking for doesn't exist.</p>
            <Link href={`/w/${params?.slug}/admin/challenges`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Challenges
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/w/${params?.slug}/admin/challenges/${params?.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenge
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">Edit Challenge</h1>
        </div>
        {challenge?.status && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Status: {challenge.status}</span>
            <StatusActions workspaceSlug={params?.slug || ''} challengeId={params?.id || ''} status={(challenge.status as any) || 'DRAFT'} />
          </div>
        )}
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Challenge Details</CardTitle>
          <CardDescription>
            Update the challenge information below
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter challenge title"
                disabled={isSaving}
              />
              {errors.title?.message && (
                <span className="text-sm text-red-500">{errors.title.message}</span>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the challenge"
                rows={6}
                disabled={isSaving}
              />
              {errors.description?.message && (
                <span className="text-sm text-red-500">{errors.description.message}</span>
              )}
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
                  disabled={isSaving}
                />
                {errors.startDate?.message && (
                  <span className="text-sm text-red-500">{errors.startDate.message}</span>
                )}
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
                  min={startDateValue}
                  disabled={isSaving}
                />
                {errors.endDate?.message && (
                  <span className="text-sm text-red-500">{errors.endDate.message}</span>
                )}
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
              {errors.enrollmentDeadline?.message && (
                <span className="text-sm text-red-500">{errors.enrollmentDeadline.message}</span>
              )}
            </div>

            {/* Participant Management */}
            <ParticipantSelector
              workspaceSlug={params?.slug || ''}
              selectedParticipantIds={participantIds}
              onParticipantsChange={setParticipantIds}
              initialInvitedIds={participantData.invited}
              initialEnrolledIds={participantData.enrolled}
              onParticipantDataChange={setParticipantData}
              disabled={isSaving}
            />

            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-gray-500">
                {isAutoSaving ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : null}
              </div>
              <div className="flex gap-2">
                <Link href={`/w/${params?.slug}/participant/challenges/${params?.id}?preview=1`} target="_blank">
                  <Button type="button" variant="outline">Preview as participant</Button>
                </Link>
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
                    Save Changes
                  </>
                )}
              </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* Activities Section */}
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
          <CardDescription>Assign and configure activities for this challenge</CardDescription>
        </CardHeader>
        <CardContent>
          <ChallengeActivities challengeId={params?.id || ''} workspaceSlug={params?.slug || ''} />
        </CardContent>
      </Card>
    </div>
  );
}