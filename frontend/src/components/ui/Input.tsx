import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col w-full mb-4">
      {label && <label className="mb-1.5 text-sm font-medium text-foreground">{label}</label>}
      <input
        className={`flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${className}`}
        {...props}
      />
      {error && <span className="mt-1 text-xs text-destructive">{error}</span>}
    </div>
  );
};

export default Input;
