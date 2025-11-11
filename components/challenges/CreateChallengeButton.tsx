'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateChallengeButtonProps {
  workspaceSlug: string;
}

export function CreateChallengeButton({ workspaceSlug }: CreateChallengeButtonProps) {
  const router = useRouter();

  return (
    <Button
      className="bg-gray-900 hover:bg-gray-800 text-white"
      onClick={() => router.push(`/w/${workspaceSlug}/admin/challenges/new`)}
    >
      <Plus className="h-4 w-4 mr-2" />
      Create Challenge
    </Button>
  );
}

