import React from 'react';
import { Progress } from "@/components/ui/progress";

export default function BeastModeProgressDisplay({ progress }) {
  const stages = [
    { name: 'Beginner', min: 0, max: 25, color: 'bg-red-500' },
    { name: 'Learning', min: 25, max: 50, color: 'bg-yellow-500' },
    { name: 'Improving', min: 50, max: 75, color: 'bg-blue-500' },
    { name: 'Beast Mode', min: 75, max: 100, color: 'magnificent-gradient' }
  ];

  const currentStage = stages.find(stage => progress >= stage.min && progress < stage.max) || stages[3];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Current Stage: {currentStage.name}</span>
        <span className="text-2xl font-bold magnificent-text-gradient">{progress}%</span>
      </div>

      <Progress value={progress} className="h-3 magnificent-gradient" />

      <div className="grid grid-cols-4 gap-2 text-xs">
        {stages.map((stage, index) => (
          <div key={index} className="text-center">
            <div className={`h-2 rounded ${progress >= stage.min ? stage.color : 'bg-muted'}`} />
            <span className="text-muted-foreground">{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
