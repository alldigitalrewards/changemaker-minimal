import { Suspense } from 'react';
import { ArrowRight, Users, Target, Award, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { CoralButton } from '@/components/ui/coral-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PublicNavbar from '@/components/navigation/public-navbar';

// Loading component for Suspense
function HomeLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded-lg w-3/4 mx-auto"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Public landing page
function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <Badge variant="secondary" className="mb-4">
            🚀 Transform Your Community
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-navy-900 leading-tight">
            Inspire Change Through
            <span className="text-coral-600 block">Community Challenges</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Join the Changemaker Platform and participate in meaningful
            challenges that drive positive impact in your community. Earn
            rewards, build connections, and make a difference.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <CoralButton asChild size="lg">
              <Link href="/how-it-works">
                See How
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </CoralButton>

            <CoralButton asChild variant="outline" size="lg">
              <Link href="/auth/login">
                Sign In
              </Link>
            </CoralButton>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-navy-900 mb-4">
            Why Choose Changemaker?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform empowers communities to create lasting positive change
            through structured challenges and meaningful engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-coral-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-coral-500 mx-auto mb-4" />
              <CardTitle className="text-navy-900">Community Driven</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Connect with like-minded individuals and organizations working
                toward common goals.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-navy-900">
                Meaningful Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Participate in carefully designed challenges that create
                real-world impact.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-emerald-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <Award className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <CardTitle className="text-navy-900">Earn Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Get recognized for your contributions with points, badges, and
                tangible rewards.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <TrendingUp className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <CardTitle className="text-navy-900">Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Monitor your impact and see how your efforts contribute to
                larger goals.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-coral-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto text-white space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl opacity-90">
              Join thousands of changemakers who are already creating positive
              impact in their communities.
            </p>
            <CoralButton asChild size="lg" variant="secondary">
              <Link href="/how-it-works">
                See How <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </CoralButton>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main page component
export default async function HomePage() {
  // Always show the public landing page - no automatic redirects
  return (
    <Suspense fallback={<HomeLoading />}>
      <PublicLandingPage />
    </Suspense>
  );
}
