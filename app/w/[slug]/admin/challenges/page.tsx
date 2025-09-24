'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Trash2, Edit, Eye, Users, Calendar, Trophy, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateChallengeButton } from '@/components/challenges/CreateChallengeButton';

interface Challenge {
  id: string;
  title: string;
  description: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: {
    enrollments: number;
  };
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();

  useEffect(() => {
    if (params?.slug) {
      fetchChallenges();
    }
  }, [params?.slug]);

  const fetchChallenges = async () => {
    if (!params?.slug) return;
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challenges',
        variant: 'destructive',
      });
    }
  };
  const getStatusChip = (c: Challenge) => {
    const now = new Date()
    const start = c.startDate ? new Date(c.startDate) : null
    const end = c.endDate ? new Date(c.endDate) : null
    const status = c.status || 'DRAFT'

    if (status === 'ARCHIVED') return { label: 'ARCHIVED', variant: 'secondary' as const }
    if (status !== 'PUBLISHED') return { label: 'DRAFT', variant: 'outline' as const }

    if (start && now < start) return { label: 'UPCOMING', variant: 'outline' as const }
    if (start && end && now >= start && now <= end) return { label: 'ACTIVE', variant: 'default' as const }
    return { label: 'ENDED', variant: 'secondary' as const }
  }


  const handleDeleteClick = (challenge: Challenge) => {
    setChallengeToDelete({ id: challenge.id, title: challenge.title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!challengeToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/workspaces/${params?.slug}/challenges/${challengeToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `"${challengeToDelete.title}" has been deleted successfully.`,
        });
        fetchChallenges();
        setDeleteDialogOpen(false);
        setChallengeToDelete(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete challenge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (challengeId: string) => {
    router.push(`/w/${params?.slug}/admin/challenges/${challengeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Challenges</h1>
          <p className="text-gray-600">Manage challenges for workspace: {params?.slug}</p>
        </div>
        
        <CreateChallengeButton workspaceSlug={params?.slug || ''} />
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first challenge</p>
            <CreateChallengeButton workspaceSlug={params?.slug || ''} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => (
            <Card 
              key={challenge.id} 
              className="relative hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCardClick(challenge.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {challenge.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(challenge.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/w/${params?.slug}/admin/challenges/${challenge.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(challenge);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{challenge._count?.enrollments || 0} enrolled</span>
                  </div>
                  {(() => {
                    const chip = getStatusChip(challenge)
                    return (
                      <Badge variant={chip.variant}>
                        {chip.label}
                      </Badge>
                    )
                  })()}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                Created {format(new Date(challenge.createdAt), 'MMM d, yyyy')}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-semibold">"{challengeToDelete?.title}"</span>?
              <br />
              <br />
              This action cannot be undone. This will permanently delete the challenge and remove all associated enrollments and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setChallengeToDelete(null);
                setDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <span className="animate-pulse">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Challenge
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}