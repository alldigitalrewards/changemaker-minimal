'use client';

import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface AccessDeniedProps {
  message?: string;
  returnUrl?: string;
  returnLabel?: string;
}

export function AccessDenied({
  message = 'You do not have permission to access this page.',
  returnUrl = '/',
  returnLabel = 'Return Home',
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="default" className="bg-coral-500 hover:bg-coral-600">
            <Link href={returnUrl}>{returnLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
