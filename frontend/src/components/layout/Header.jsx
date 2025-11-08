import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Header({ className }) {
  return (
    <header className={cn("bg-card px-6 py-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold magnificent-text-gradient">
            Magnificent Worldwide
          </h1>
          <span className="text-muted-foreground">Voice Agent System</span>
        </div>

        <div className="flex items-center space-x-4">
          <Badge className="magnificent-gradient">
            System Status: Active
          </Badge>
        </div>
      </div>
    </header>
  );
}
