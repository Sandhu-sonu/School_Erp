import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`block w-full px-3 py-2 text-xs border rounded-xl bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 ${
            error ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[10px] font-semibold text-red-600">{error}</p>}
        {!error && helperText && <p className="text-[10px] text-slate-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
