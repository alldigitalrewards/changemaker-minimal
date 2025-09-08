import {
  Mail,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy-900 mb-4 flex items-center justify-center gap-3">
              <MessageCircle className="h-10 w-10 text-coral-600" />
              Get in Touch
            </h1>
            <p className="text-lg text-navy-600 max-w-2xl mx-auto">
              We're here to help you make the most of your Changemaker experience.
              Reach out with questions, feedback, or partnership opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-coral-200 bg-gradient-to-br from-coral-50 to-terracotta-50">
                <CardHeader>
                  <CardTitle className="text-navy-900 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-coral-600" />
                    Contact Information
                  </CardTitle>
                  <CardDescription className="text-navy-600">
                    Multiple ways to reach our support team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-coral-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-navy-900">Email Support</h4>
                      <p className="text-navy-600">support@changemaker.im</p>
                      <p className="text-sm text-gray-600">We respond within 24 hours</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-coral-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-navy-900">Live Chat</h4>
                      <p className="text-navy-600">Available in-app</p>
                      <p className="text-sm text-gray-600">Monday - Friday, 9 AM - 5 PM PST</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-coral-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-navy-900">Office</h4>
                      <p className="text-navy-600">San Francisco, CA</p>
                      <p className="text-sm text-gray-600">United States</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-coral-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-navy-900">Business Hours</h4>
                      <p className="text-navy-600">Monday - Friday</p>
                      <p className="text-sm text-gray-600">9:00 AM - 6:00 PM PST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Help */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-navy-900">Need Quick Help?</CardTitle>
                  <CardDescription className="text-navy-600">
                    Check out these resources first
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a href="/faq">
                      Browse FAQ
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a href="/help">
                      Help Documentation
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <a href="/how-it-works">
                      Getting Started Guide
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-navy-900 flex items-center gap-2">
                    <Send className="h-5 w-5 text-coral-600" />
                    Send us a Message
                  </CardTitle>
                  <CardDescription className="text-navy-600">
                    Fill out the form below and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">
                        Organization (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                        placeholder="Your Organization"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">
                        Subject *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                        required
                      >
                        <option value="">Select a topic</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing & Pricing</option>
                        <option value="partnership">Partnership Opportunities</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">
                        Message *
                      </label>
                      <textarea
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                        placeholder="Tell us how we can help you..."
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-coral-500 to-terracotta-600 text-white hover:from-coral-600 hover:to-terracotta-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                    </Button>

                    <p className="text-sm text-gray-600 text-center">
                      We typically respond within 24 hours during business days.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Support Options */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Community Forum</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect with other Changemaker users and share experiences
                </p>
                <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Schedule a Demo</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Book a personalized demo to see Changemaker in action
                </p>
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  Book Demo
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Partnership Inquiries</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Interested in partnering with Changemaker?
                </p>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}