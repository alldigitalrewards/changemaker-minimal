'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CoralButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function CoralButton({ 
  variant = 'default', 
  size = 'default',
  children, 
  className,
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
        className={cn(baseStyles, "border-2")}
        style={{
          borderColor: '#FF6B6B',
          color: '#FF6B6B',
          backgroundColor: isHovered ? '#FFF5F5' : 'transparent'
        }}
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
      className={cn(baseStyles, "text-white shadow-xl hover:shadow-2xl transform hover:scale-105")}
      style={{
        backgroundColor: isHovered ? '#FF5252' : '#FF6B6B',
        color: 'white'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </Button>
  );
}