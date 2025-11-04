"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TimePeriod = 'all' | 'month' | 'week' | 'day'

interface TimePeriodTabsProps {
  value: TimePeriod
  onChange: (value: TimePeriod) => void
}

export function TimePeriodTabs({ value, onChange }: TimePeriodTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimePeriod)}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all">All Time</TabsTrigger>
        <TabsTrigger value="month">This Month</TabsTrigger>
        <TabsTrigger value="week">This Week</TabsTrigger>
        <TabsTrigger value="day">Today</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
