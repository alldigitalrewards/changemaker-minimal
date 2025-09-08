'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewChallengePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    
    if (!params?.slug) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: trimmedTitle, 
          description: trimmedDescription 
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
  const isFormValid = isTitleValid && isDescriptionValid;

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
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="Enter challenge title"
                required
                disabled={isSaving}
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
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Describe the challenge objectives, requirements, and expectations"
                rows={6}
                required
                disabled={isSaving}
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
                className="bg-coral-500 hover:bg-coral-600 disabled:bg-gray-300"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Challenge
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