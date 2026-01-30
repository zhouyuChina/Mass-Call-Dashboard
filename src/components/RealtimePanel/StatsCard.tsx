import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  valueColor?: string;
}

export interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  stats: StatItem[];
  layout?: 'horizontal' | 'vertical';
}

export function StatsCard({
  icon: Icon,
  iconColor,
  title,
  stats,
  layout = 'horizontal'
}: StatsCardProps) {
  return (
    <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm text-gray-600">{title}</span>
      </div>

      {layout === 'horizontal' ? (
        <div className="flex items-center justify-between">
          {stats.map((stat, index) => (
            <div key={index} className={index > 0 ? 'text-right' : ''}>
              <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.valueColor || 'text-gray-800'}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-600 space-y-0.5">
          {stats.map((stat, index) => (
            <div key={index}>{stat.value}</div>
          ))}
        </div>
      )}
    </div>
  );
}
