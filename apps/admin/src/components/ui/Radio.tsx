import React from 'react';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', id, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="radio"
          id={id}
          className={`border-slate-300 text-primary focus:ring-primary/50 cursor-pointer h-4 w-4 ${className}`}
          {...props}
        />
        <label htmlFor={id} className="text-xs font-semibold text-slate-655 cursor-pointer select-none">
          {label}
        </label>
      </div>
    );
  }
);

Radio.displayName = 'Radio';
export default Radio;
