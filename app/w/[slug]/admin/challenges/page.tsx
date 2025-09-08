'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Trash2, Edit, Eye, Users, Calendar, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: {
    enrollments: number;
  };
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
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
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingChallenge 
        ? `/api/workspaces/${params?.slug}/challenges/${editingChallenge.id}`
        : `/api/workspaces/${params?.slug}/challenges`;
      
      const method = editingChallenge ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (response.ok) {
        toast({
          title: editingChallenge ? 'Challenge updated' : 'Challenge created',
          description: editingChallenge 
            ? 'Your challenge has been updated successfully.'
            : 'Your challenge has been created successfully.',
        });
        
        setIsOpen(false);
        setTitle('');
        setDescription('');
        setEditingChallenge(null);
        fetchChallenges();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save challenge');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save challenge',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setTitle(challenge.title);
    setDescription(challenge.description);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const response = await fetch(`/api/workspaces/${params?.slug}/challenges/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Challenge deleted',
          description: 'The challenge has been deleted successfully.',
        });
        fetchChallenges();
      } else {
        throw new Error('Failed to delete challenge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete challenge',
        variant: 'destructive',
      });
    }
  };

  const handleCardClick = (challengeId: string) => {
    router.push(`/w/${params?.slug}/admin/challenges/${challengeId}`);
  };

  const resetModal = () => {
    setTitle('');
    setDescription('');
    setEditingChallenge(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Challenges</h1>
          <p className="text-gray-600">Manage challenges for workspace: {params?.slug}</p>
        </div>
        
        {/* Create Challenge Modal */}
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetModal();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-coral-500 hover:bg-coral-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
              </DialogTitle>
              <DialogDescription>
                {editingChallenge 
                  ? 'Update the challenge details below.'
                  : 'Fill in the details to create a new challenge for your workspace.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter challenge title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the challenge"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    resetModal();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-coral-500 hover:bg-coral-600"
                >
                  {isLoading ? 'Saving...' : (editingChallenge ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first challenge</p>
            <Dialog open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetModal();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-coral-500 hover:bg-coral-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Challenge
                </Button>
              </DialogTrigger>
            </Dialog>
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
                          handleEdit(challenge);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(challenge.id);
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
                  <Badge variant={challenge.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {challenge.status || 'ACTIVE'}
                  </Badge>
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
    </div>
  );
}