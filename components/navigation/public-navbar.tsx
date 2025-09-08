'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X, Target } from 'lucide-react';

export default function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-terracotta-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-navy-900">Changemaker</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/how-it-works"
              className="text-gray-600 hover:text-coral-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/faq"
              className="text-gray-600 hover:text-coral-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-coral-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Contact
            </Link>
            <div className="flex items-center space-x-3">
              <Button
                asChild
                variant="outline"
                className="border-coral-500 text-coral-600 hover:bg-coral-50"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-coral-600 hover:bg-coral-700 text-white"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-coral-600 p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <Link
              href="/how-it-works"
              className="block px-3 py-2 text-gray-600 hover:text-coral-600 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/faq"
              className="block px-3 py-2 text-gray-600 hover:text-coral-600 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 text-gray-600 hover:text-coral-600 text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-4 pb-2 border-t border-gray-200 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full border-coral-500 text-coral-600 hover:bg-coral-50"
              >
                <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button
                asChild
                className="w-full bg-coral-600 hover:bg-coral-700 text-white"
              >
                <Link href="/auth/signup" onClick={() => setIsOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}