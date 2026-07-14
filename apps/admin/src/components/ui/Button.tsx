import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-bold tracking-wide rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90 shadow-md',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-md',
    danger: 'bg-red-650 text-white hover:bg-red-750 shadow-md',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-md',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] uppercase',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export default Button;
