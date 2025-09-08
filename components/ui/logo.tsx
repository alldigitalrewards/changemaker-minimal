import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
  xl: 'h-16',
};

const textSizeMap = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export function Logo({ 
  className, 
  size = 'md', 
  variant = 'default',
  showText = true 
}: LogoProps) {
  const textColor = variant === 'white' 
    ? 'text-white' 
    : variant === 'dark' 
    ? 'text-gray-900' 
    : 'text-gray-900';

  const iconColor = variant === 'white'
    ? 'text-white'
    : 'text-orange-600';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Icon - simplified version of the star/spark from logo */}
      <div className={cn("relative", sizeMap[size])}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("w-full h-full", iconColor)}
        >
          {/* Star/spark shape inspired by the logo */}
          <path
            d="M20 4 L24 16 L36 16 L26 24 L30 36 L20 28 L10 36 L14 24 L4 16 L16 16 Z"
            fill="currentColor"
            opacity="0.9"
          />
          {/* Small accent marks */}
          <circle cx="32" cy="8" r="2" fill="currentColor" />
          <circle cx="35" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </div>
      
      {showText && (
        <span className={cn(
          "font-bold tracking-tight",
          textSizeMap[size],
          textColor
        )}>
          Changemaker
        </span>
      )}
    </div>
  );
}

// Standalone icon component for favicon/app icon use
export function LogoIcon({ 
  className, 
  size = 32 
}: { 
  className?: string; 
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle cx="20" cy="20" r="20" fill="white" />
      
      {/* Star shape */}
      <path
        d="M20 6 L23.5 15 L33 15 L25.5 21 L29 30 L20 24 L11 30 L14.5 21 L7 15 L16.5 15 Z"
        fill="url(#logoGradient)"
      />
      
      {/* Accent marks */}
      <circle cx="30" cy="10" r="1.5" fill="#fb923c" />
      <circle cx="32" cy="13" r="1" fill="#fb923c" />
    </svg>
  );
}