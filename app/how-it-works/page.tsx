import React from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/navigation/public-navbar';
import {
  Target,
  Zap,
  Users,
  Trophy,
  ArrowRight,
  Lightbulb,
  Heart,
  Play,
  CheckCircle2,
  Rocket,
  Globe,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CoralButton } from '@/components/ui/coral-button';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 bg-coral-100 text-coral-700 px-6 py-3 rounded-full text-sm font-semibold shadow-md">
            <Play className="h-4 w-4 text-coral-700" />
            <span className="text-coral-700 font-semibold">Platform Guide</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-navy-900">How </span>
              <span className="text-coral-600">
                Changemaker
              </span>
              <br className="hidden sm:block" />
              <span className="text-navy-900">Works</span>
            </h1>

            <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto font-medium">
              Turn your innovative ideas into real-world impact through our
              proven methodology for creating positive change.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/challenges">
              <CoralButton size="lg" className="w-full sm:w-auto px-8 py-4">
                Explore Challenges
                <ArrowRight className="ml-2 h-5 w-5 inline-block" />
              </CoralButton>
            </Link>
            <Link href="/about">
              <CoralButton variant="outline" size="lg" className="w-full sm:w-auto px-8 py-4">
                Learn More
              </CoralButton>
            </Link>
          </div>
        </div>
      </section>

      {/* The 3-Step Process */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Target className="h-4 w-4" />
              Proven Methodology
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Three Steps to <span className="text-orange-600">Real Impact</span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Our simple yet powerful framework helps you transform ideas into
              meaningful change
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <Card className="h-full p-8 lg:p-10 hover:shadow-xl transition-all duration-500 border-0 bg-white">
              <div className="absolute -top-6 left-8">
                <div className="bg-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
              </div>
              <div className="pt-8">
                <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mb-8">
                  <Target className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
                  Discover
                </h3>
                <p className="text-gray-700 leading-relaxed mb-8 text-lg">
                  Identify meaningful opportunities for positive change in
                  your community, workplace, or world around you.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Observe current challenges</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Research root causes</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Define clear goals</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="h-full p-8 lg:p-10 hover:shadow-xl transition-all duration-500 border-0 bg-white">
              <div className="absolute -top-6 left-8">
                <div className="bg-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
              </div>
              <div className="pt-8">
                <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mb-8">
                  <Zap className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
                  Design
                </h3>
                <p className="text-gray-700 leading-relaxed mb-8 text-lg">
                  Create innovative solutions through collaborative thinking,
                  research, and iterative design processes.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Brainstorm creative solutions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Build detailed action plans</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Test with stakeholders</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="h-full p-8 lg:p-10 hover:shadow-xl transition-all duration-500 border-0 bg-white">
              <div className="absolute -top-6 left-8">
                <div className="bg-gray-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
              </div>
              <div className="pt-8">
                <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mb-8">
                  <Rocket className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
                  Deploy
                </h3>
                <p className="text-gray-700 leading-relaxed mb-8 text-lg">
                  Launch your initiative with support, track meaningful
                  progress, and amplify your positive impact.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Execute with confidence</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Monitor and optimize</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600">Scale successful outcomes</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Types of Challenges */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Challenges for Every <span className="text-orange-600">Passion</span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Find the perfect opportunity to make an impact in areas you care about most
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="bg-orange-100 p-4 rounded-2xl flex-shrink-0">
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Community Impact
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Address local issues, improve public services, and
                    strengthen community bonds through collaborative initiatives.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="bg-orange-100 p-4 rounded-2xl flex-shrink-0">
                  <Globe className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Environmental Action
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Create sustainable solutions, reduce environmental impact,
                    and promote eco-friendly practices in your area.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="bg-gray-100 p-4 rounded-2xl flex-shrink-0">
                  <Lightbulb className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Innovation & Technology
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Develop digital solutions, improve processes through
                    technology, and drive innovation in your field.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-orange-200 p-8 lg:p-12 rounded-3xl">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Trophy className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    What You'll Gain
                  </h4>
                  <p className="text-gray-600">
                    Every challenge provides valuable rewards
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Real-world problem-solving experience</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Professional network expansion</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Skills development and growth</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Recognition for your contributions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Mentorship from industry experts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-gray-700">Portfolio-worthy project outcomes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories - Hardcoded */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Changemakers in <span className="text-orange-600">Action</span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              See how participants like you are creating meaningful change in their communities
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-xl transition-all duration-300 bg-orange-50 border border-orange-200">
              <div className="mb-6">
                <Trophy className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Community Garden Project
                </h3>
                <p className="text-orange-700 font-semibold text-sm">
                  Environmental Impact
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "Our team transformed an unused lot into a thriving community
                garden that now feeds 50+ families and brings neighbors together
                every weekend."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-sm">SJ</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Sarah Johnson</p>
                  <p className="text-gray-600 text-xs">Challenge Winner 2024</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 bg-orange-50 border border-orange-200">
              <div className="mb-6">
                <Zap className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Digital Literacy Program
                </h3>
                <p className="text-orange-700 font-semibold text-sm">
                  Education & Technology
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "We created a free coding bootcamp for underserved youth. 89% of
                our first cohort landed tech internships within 6 months."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-sm">MR</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Marcus Rivera</p>
                  <p className="text-gray-600 text-xs">Innovation Award 2024</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 bg-gray-50 border border-gray-200">
              <div className="mb-6">
                <Heart className="h-12 w-12 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Mental Health Support Network
                </h3>
                <p className="text-gray-700 font-semibold text-sm">
                  Community Wellness
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                "Our peer support platform connected over 200 individuals with
                mental health resources and reduced emergency interventions by 40%."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-bold text-sm">AP</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Aisha Patel</p>
                  <p className="text-gray-600 text-xs">Impact Leader 2024</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-coral-500/5"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="space-y-8">
              <h2 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-gray-900">Transform Ideas Into </span>
                <span className="text-coral-600">Real Change</span>
              </h2>

              <p className="text-xl lg:text-2xl text-gray-700 leading-relaxed max-w-4xl mx-auto font-medium">
                Join a global community of changemakers who are solving real
                problems and creating lasting positive impact. Your journey to
                meaningful change starts now.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Link href="/challenges">
                <CoralButton size="lg" className="w-full sm:w-auto">
                  <Rocket className="mr-3 h-5 w-5 inline-block" />
                  Explore Challenges
                  <ArrowRight className="ml-3 h-5 w-5 inline-block" />
                </CoralButton>
              </Link>
              <Link href="/contact">
                <CoralButton variant="outline" size="lg" className="w-full sm:w-auto">
                  Get in Touch
                </CoralButton>
              </Link>
            </div>

            <div className="pt-8">
              <p className="text-gray-600 text-sm font-medium">
                Join 10,000+ changemakers already creating positive impact worldwide
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}