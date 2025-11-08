import React from 'react';
import { VoiceAgentControlPanel } from '@/components/voice-agent/VoiceAgentControlPanel';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold magnificent-text-gradient mb-2">
          Voice Agent Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor and control your voice agent lead qualification system
        </p>
      </div>

      <VoiceAgentControlPanel />

      {/* Additional dashboard sections will be added by other agents */}
    </div>
  );
}
