import {
  HelpCircle,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Static FAQ data - no API calls needed for MVP
const featuredFaqs = [
  {
    id: '1',
    question: 'How do I join a challenge?',
    answer: 'To join a challenge, navigate to your workspace, browse available challenges, and click the "Enroll" button. You\'ll be able to track your progress and submit updates through your participant dashboard.',
    category: 'challenges',
    tags: ['enrollment', 'getting-started'],
  },
  {
    id: '2',
    question: 'How do I earn rewards?',
    answer: 'Rewards are earned by completing challenges and meeting their requirements. Points are automatically tracked, and badges are awarded for achievements. Check your dashboard to see your current progress.',
    category: 'rewards',
    tags: ['points', 'badges'],
  },
  {
    id: '3',
    question: 'What is a workspace?',
    answer: 'A workspace is your organization\'s dedicated area within Changemaker. It contains all your challenges, participants, and administrative settings. Each workspace has its own unique URL and branding.',
    category: 'getting-started',
    tags: ['workspace', 'organization'],
  },
];

const allFaqs = [
  {
    id: '4',
    question: 'How do I reset my password?',
    answer: 'You can reset your password through the login page by clicking "Forgot Password". You\'ll receive an email with instructions to create a new password.',
    category: 'account',
    tags: ['password', 'login'],
  },
  {
    id: '5',
    question: 'Can I participate in multiple challenges at once?',
    answer: 'Yes! You can join and participate in multiple challenges simultaneously. Your progress is tracked separately for each challenge.',
    category: 'challenges',
    tags: ['multiple', 'enrollment'],
  },
  {
    id: '6',
    question: 'How do I update my profile?',
    answer: 'Access your profile settings through your dashboard menu. You can update your name, bio, and other personal information there.',
    category: 'account',
    tags: ['profile', 'settings'],
  },
  {
    id: '7',
    question: 'What types of challenges are available?',
    answer: 'Challenges can range from community service projects to skill-building activities. Each challenge has its own requirements, timeline, and rewards structure.',
    category: 'challenges',
    tags: ['types', 'variety'],
  },
  {
    id: '8',
    question: 'How do I contact support?',
    answer: 'You can reach our support team through the contact form on our help pages, or by emailing support@changemaker.im.',
    category: 'technical',
    tags: ['support', 'help'],
  },
];

const categoryOptions = [
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'challenges', label: 'Challenges & Activities' },
  { value: 'rewards', label: 'Rewards & Points' },
  { value: 'account', label: 'Account & Profile' },
  { value: 'technical', label: 'Technical Support' },
];

function FAQItem({ faq, isFeatured = false }: { faq: typeof allFaqs[0]; isFeatured?: boolean }) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isFeatured ? 'border-coral-200 bg-coral-50/30' : ''
    }`}>
      <CardHeader>
        <CardTitle className="text-left text-navy-900 flex items-center gap-2">
          {isFeatured && <Star className="h-4 w-4 text-coral-500" />}
          {faq.question}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {categoryOptions.find(cat => cat.value === faq.category)?.label || faq.category}
          </Badge>
          {faq.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">{faq.answer}</p>
      </CardContent>
    </Card>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-navy-900 mb-4 flex items-center justify-center gap-3">
              <HelpCircle className="h-10 w-10 text-coral-600" />
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-navy-600 max-w-2xl mx-auto">
              Find quick answers to common questions about the Changemaker platform
            </p>
          </div>

          {/* Featured FAQs */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Star className="h-6 w-6 text-coral-500" />
              Popular Questions
            </h2>
            <div className="space-y-4">
              {featuredFaqs.map(faq => (
                <FAQItem key={faq.id} faq={faq} isFeatured={true} />
              ))}
            </div>
          </div>

          {/* All FAQs */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-navy-900 mb-6">
              All Questions & Answers
            </h2>
            <div className="space-y-4">
              {allFaqs.map(faq => (
                <FAQItem key={faq.id} faq={faq} />
              ))}
            </div>
          </div>

          {/* Need More Help Section */}
          <Card className="bg-gradient-to-r from-coral-50 to-terracotta-50 border-coral-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-navy-900">
                Can't find what you're looking for?
              </CardTitle>
              <CardDescription className="text-navy-600">
                Get personalized help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/help">
                  <Badge variant="outline" className="border-coral-300 text-coral-700 hover:bg-coral-50 px-6 py-2 cursor-pointer">
                    Browse Documentation
                  </Badge>
                </a>
                <a href="/contact">
                  <Badge className="bg-gradient-to-r from-coral-500 to-terracotta-600 text-white hover:from-coral-600 hover:to-terracotta-700 px-6 py-2 cursor-pointer">
                    Contact Support
                  </Badge>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}