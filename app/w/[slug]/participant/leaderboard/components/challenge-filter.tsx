"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Challenge {
  id: string
  title: string
}

interface ChallengeFilterProps {
  challenges: Challenge[]
  value: string
  onChange: (value: string) => void
}

export function ChallengeFilter({ challenges, value, onChange }: ChallengeFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="challenge-filter" className="text-sm font-medium text-slate-700">
        Challenge:
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="challenge-filter" className="w-[280px]">
          <SelectValue placeholder="Select challenge" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Challenges</SelectItem>
          {challenges.map((challenge) => (
            <SelectItem key={challenge.id} value={challenge.id}>
              {challenge.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
