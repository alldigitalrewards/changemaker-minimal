'use client';

import { Button } from '@/components/ui/button';
import { Activity, TrendingUp } from 'lucide-react';

interface TabNavigationButtonsProps {
  hasActivities: boolean;
}

export function TabNavigationButtons({ hasActivities }: TabNavigationButtonsProps) {
  const scrollToTab = (tabValue: string) => {
    try {
      if (typeof window !== 'undefined') {
        const tab = document.querySelector(`[value="${tabValue}"]`) as HTMLButtonElement;
        if (tab) {
          tab.click();
        }
      }
    } catch (error) {
      console.warn('Error scrolling to tab:', error);
    }
  };

  return (
    <div className="space-y-2">
      {hasActivities && (
        <Button 
          className="w-full bg-gray-900 hover:bg-gray-800" 
          size="sm"
          onClick={() => scrollToTab('activities')}
        >
          <Activity className="h-4 w-4 mr-2" />
          View Activities
        </Button>
      )}
      <Button 
        className="w-full" 
        variant="outline" 
        size="sm"
        onClick={() => scrollToTab('progress')}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Check Progress
      </Button>
    </div>
  );
}