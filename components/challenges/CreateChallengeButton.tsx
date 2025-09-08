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
      className="bg-coral-500 hover:bg-coral-600 text-white px-4 py-2 font-medium rounded-md shadow-sm inline-flex items-center"
      style={{ backgroundColor: '#ff6b6b', color: 'white' }}
      onClick={() => router.push(`/w/${workspaceSlug}/admin/challenges/new`)}
    >
      <Plus className="h-4 w-4 mr-2" style={{ color: 'white' }} />
      <span style={{ color: 'white' }}>Create Challenge</span>
    </Button>
  );
}