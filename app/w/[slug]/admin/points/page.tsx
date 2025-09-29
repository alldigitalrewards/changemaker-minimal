'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Budget {
  totalBudget: number
  allocated: number
}

export default function PointsAdminPage() {
  const params = useParams<{ slug: string }>()
  const [workspaceBudget, setWorkspaceBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!params?.slug) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/points`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load workspace budget')
      }
      const j = await res.json()
      setWorkspaceBudget(j.budget || { totalBudget: 0, allocated: 0 })
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [params?.slug])

  const saveWorkspaceBudget = async () => {
    const input = document.getElementById('wsTotalBudget') as HTMLInputElement | null
    const total = input ? Number(input.value) : NaN
    try {
      const res = await fetch(`/api/workspaces/${params?.slug}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: isNaN(total) ? 0 : Math.max(0, total) })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save')
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  const remaining = (workspaceBudget?.totalBudget || 0) - (workspaceBudget?.allocated || 0)
  const pct = (workspaceBudget && workspaceBudget.totalBudget > 0)
    ? Math.round((workspaceBudget.allocated / workspaceBudget.totalBudget) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy-900">Points</h1>
        <p className="text-sm text-gray-600">Manage workspace-wide points budget and simulate allocations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Points Budget</CardTitle>
          <CardDescription>Set the total points available for this workspace. Challenges can optionally use their own budgets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <>
              <div className="text-sm text-gray-700">
                <Badge variant="outline">Total: {workspaceBudget?.totalBudget || 0}</Badge>
                <Badge className="ml-2" variant="secondary">Allocated: {workspaceBudget?.allocated || 0}</Badge>
                <Badge className="ml-2" variant={remaining > 0 ? 'default' : 'destructive'}>Remaining: {Math.max(0, remaining)}</Badge>
                <span className="ml-2 text-xs text-gray-500">{pct}% used</span>
              </div>
              <div className="flex items-end gap-2 max-w-md">
                <div className="flex-1">
                  <Label htmlFor="wsTotalBudget">Set Total Budget</Label>
                  <Input id="wsTotalBudget" type="number" min={0} step={1} defaultValue={workspaceBudget?.totalBudget || 0} />
                </div>
                <Button onClick={saveWorkspaceBudget}>Save</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulate Point Adjustments</CardTitle>
          <CardDescription>Preview how awarding points will impact the workspace budget.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 max-w-md items-end">
            <div className="flex-1">
              <Label htmlFor="simAward">Points to award (simulation)</Label>
              <Input id="simAward" type="number" min={0} step={1} defaultValue={0} />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const input = document.getElementById('simAward') as HTMLInputElement | null
                const amt = input ? Number(input.value) : 0
                const allocated = (workspaceBudget?.allocated || 0) + Math.max(0, amt)
                const total = workspaceBudget?.totalBudget || 0
                alert(`Simulated allocation: ${allocated}/${total} used, ${Math.max(0, total - allocated)} remaining`)
              }}
            >
              Simulate
            </Button>
          </div>
          <p className="text-xs text-gray-500">Simulation does not change data. Actual awards occur via challenge submissions and budget logic.</p>
        </CardContent>
      </Card>
    </div>
  )
}


