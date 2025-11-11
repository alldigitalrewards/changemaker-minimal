'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Package, DollarSign, X, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CatalogItem } from '@/lib/rewardstack/types'

interface RewardStackCatalogSelectorProps {
  workspaceSlug: string
  value?: CatalogItem | null
  onChange: (product: CatalogItem | null) => void
  disabled?: boolean
}

export function RewardStackCatalogSelector({
  workspaceSlug,
  value,
  onChange,
  disabled = false,
}: RewardStackCatalogSelectorProps) {
  const { toast } = useToast()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      try {
        // Use the working SKUs endpoint that fetches from database
        const response = await fetch(`/api/workspaces/${workspaceSlug}/skus`)

        if (!response.ok) {
          throw new Error('Failed to fetch SKUs')
        }

        const data = await response.json()

        // Map WorkspaceSku to CatalogItem format
        const catalogItems: CatalogItem[] = (data.skus || []).map((sku: any) => ({
          sku: sku.skuId,
          name: sku.name,
          description: sku.description || '',
          value: sku.value || 0,
          category: '', // WorkspaceSku doesn't have category
          isActive: sku.isActive,
          imageUrl: undefined, // WorkspaceSku doesn't have imageUrl
        }))

        setCatalog(catalogItems)
      } catch (error) {
        console.error('Failed to load SKUs:', error)
        toast({
          title: 'Failed to Load SKUs',
          description: 'Could not fetch SKUs from database',
          variant: 'destructive',
        })
        setCatalog([])
      } finally {
        setLoading(false)
      }
    }

    fetchCatalog()
  }, [workspaceSlug, toast])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(catalog.map(item => item.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [catalog])

  // Filter catalog items
  const filteredItems = useMemo(() => {
    let filtered = catalog.filter(item => item.isActive)

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    return filtered
  }, [catalog, searchQuery, selectedCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading catalog...</span>
      </div>
    )
  }

  if (catalog.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-800">No SKUs available</p>
            <p className="text-xs text-amber-600 mt-1">
              Add SKUs to this workspace in workspace settings to use them for activity rewards
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selected Product Display */}
      {value && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-gray-900" />
                  <span className="text-sm font-medium text-gray-900">Selected Product</span>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{value.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <code className="bg-white px-2 py-0.5 rounded">{value.sku}</code>
                    <span>•</span>
                    <span className="font-medium text-green-700">
                      ${(value.value / 100).toFixed(2)}
                    </span>
                  </div>
                  {value.description && (
                    <p className="text-xs text-gray-600 mt-1">{value.description}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(null)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category || 'all')}
                disabled={disabled}
                className="text-xs"
              >
                {category === 'all' ? 'All Categories' : category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="border rounded-lg bg-gray-50 p-4 max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No products match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.sku}
                onClick={() => onChange(item)}
                disabled={disabled}
                className={`
                  text-left p-3 rounded-lg border-2 transition-all
                  ${
                    value?.sku === item.sku
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {item.name}
                      </p>
                      {value?.sku === item.sku && (
                        <Check className="h-4 w-4 text-gray-900 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {item.sku}
                      </code>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
                      <DollarSign className="h-3 w-3" />
                      {(item.value / 100).toFixed(2)}
                    </div>
                  </div>

                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500 text-center">
        Showing {filteredItems.length} of {catalog.length} products
      </p>
    </div>
  )
}
