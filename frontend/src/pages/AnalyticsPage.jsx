import React from 'react';
import RealTimeAnalyticsDashboard from '@/components/dashboard/RealTimeAnalyticsDashboard';

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold magnificent-text-gradient">
          Real-Time Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive voice agent performance and learning metrics
        </p>
      </div>

      <RealTimeAnalyticsDashboard />
    </div>
  );
}
