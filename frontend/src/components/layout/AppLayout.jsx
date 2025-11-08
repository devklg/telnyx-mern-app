import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <Sidebar className="w-64 border-r magnificent-gradient-border" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header className="border-b magnificent-gradient-border" />

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
