import {
  Target,
  Calendar,
  Users,
  Award,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Static challenge data for MVP - no API calls needed
const featuredChallenges = [
  {
    id: '1',
    title: 'Community Garden Initiative',
    description: 'Help create and maintain community gardens in urban areas. Plant vegetables, flowers, and herbs while building connections with neighbors.',
    category: 'Environment',
    difficulty: 'Beginner',
    duration: '30 days',
    participants: 142,
    points: 500,
    status: 'Active',
    image: '/placeholder-garden.jpg',
  },
  {
    id: '2',
    title: 'Digital Literacy Mentorship',
    description: 'Teach basic computer and internet skills to seniors in your community. Make technology accessible for everyone.',
    category: 'Education',
    difficulty: 'Intermediate',
    duration: '45 days',
    participants: 89,
    points: 750,
    status: 'Active',
    image: '/placeholder-mentorship.jpg',
  },
  {
    id: '3',
    title: 'Local Business Support Campaign',
    description: 'Promote and support small businesses in your neighborhood through social media, reviews, and community events.',
    category: 'Economic Development',
    difficulty: 'Beginner',
    duration: '21 days',
    participants: 234,
    points: 400,
    status: 'Active',
    image: '/placeholder-business.jpg',
  },
];

const allChallenges = [
  {
    id: '4',
    title: 'Beach Cleanup Drive',
    description: 'Organize and participate in beach cleanup activities. Remove plastic waste and educate others about ocean conservation.',
    category: 'Environment',
    difficulty: 'Beginner',
    duration: '14 days',
    participants: 67,
    points: 300,
    status: 'Active',
  },
  {
    id: '5',
    title: 'Youth Sports Coaching',
    description: 'Volunteer as a coach for local youth sports teams. Help kids develop athletic skills and teamwork.',
    category: 'Sports & Recreation',
    difficulty: 'Advanced',
    duration: '60 days',
    participants: 34,
    points: 1000,
    status: 'Active',
  },
  {
    id: '6',
    title: 'Food Bank Volunteer',
    description: 'Sort, pack, and distribute food to families in need. Make a direct impact on food insecurity in your area.',
    category: 'Social Services',
    difficulty: 'Beginner',
    duration: '30 days',
    participants: 156,
    points: 600,
    status: 'Active',
  },
  {
    id: '7',
    title: 'Senior Companion Program',
    description: 'Spend time with elderly residents in nursing homes. Provide companionship and engage in activities together.',
    category: 'Social Services',
    difficulty: 'Intermediate',
    duration: '45 days',
    participants: 78,
    points: 800,
    status: 'Active',
  },
  {
    id: '8',
    title: 'Neighborhood Watch Initiative',
    description: 'Help establish and participate in neighborhood watch programs to improve community safety and engagement.',
    category: 'Public Safety',
    difficulty: 'Intermediate',
    duration: '90 days',
    participants: 43,
    points: 900,
    status: 'Active',
  },
];

const categories = [
  'All Categories',
  'Environment',
  'Education',
  'Social Services',
  'Economic Development',
  'Sports & Recreation',
  'Public Safety',
  'Health & Wellness',
  'Arts & Culture',
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Intermediate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Advanced':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

function ChallengeCard({ challenge, featured = false }: { challenge: typeof allChallenges[0]; featured?: boolean }) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      featured ? 'border-coral-200 bg-gradient-to-br from-coral-50 to-terracotta-50' : 'hover:border-coral-200'
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-navy-900 flex items-center gap-2 mb-2">
              {featured && <Target className="h-5 w-5 text-coral-500" />}
              {challenge.title}
            </CardTitle>
            <CardDescription className="text-navy-600">
              {challenge.description}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="outline" className="text-xs">
            {challenge.category}
          </Badge>
          <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {challenge.points} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {challenge.duration}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {challenge.participants} joined
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            {challenge.points} pts
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            asChild
            size="sm" 
            className="flex-1 bg-coral-600 hover:bg-coral-700 text-white"
          >
            <Link href="/auth/login">
              Join Challenge
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button 
            asChild
            variant="outline" 
            size="sm"
            className="border-coral-300 text-coral-600 hover:bg-coral-50"
          >
            <Link href={`/challenges/${challenge.id}`}>
              Learn More
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChallengesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy-900 mb-4 flex items-center justify-center gap-3">
              <Target className="h-10 w-10 text-coral-600" />
              Community Challenges
            </h1>
            <p className="text-lg text-navy-600 max-w-3xl mx-auto">
              Join meaningful challenges that create positive impact in your community.
              Earn points, build connections, and make a difference one challenge at a time.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="text-center border-coral-200 bg-gradient-to-br from-coral-50 to-terracotta-50">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-coral-600 mb-2">150+</div>
                <div className="text-sm text-navy-600">Active Challenges</div>
              </CardContent>
            </Card>
            <Card className="text-center border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">2,400+</div>
                <div className="text-sm text-navy-600">Participants</div>
              </CardContent>
            </Card>
            <Card className="text-center border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-emerald-600 mb-2">850K+</div>
                <div className="text-sm text-navy-600">Points Earned</div>
              </CardContent>
            </Card>
            <Card className="text-center border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">12</div>
                <div className="text-sm text-navy-600">Categories</div>
              </CardContent>
            </Card>
          </div>

          {/* Featured Challenges */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-navy-900">Featured Challenges</h2>
              <Button asChild variant="outline" className="border-coral-300 text-coral-600 hover:bg-coral-50">
                <Link href="/auth/login">
                  Join to See All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} featured={true} />
              ))}
            </div>
          </div>

          {/* All Challenges */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy-900 mb-8">All Challenges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {categories.slice(1).map(category => (
                <Button
                  key={category}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start border-gray-300 hover:border-coral-300 hover:bg-coral-50"
                  asChild
                >
                  <Link href={`/challenges?category=${encodeURIComponent(category)}`}>
                    <div>
                      <div className="font-medium text-navy-900">{category}</div>
                      <div className="text-xs text-gray-600">View challenges</div>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-coral-500 to-terracotta-600 border-none text-white">
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join our community of changemakers and start participating in challenges
                that align with your values and interests.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-white text-coral-600 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link href="/auth/signup">
                    Get Started Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-coral-600"
                >
                  <Link href="/how-it-works">
                    Learn How It Works
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}