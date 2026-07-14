import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseStyle = 'animate-pulse bg-slate-200/80 dark:bg-slate-800/80';
  
  const variants = {
    text: 'h-3 rounded w-3/4',
    rect: 'rounded-xl h-10 w-full',
    circle: 'rounded-full h-10 w-10 shrink-0'
  };

  return <div className={`${baseStyle} ${variants[variant]} ${className}`} />;
}
export default Skeleton;
