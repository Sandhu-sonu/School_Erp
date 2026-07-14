import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={`rounded border-slate-300 text-primary focus:ring-primary/50 cursor-pointer h-4 w-4 ${className}`}
            {...props}
          />
          <label htmlFor={id} className="text-xs font-semibold text-slate-655 cursor-pointer select-none">
            {label}
          </label>
        </div>
        {error && <p className="text-[10px] font-semibold text-red-650">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
