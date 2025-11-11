'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CoralButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

// CoralButton now just wraps the standard Button component
// No more coral design system - using standard, professional button styles
export function CoralButton({
  variant = 'default',
  size = 'default',
  children,
  className,
  asChild,
  ...props
}: CoralButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      asChild={asChild}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}