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

export function CoralButton({ 
  variant = 'default', 
  size = 'default',
  children, 
  className,
  asChild,
  ...props 
}: CoralButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyles = cn(
    "font-semibold transition-all duration-300 border-0",
    size === 'lg' && "px-10 py-4 text-lg",
    size === 'default' && "px-6 py-3",
    size === 'sm' && "px-4 py-2 text-sm",
    className
  );

  if (variant === 'outline') {
    return (
      <Button
        variant="outline"
        size={size}
        asChild={asChild}
        className={cn(
          baseStyles,
          "border-2 border-coral-500 text-coral-500 hover:bg-coral-50"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </Button>
    );
  }

  if (variant === 'secondary') {
    return (
      <Button
        size={size}
        asChild={asChild}
        className={cn(baseStyles, "shadow-lg hover:shadow-xl transform hover:scale-105 text-coral-500")}
        variant="white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      asChild={asChild}
      className={cn(
        baseStyles,
        "bg-coral-500 hover:bg-coral-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-105"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </Button>
  );
}