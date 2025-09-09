'use client';

import { useState, useEffect } from 'react';
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

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams<{ slug: string; id: string }>();
  const { toast } = useToast();
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [enrollmentDeadline, setEnrollmentDeadline] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantData, setParticipantData] = useState<{ invited: string[]; enrolled: string[] }>({ invited: [], enrolled: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        setTitle(challengeData.title);
        setDescription(challengeData.description);
        setStartDate(challengeData.startDate ? new Date(challengeData.startDate).toISOString().split('T')[0] : '');
        setEndDate(challengeData.endDate ? new Date(challengeData.endDate).toISOString().split('T')[0] : '');
        setEnrollmentDeadline(challengeData.enrollmentDeadline ? new Date(challengeData.enrollmentDeadline).toISOString().split('T')[0] : '');
        
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!params?.slug || !params?.id) return;

    // Validation
    if (!startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Start date and end date are required',
        variant: 'destructive',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    if (enrollmentDeadline) {
      const enrollDeadline = new Date(enrollmentDeadline);
      if (enrollDeadline > start) {
        toast({
          title: 'Validation Error',
          description: 'Enrollment deadline must be before or on the start date',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description,
          startDate,
          endDate,
          enrollmentDeadline: enrollmentDeadline || undefined,
          invitedParticipantIds: participantData.invited,
          enrolledParticipantIds: participantData.enrolled
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter challenge title"
                required
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the challenge"
                rows={6}
                required
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={isSaving}
                />
                {!startDate && (
                  <span className="text-sm text-red-500">Start date is required</span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                  disabled={isSaving}
                />
                {!endDate && (
                  <span className="text-sm text-red-500">End date is required</span>
                )}
                {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                  <span className="text-sm text-red-500">End date must be after start date</span>
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
                value={enrollmentDeadline}
                onChange={(e) => setEnrollmentDeadline(e.target.value)}
                max={startDate}
                disabled={isSaving}
              />
              <div className="text-sm text-gray-500">
                If not set, participants can enroll until the challenge starts
              </div>
              {enrollmentDeadline && startDate && new Date(enrollmentDeadline) > new Date(startDate) && (
                <span className="text-sm text-red-500">Enrollment deadline must be before or on start date</span>
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

            <div className="flex justify-end space-x-2 pt-4">
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
                disabled={isSaving}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}