import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`block w-full px-3 py-2 text-xs border rounded-xl bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 ${
            error ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[10px] font-semibold text-red-650">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
