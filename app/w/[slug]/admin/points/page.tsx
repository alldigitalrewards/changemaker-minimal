"use client";

/**
 * Rewards Management Page
 * Allows workspace admins to issue rewards (points and SKUs) to participants
 * Renamed from Points to Rewards as part of RewardSTACK integration
 *
 * Note: This replaces the legacy Points page with enhanced functionality:
 * - Issue points (credits) to participants
 * - Issue SKU rewards (from workspace-assigned SKUs only)
 * - View issuance history
 * - Manage workspace rewards budget
 */

// Redirect to new rewards page
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PointsRedirectPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  useEffect(() => {
    if (params?.slug) {
      router.replace(`/w/${params.slug}/admin/rewards`);
    }
  }, [params?.slug, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Redirecting to Rewards page...</p>
    </div>
  );
}


