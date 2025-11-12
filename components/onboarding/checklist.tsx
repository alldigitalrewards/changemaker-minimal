'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  action?: {
    label: string
    href: string
  }
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
  workspaceSlug: string
}

export function OnboardingChecklist({ steps, workspaceSlug }: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const completedCount = steps.filter(step => step.completed).length
  const totalCount = steps.length
  const progressPercentage = (completedCount / totalCount) * 100
  const isFullyComplete = completedCount === totalCount

  if (isFullyComplete) {
    return null // Hide checklist when all steps are complete
  }

  return (
    <Card className="border-coral-200 bg-gradient-to-br from-white to-coral-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">Getting Started</CardTitle>
              <Badge variant="outline" className="bg-coral-100 text-coral-700 border-coral-300">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <CardDescription>
              Complete these steps to get the most out of your experience
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-500 to-coral-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {completedCount === 0
              ? "Let's get started!"
              : completedCount === totalCount
              ? "All done! 🎉"
              : `${totalCount - completedCount} ${totalCount - completedCount === 1 ? 'step' : 'steps'} remaining`
            }
          </p>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all
                ${step.completed
                  ? 'bg-green-50/50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-coral-300'
                }
              `}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium ${step.completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                  {step.title}
                </h4>
                {!step.completed && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {!step.completed && step.action && (
                <Link href={step.action.href}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 text-coral-600 hover:text-coral-700 hover:bg-coral-50 border-coral-200"
                  >
                    {step.action.label}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Default onboarding steps for participants
 * This can be customized per workspace if needed
 */
export function getDefaultOnboardingSteps(args: {
  hasCompletedProfile: boolean
  hasJoinedChallenge: boolean
  hasEarnedReward: boolean
}): OnboardingStep[] {
  return [
    {
      id: 'account_created',
      title: 'Account Created',
      description: 'Your account has been successfully created',
      completed: true, // Always completed if viewing this
    },
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add a profile photo and bio to personalize your account',
      completed: args.hasCompletedProfile,
      action: {
        label: 'Complete',
        href: '/onboarding/complete-profile'
      }
    },
    {
      id: 'join_challenge',
      title: 'Join Your First Challenge',
      description: 'Browse available challenges and join one that interests you',
      completed: args.hasJoinedChallenge,
      action: {
        label: 'Browse',
        href: '/challenges'
      }
    },
    {
      id: 'earn_reward',
      title: 'Earn Your First Reward',
      description: 'Complete a challenge and earn points to redeem rewards',
      completed: args.hasEarnedReward,
    }
  ]
}
