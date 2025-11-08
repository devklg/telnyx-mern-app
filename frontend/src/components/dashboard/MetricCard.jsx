import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MetricCard({ title, value, icon: Icon, trend, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold magnificent-text-gradient">{value}</div>
        {trend !== undefined && (
          <p className="text-xs text-muted-foreground">
            <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            {' '}from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );
}
