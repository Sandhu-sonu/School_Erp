import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-16 w-16 text-lg'
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-slate-200 shadow-sm`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shadow-sm`}>
      {getInitials(name)}
    </div>
  );
}
export default Avatar;
