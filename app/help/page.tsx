// Help page - static, no client components
import Link from 'next/link';
import {
  BookOpen,
  Download,
  FileText,
  HelpCircle,
  MessageCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HelpPage() {
  const helpSections = [
    {
      title: 'Help Documentation',
      description: 'Comprehensive guides and tutorials for using the Changemaker platform.',
      icon: BookOpen,
      href: '/help/docs',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Frequently Asked Questions',
      description: 'Quick answers to the most common questions about Changemaker.',
      icon: HelpCircle,
      href: '/faq',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Downloads & Templates',
      description: 'Access downloadable resources, templates, and helpful files.',
      icon: Download,
      href: '/help/downloads',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Contact Support',
      description: 'Get personalized help from our support team.',
      icon: MessageCircle,
      href: '/contact',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <Users className="h-10 w-10 text-orange-600" />
              Help & Support
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find the resources you need to make the most of the Changemaker platform
            </p>
          </div>

          {/* Main Help Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {helpSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Link href={section.href} key={index}>
                  <Card className={`${section.bgColor} ${section.borderColor} hover:shadow-lg transition-all duration-200 cursor-pointer h-full`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${section.bgColor}`}>
                          <Icon className={`h-6 w-6 ${section.color}`} />
                        </div>
                        <span className="text-gray-900">{section.title}</span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {section.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className={`w-full ${section.borderColor} ${section.color}`}>
                        Explore
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Links */}
          <Card className="bg-gradient-to-r from-orange-50 to-orange-50 border-orange-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-orange-600" />
                Quick Start Guide
              </CardTitle>
              <CardDescription className="text-gray-600">
                New to Changemaker? Start here for a quick overview
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/help/docs">
                  <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                    Getting Started
                  </Button>
                </Link>
                <Link href="/challenges">
                  <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                    Join Challenges
                  </Button>
                </Link>
                <Link href="/help/docs">
                  <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                    Earn Rewards
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}