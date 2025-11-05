import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireWorkspaceAccessCanonical } from '@/lib/auth/session';
import EnrollButton from './enroll-button';
import { ChallengeRoleBadge } from '@/components/challenges/challenge-role-badge';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getParticipantChallenges(workspaceSlug: string, userId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      return null;
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        workspaceId: workspace.id,
        status: 'PUBLISHED',
        Enrollment: {
          some: {
            userId,
            status: { in: ['INVITED', 'ENROLLED'] }
          }
        }
      },
      include: {
        Enrollment: {
          where: { userId },
        },
        _count: {
          select: { Enrollment: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return challenges;
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return null;
  }
}

export default async function ParticipantChallengesPage({ params }: PageProps) {
  try {
    const { slug } = await params;
    const { user, workspace } = await requireWorkspaceAccessCanonical(slug);
    const challenges = await getParticipantChallenges(slug, user.id);

    if (!challenges) {
      notFound();
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Available Challenges</h1>
          <p className="text-gray-600">Browse and join challenges in your workspace</p>
        </div>

        {/* Search functionality removed - keep it simple */}

        {/* Challenges Grid */}
        {challenges.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
              <p className="text-gray-500">Check back later for new challenges to join</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="challenges-grid">
            {challenges.map((challenge) => {
              const enrollment = challenge.Enrollment[0];
              const isEnrolled = enrollment?.status === 'ENROLLED';
              const isInvited = enrollment?.status === 'INVITED';
              
              return (
                <Card 
                  key={challenge.id} 
                  className={`relative hover:shadow-lg transition-shadow ${
                    isInvited ? 'ring-2 ring-coral-500 bg-coral-50' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <ChallengeRoleBadge challengeId={challenge.id} workspaceSlug={slug} />
                        </div>
                        <CardDescription className="mt-1">
                          {challenge.description}
                        </CardDescription>
                      </div>
                      {isEnrolled && (
                        <Badge className="bg-green-100 text-green-800">
                          Enrolled
                        </Badge>
                      )}
                      {isInvited && (
                        <Badge className="bg-coral-100 text-coral-800">
                          Invited
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{challenge._count.Enrollment} participants</span>
                      </div>
                      <Badge variant="default">
                        ACTIVE
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    <div className="text-xs text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(challenge.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEnrolled && (
                        <EnrollButton 
                          challengeId={challenge.id} 
                          workspaceSlug={slug}
                          isInvited={isInvited}
                        />
                      )}
                      <Link href={`/w/${slug}/participant/challenges/${challenge.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          {isEnrolled ? 'View' : 'Details'}
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error loading challenges:', error);
    notFound();
  }
}