'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trophy, Users, Calendar, Search, UserPlus, Eye, Clock } from 'lucide-react';
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
  enrollments?: Array<{
    userId: string;
    status: string;
  }>;
}

export default function ParticipantChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [enrolledChallenges, setEnrolledChallenges] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
        const challengesArray = data.challenges || [];
        setChallenges(challengesArray);
        
        // Check which challenges the user is enrolled in
        const enrolledIds = new Set<string>();
        challengesArray.forEach((challenge: Challenge) => {
          if (challenge.enrollments && challenge.enrollments.length > 0) {
            enrolledIds.add(challenge.id);
          }
        });
        setEnrolledChallenges(enrolledIds);
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

  const handleEnroll = async (challengeId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${params?.slug}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });

      if (response.ok) {
        toast({
          title: 'Successfully enrolled!',
          description: 'You have joined this challenge.',
        });
        
        setEnrolledChallenges(prev => new Set(prev).add(challengeId));
        fetchChallenges(); // Refresh to get updated counts
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll in challenge',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (challengeId: string) => {
    router.push(`/w/${params?.slug}/participant/challenges/${challengeId}`);
  };

  const filteredChallenges = challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-navy-900">Available Challenges</h1>
        <p className="text-gray-600">Browse and join challenges in your workspace</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="search"
          placeholder="Search challenges..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Challenges Grid */}
      {filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
            <p className="text-gray-500">Check back later for new challenges to join</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => {
            const isEnrolled = enrolledChallenges.has(challenge.id);
            
            return (
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
                    {isEnrolled && (
                      <Badge className="bg-green-100 text-green-800">
                        Enrolled
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{challenge._count?.enrollments || 0} participants</span>
                    </div>
                    <Badge variant={challenge.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {challenge.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(challenge.createdAt), 'MMM d, yyyy')}
                  </div>
                  {!isEnrolled ? (
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnroll(challenge.id);
                      }}
                      disabled={isLoading}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(challenge.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}