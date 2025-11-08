import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MagnificentButton } from "@/components/magnificent/MagnificentButton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Phone, Users, BarChart3 } from "lucide-react"

export function VoiceAgentControlPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-magnificent-primary" />
            <span>Active Calls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold magnificent-text-gradient mb-2">
            12
          </div>
          <p className="text-muted-foreground text-sm">
            Currently in progress
          </p>
          <MagnificentButton variant="magnificent" className="w-full mt-4">
            Start New Call
          </MagnificentButton>
        </CardContent>
      </Card>

      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-magnificent-secondary" />
            <span>Hot Transfers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold magnificent-text-gradient mb-2">
            8
          </div>
          <p className="text-muted-foreground text-sm">
            Successful today
          </p>
          <div className="flex items-center space-x-2 mt-4">
            <Badge variant="secondary">Kevin Available</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-magnificent-primary" />
            <span>Beast Mode Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Learning Progress</span>
              <span>47%</span>
            </div>
            <Progress value={47} className="magnificent-gradient" />
            <p className="text-muted-foreground text-xs">
              +3% this week
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
