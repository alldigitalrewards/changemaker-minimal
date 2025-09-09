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

export default function NewChallengePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [enrollmentDeadline, setEnrollmentDeadline] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participants, setParticipants] = useState<{id: string, email: string}[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch workspace participants
  useEffect(() => {
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

    fetchParticipants();
  }, [params?.slug]);

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    
    if (trimmedTitle.length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Challenge title must be at least 3 characters long',
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmedDescription.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Challenge description must be at least 10 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate) {
      toast({
        title: 'Validation Error',
        description: 'Start date is required',
        variant: 'destructive',
      });
      return;
    }

    if (!endDate) {
      toast({
        title: 'Validation Error',
        description: 'End date is required',
        variant: 'destructive',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    if (start < today) {
      toast({
        title: 'Validation Error',
        description: 'Start date cannot be in the past',
        variant: 'destructive',
      });
      return;
    }

    if (end < start) {
      toast({
        title: 'Validation Error',
        description: 'End date must be on or after start date',
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
    
    if (!params?.slug) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: trimmedTitle, 
          description: trimmedDescription,
          startDate,
          endDate,
          enrollmentDeadline: enrollmentDeadline || undefined,
          participantIds: selectedParticipants
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Challenge created',
          description: 'Your challenge has been created successfully.',
        });
        // Redirect to the challenge details page
        router.push(`/w/${params.slug}/admin/challenges/${data.challenge.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create challenge');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create challenge',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/w/${params?.slug}/admin/challenges`);
  };

  const titleCharCount = title.length;
  const descriptionCharCount = description.length;
  const isTitleValid = title.trim().length >= 3;
  const isDescriptionValid = description.trim().length >= 10;
  const isStartDateValid = startDate.length > 0;
  const isEndDateValid = endDate.length > 0;
  const areDatesValid = isStartDateValid && isEndDateValid && new Date(endDate) >= new Date(startDate);
  const isFormValid = isTitleValid && isDescriptionValid && areDatesValid;

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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Challenge Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter challenge title"
                required
                disabled={isSaving}
                maxLength={100}
                className={!isTitleValid && title.length > 0 ? 'border-red-300' : ''}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {!isTitleValid && title.length > 0 ? (
                    <span className="text-red-500">Minimum 3 characters required</span>
                  ) : (
                    <span>Minimum 3 characters</span>
                  )}
                </span>
                <span className={titleCharCount > 90 ? 'text-amber-600' : ''}>
                  {titleCharCount}/100
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">
                Challenge Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the challenge objectives, requirements, and expectations"
                rows={6}
                required
                disabled={isSaving}
                maxLength={500}
                className={!isDescriptionValid && description.length > 0 ? 'border-red-300' : ''}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {!isDescriptionValid && description.length > 0 ? (
                    <span className="text-red-500">Minimum 10 characters required</span>
                  ) : (
                    <span>Minimum 10 characters</span>
                  )}
                </span>
                <span className={descriptionCharCount > 450 ? 'text-amber-600' : ''}>
                  {descriptionCharCount}/500
                </span>
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={isSaving}
                  className={!isStartDateValid && startDate.length === 0 ? 'border-red-300' : ''}
                />
                {!isStartDateValid && startDate.length === 0 && (
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
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                  disabled={isSaving}
                  className={!isEndDateValid && endDate.length === 0 ? 'border-red-300' : ''}
                />
                {!isEndDateValid && endDate.length === 0 && (
                  <span className="text-sm text-red-500">End date is required</span>
                )}
                {startDate && endDate && new Date(endDate) < new Date(startDate) && (
                  <span className="text-sm text-red-500">End date must be on or after start date</span>
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
                <Label>Invite Participants (Optional)</Label>
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
                      {selectedParticipants.length} participant{selectedParticipants.length === 1 ? '' : 's'} selected
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
                disabled={isSaving || !isFormValid}
                className="px-4 py-2 font-medium rounded-md shadow-sm inline-flex items-center transition-all"
                style={{
                  backgroundColor: isSaving || !isFormValid ? '#d1d5db' : '#ff6b6b',
                  color: isSaving || !isFormValid ? '#6b7280' : 'white',
                  cursor: isSaving || !isFormValid ? 'not-allowed' : 'pointer',
                  opacity: isSaving || !isFormValid ? 0.6 : 1
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" style={{ color: '#6b7280' }} />
                    <span style={{ color: '#6b7280' }}>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" style={{ color: isSaving || !isFormValid ? '#6b7280' : 'white' }} />
                    <span style={{ color: isSaving || !isFormValid ? '#6b7280' : 'white' }}>Create Challenge</span>
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