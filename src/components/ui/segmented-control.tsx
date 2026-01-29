import React from 'react';
import { cn } from './utils';

interface SegmentedControlProps {
  options: Array<{
    value: string;
    label: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div 
      className={cn(
        "relative inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200",
        className
      )}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out",
            "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-100",
            "min-w-[80px] flex items-center justify-center text-center",
            value === option.value
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}