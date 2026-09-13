import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-card hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-sjsfi-50 border border-sjsfi-200/60 flex items-center justify-center text-sjsfi-900 group-hover:bg-sjsfi-900 group-hover:text-white transition-colors duration-200">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={`font-semibold ${
                  trendUp ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {trend}
              </span>
            )}
            {subtitle && <span className="text-gray-500 font-medium">{subtitle}</span>}
          </div>
        )}
      </div>

      {/* Subtle bottom green accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sjsfi-900 via-sjsfi-600 to-sjsfi-gold opacity-80" />
    </div>
  );
}
