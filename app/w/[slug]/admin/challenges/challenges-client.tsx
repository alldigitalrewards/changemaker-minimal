'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
  Plus,
  Grid3x3,
  List,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Archive,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateChallengeButton } from '@/components/challenges/CreateChallengeButton';
import { ChallengeRoleBadge } from '@/components/challenges/challenge-role-badge';

interface Challenge {
  id: string;
  title: string;
  description: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: {
    enrollments: number;
  };
}

type ViewMode = 'grid' | 'table';
type SortField = 'title' | 'status' | 'startDate' | 'enrollments' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function ChallengesClient() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View and filtering state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Bulk operations state
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();

  useEffect(() => {
    if (params?.slug) {
      fetchChallenges();
    }
  }, [params?.slug]);

  const fetchChallenges = async () => {
    if (!params?.slug) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${params.slug}/challenges`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challenges',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusChip = (c: Challenge) => {
    const now = new Date();
    const start = c.startDate ? new Date(c.startDate) : null;
    const end = c.endDate ? new Date(c.endDate) : null;
    const status = c.status || 'DRAFT';

    if (status === 'ARCHIVED') return { label: 'ARCHIVED', variant: 'secondary' as const };
    if (status !== 'PUBLISHED') return { label: 'DRAFT', variant: 'outline' as const };

    if (start && now < start) return { label: 'UPCOMING', variant: 'outline' as const };
    if (start && end && now >= start && now <= end) return { label: 'ACTIVE', variant: 'default' as const };
    return { label: 'ENDED', variant: 'secondary' as const };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-gray-900" />
    ) : (
      <ArrowDown className="h-4 w-4 text-gray-900" />
    );
  };

  // Filter and sort challenges
  const filteredAndSortedChallenges = useMemo(() => {
    let filtered = challenges.filter((challenge) => {
      // Search filter
      const matchesSearch =
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const chip = getStatusChip(challenge);
      const matchesStatus = statusFilter === 'all' || chip.label === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const now = new Date();
        const start = challenge.startDate ? new Date(challenge.startDate) : null;
        const end = challenge.endDate ? new Date(challenge.endDate) : null;

        if (dateFilter === 'upcoming' && start) {
          matchesDate = now < start;
        } else if (dateFilter === 'active' && start && end) {
          matchesDate = now >= start && now <= end;
        } else if (dateFilter === 'ended' && end) {
          matchesDate = now > end;
        }
      }

      // Enrollment filter
      let matchesEnrollment = true;
      if (enrollmentFilter !== 'all') {
        const count = challenge._count?.enrollments || 0;
        if (enrollmentFilter === 'none') {
          matchesEnrollment = count === 0;
        } else if (enrollmentFilter === 'low') {
          matchesEnrollment = count > 0 && count <= 10;
        } else if (enrollmentFilter === 'medium') {
          matchesEnrollment = count > 10 && count <= 50;
        } else if (enrollmentFilter === 'high') {
          matchesEnrollment = count > 50;
        }
      }

      return matchesSearch && matchesStatus && matchesDate && matchesEnrollment;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = getStatusChip(a).label;
          bVal = getStatusChip(b).label;
          break;
        case 'startDate':
          aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
          bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case 'enrollments':
          aVal = a._count?.enrollments || 0;
          bVal = b._count?.enrollments || 0;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [challenges, searchQuery, statusFilter, dateFilter, enrollmentFilter, sortField, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = challenges.length;
    const active = challenges.filter(c => getStatusChip(c).label === 'ACTIVE').length;
    const drafts = challenges.filter(c => c.status === 'DRAFT').length;
    const upcoming = challenges.filter(c => getStatusChip(c).label === 'UPCOMING').length;
    const archived = challenges.filter(c => c.status === 'ARCHIVED').length;

    return { total, active, drafts, upcoming, archived };
  }, [challenges]);

  const handleSelectChallenge = (challengeId: string, checked: boolean) => {
    const newSelected = new Set(selectedChallenges);
    if (checked) {
      newSelected.add(challengeId);
    } else {
      newSelected.delete(challengeId);
    }
    setSelectedChallenges(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAndSortedChallenges.map((c) => c.id);
      setSelectedChallenges(new Set(allIds));
    } else {
      setSelectedChallenges(new Set());
    }
  };

  const handleDeleteClick = (challenge: Challenge) => {
    setChallengeToDelete({ id: challenge.id, title: challenge.title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!challengeToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workspaces/${params?.slug}/challenges/${challengeToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `"${challengeToDelete.title}" has been deleted successfully.`,
        });
        fetchChallenges();
        setDeleteDialogOpen(false);
        setChallengeToDelete(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete challenge');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (challengeId: string) => {
    router.push(`/w/${params?.slug}/admin/challenges/${challengeId}`);
  };

  const handleExportCSV = () => {
    const headers = ['Title', 'Status', 'Start Date', 'End Date', 'Enrollments', 'Created Date', 'Description'];
    const rows = filteredAndSortedChallenges.map((challenge) => {
      const chip = getStatusChip(challenge);
      return [
        challenge.title,
        chip.label,
        challenge.startDate ? format(new Date(challenge.startDate), 'yyyy-MM-dd') : '',
        challenge.endDate ? format(new Date(challenge.endDate), 'yyyy-MM-dd') : '',
        challenge._count?.enrollments || 0,
        format(new Date(challenge.createdAt), 'yyyy-MM-dd'),
        challenge.description || '',
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challenges-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `Exported ${filteredAndSortedChallenges.length} challenges to CSV`,
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setEnrollmentFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || dateFilter !== 'all' || enrollmentFilter !== 'all';

  const ChallengeSkeleton = () => (
    <Card className="relative">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Challenges</h1>
          <p className="text-gray-600">Manage challenges for workspace: {params?.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredAndSortedChallenges.length > 0 && (
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <CreateChallengeButton workspaceSlug={params?.slug || ''} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-gray-200 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Total</div>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setStatusFilter('ACTIVE')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-700 mb-1">Active</div>
                <div className="text-3xl font-bold text-green-900">{stats.active}</div>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setStatusFilter('DRAFT')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Drafts</div>
                <div className="text-3xl font-bold text-gray-900">{stats.drafts}</div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                <Edit className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setStatusFilter('UPCOMING')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-700 mb-1">Upcoming</div>
                <div className="text-3xl font-bold text-blue-900">{stats.upcoming}</div>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setStatusFilter('ARCHIVED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-amber-700 mb-1">Archived</div>
                <div className="text-3xl font-bold text-amber-900">{stats.archived}</div>
              </div>
              <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center">
                <Archive className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg p-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active Now</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Enrollments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Enrollments</SelectItem>
            <SelectItem value="none">No Enrollments</SelectItem>
            <SelectItem value="low">Low (1-10)</SelectItem>
            <SelectItem value="medium">Medium (11-50)</SelectItem>
            <SelectItem value="high">High (50+)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Status: {statusFilter}
              <button
                onClick={() => setStatusFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Date: {dateFilter}
              <button
                onClick={() => setDateFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {enrollmentFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Enrollment: {enrollmentFilter}
              <button
                onClick={() => setEnrollmentFilter('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Challenges Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Challenges</CardTitle>
              <CardDescription>
                {filteredAndSortedChallenges.length} of {challenges.length} challenges
                {hasActiveFilters && ' (filtered)'}
                {selectedChallenges.size > 0 && ` • ${selectedChallenges.size} selected`}
              </CardDescription>
            </div>
            {selectedChallenges.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChallenges(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ChallengeSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading challenges...</div>
            )
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first challenge</p>
              <CreateChallengeButton workspaceSlug={params?.slug || ''} />
            </div>
          ) : filteredAndSortedChallenges.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges match your filters</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedChallenges.map((challenge) => (
                <Card
                  key={challenge.id}
                  className="relative hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleCardClick(challenge.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          {params?.slug && (
                            <ChallengeRoleBadge challengeId={challenge.id} workspaceSlug={params.slug} />
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {challenge.description}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(challenge.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/w/${params?.slug}/admin/challenges/${challenge.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(challenge);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{challenge._count?.enrollments || 0} enrolled</span>
                      </div>
                      {(() => {
                        const chip = getStatusChip(challenge);
                        return (
                          <Badge variant={chip.variant}>
                            {chip.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4 text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created {format(new Date(challenge.createdAt), 'MMM d, yyyy')}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedChallenges.size > 0 &&
                            filteredAndSortedChallenges.every((c) => selectedChallenges.has(c.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[300px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('title')}
                        >
                          Title
                          {getSortIcon('title')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {getSortIcon('status')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('startDate')}
                        >
                          Start Date
                          {getSortIcon('startDate')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('enrollments')}
                        >
                          Enrollments
                          {getSortIcon('enrollments')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="flex items-center gap-2 hover:text-gray-900"
                          onClick={() => handleSort('createdAt')}
                        >
                          Created
                          {getSortIcon('createdAt')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedChallenges.map((challenge) => {
                      const chip = getStatusChip(challenge);
                      const isHovered = hoveredRow === challenge.id;

                      return (
                        <TableRow
                          key={challenge.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleCardClick(challenge.id)}
                          onMouseEnter={() => setHoveredRow(challenge.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedChallenges.has(challenge.id)}
                              onCheckedChange={(checked) =>
                                handleSelectChallenge(challenge.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{challenge.title}</div>
                              {challenge.description && (
                                <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                                  {challenge.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={chip.variant}>{chip.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {challenge.startDate
                              ? format(new Date(challenge.startDate), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">
                                {challenge._count?.enrollments || 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {format(new Date(challenge.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleCardClick(challenge.id)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => router.push(`/w/${params?.slug}/admin/challenges/${challenge.id}/edit`)}
                                title="Edit challenge"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteClick(challenge)}
                                title="Delete challenge"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-semibold">"{challengeToDelete?.title}"</span>?
              <br />
              <br />
              This action cannot be undone. This will permanently delete the challenge and remove all associated enrollments and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setChallengeToDelete(null);
                setDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <span className="animate-pulse">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Challenge
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
