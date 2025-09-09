'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participants, setParticipants] = useState<{id: string, email: string}[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params?.slug && params?.id) {
      fetchChallenge();
      fetchParticipants();
    }
  }, [params?.slug, params?.id]);

  const fetchParticipants = async () => {
    if (!params?.slug) return;
    
    setLoadingParticipants(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/enrollments?participants=true`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      } else {
        console.error('Failed to fetch participants');
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

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
          participantIds: selectedParticipants
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
        <CardContent>
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

            {/* Participant Invitation Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <Label>Invite Additional Participants (Optional)</Label>
              </div>
              
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Loading participants...</span>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">
                  No participants found in this workspace
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Select participants to automatically enroll them in this challenge
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {participants.map((participant) => (
                      <label key={participant.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participant.id)}
                          onChange={() => handleParticipantToggle(participant.id)}
                          disabled={isSaving}
                          className="rounded border-gray-300 text-coral-600 focus:ring-coral-500"
                        />
                        <span className="text-sm text-gray-700">{participant.email}</span>
                      </label>
                    ))}
                  </div>
                  {selectedParticipants.length > 0 && (
                    <div className="text-sm text-coral-600">
                      {selectedParticipants.length} participant{selectedParticipants.length === 1 ? '' : 's'} selected for enrollment
                    </div>
                  )}
                </div>
              )}
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
                disabled={isSaving}
                className="bg-coral-500 hover:bg-coral-600"
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