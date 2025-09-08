// About page - static, no client components, hardcoded data
import React from 'react';
import Link from 'next/link';
import {
  Target,
  Users,
  Lightbulb,
  Heart,
  Award,
  TrendingUp,
  Shield,
  Sparkles,
  ChevronRight,
  Globe,
  Rocket,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Transforming Ideas into Impact
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              We empower organizations to unlock innovation through
              collaborative challenges and meaningful initiatives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/challenges">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                >
                  Explore Challenges
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  Learn How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-orange-600 font-medium">
                  <Target className="h-5 w-5" />
                  Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Bridging Innovation and Implementation
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  The Changemaker Platform connects visionary organizations with
                  passionate innovators. We believe that the best solutions come
                  from diverse perspectives working together toward common
                  goals.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Through structured challenges and supportive frameworks, we
                  help transform bold ideas into practical solutions that drive
                  real change in communities and organizations.
                </p>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-orange-100 to-orange-100 rounded-2xl p-8 md:p-12">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600 mb-2">
                        500+
                      </div>
                      <div className="text-gray-700">Active Challenges</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600 mb-2">
                        10K+
                      </div>
                      <div className="text-gray-700">Changemakers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600 mb-2">
                        85%
                      </div>
                      <div className="text-gray-700">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600 mb-2">
                        50+
                      </div>
                      <div className="text-gray-700">Organizations</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-orange-50/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-orange-600 font-medium mb-4">
                <Heart className="h-5 w-5" />
                Our Values
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Principles That Guide Us
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Every decision we make is rooted in these core values that shape
                our platform and community.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Innovation First
                </h3>
                <p className="text-gray-700">
                  We believe in the power of fresh ideas and creative thinking
                  to solve complex challenges.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Inclusive Collaboration
                </h3>
                <p className="text-gray-700">
                  Everyone has valuable insights. We foster environments where
                  all voices are heard and respected.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Measurable Impact
                </h3>
                <p className="text-gray-700">
                  We focus on solutions that create tangible, positive change
                  that can be tracked and celebrated.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Trust & Transparency
                </h3>
                <p className="text-gray-700">
                  We build trust through open communication, fair processes, and
                  transparent operations.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Excellence
                </h3>
                <p className="text-gray-700">
                  We strive for excellence in every aspect, from platform
                  features to community support.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Continuous Growth
                </h3>
                <p className="text-gray-700">
                  We embrace learning, feedback, and evolution to better serve
                  our community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-orange-600 font-medium mb-4">
                <Rocket className="h-5 w-5" />
                How We Work
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Approach to Innovation
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Organizations Define Challenges
                  </h3>
                  <p className="text-gray-700">
                    Companies and institutions present real-world problems that
                    need innovative solutions, setting clear goals and criteria
                    for success.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Changemakers Propose Solutions
                  </h3>
                  <p className="text-gray-700">
                    Creative individuals and teams develop innovative
                    initiatives, leveraging diverse perspectives and expertise
                    to tackle challenges.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Collaborative Implementation
                  </h3>
                  <p className="text-gray-700">
                    Selected initiatives receive support, resources, and
                    mentorship to transform ideas into actionable solutions with
                    measurable impact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-white to-orange-50/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-orange-600 font-medium mb-4">
                <Star className="h-5 w-5" />
                Our Team
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Driven by Passion for Change
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Our diverse team brings together expertise in technology,
                innovation management, and community building to create a
                platform that truly makes a difference.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    A Global Perspective
                  </h3>
                  <p className="text-gray-700 mb-4">
                    With team members across continents and backgrounds spanning
                    technology, business, education, and social impact, we bring
                    a truly global perspective to innovation challenges.
                  </p>
                  <p className="text-gray-700 mb-6">
                    We're united by our belief that when diverse minds
                    collaborate on meaningful problems, extraordinary solutions
                    emerge.
                  </p>
                  <Link href="/contact">
                    <Button variant="outline">
                      Get in Touch
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
                    <Globe className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                    <div className="font-semibold text-gray-900">
                      15+ Countries
                    </div>
                    <div className="text-sm text-gray-700">Represented</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
                    <Users className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                    <div className="font-semibold text-gray-900">
                      50+ Experts
                    </div>
                    <div className="text-sm text-gray-700">On Our Team</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
                    <Lightbulb className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                    <div className="font-semibold text-gray-900">
                      1000+ Ideas
                    </div>
                    <div className="text-sm text-gray-700">Implemented</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
                    <Heart className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                    <div className="font-semibold text-gray-900">
                      100% Passion
                    </div>
                    <div className="text-sm text-gray-700">For Impact</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl mb-8 text-gray-100">
              Join thousands of changemakers who are turning innovative ideas
              into real-world impact.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  Get Started Today
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/challenges">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Browse Challenges
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}