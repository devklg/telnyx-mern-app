import React from 'react';
import { NavLink } from 'react-router-dom';
import { Phone, Users, BarChart3, Settings, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calls', icon: Phone, label: 'Active Calls' },
  { to: '/leads', icon: Users, label: 'Lead Management' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ className }) {
  return (
    <aside className={cn("bg-card p-4", className)}>
      <div className="mb-8">
        <h2 className="text-xl font-bold magnificent-text-gradient">
          BMAD V4
        </h2>
        <p className="text-xs text-muted-foreground">Voice Agent System</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-4 py-3 rounded-md transition-colors",
                isActive
                  ? "magnificent-gradient text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
