import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Phone, Users, Target, Brain } from 'lucide-react';
import io from 'socket.io-client';
import MetricCard from './MetricCard';
import BeastModeProgressDisplay from './BeastModeProgressDisplay';

export default function RealTimeAnalyticsDashboard() {
  const [metrics, setMetrics] = useState({
    activeCalls: 0,
    dailyTotal: 0,
    conversionRate: 0,
    beastModeProgress: 0,
    kevinAvailable: false
  });

  const [callHistory, setCallHistory] = useState([]);
  const [learningMetrics, setLearningMetrics] = useState([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3550');

    socket.on('dashboard:metrics-update', (newMetrics) => {
      setMetrics(newMetrics);
    });

    socket.on('dashboard:call-history', (history) => {
      setCallHistory(history);
    });

    socket.on('dashboard:learning-update', (learning) => {
      setLearningMetrics(learning);
    });

    // Initial data fetch
    fetchDashboardData();

    return () => socket.disconnect();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch initial dashboard data from API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3550'}/api/dashboard/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || metrics);
        setCallHistory(data.callHistory || generateMockCallHistory());
        setLearningMetrics(data.learningMetrics || generateMockLearningMetrics());
      } else {
        // Use mock data if API not available
        setCallHistory(generateMockCallHistory());
        setLearningMetrics(generateMockLearningMetrics());
        setMetrics({
          activeCalls: 12,
          dailyTotal: 247,
          conversionRate: 68.5,
          beastModeProgress: 47,
          kevinAvailable: true
        });
      }
    } catch (error) {
      console.log('Using mock data for dashboard');
      // Use mock data for development
      setCallHistory(generateMockCallHistory());
      setLearningMetrics(generateMockLearningMetrics());
      setMetrics({
        activeCalls: 12,
        dailyTotal: 247,
        conversionRate: 68.5,
        beastModeProgress: 47,
        kevinAvailable: true
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Active Calls"
          value={metrics.activeCalls}
          icon={Phone}
          trend={+2}
          className="magnificent-gradient-border"
        />

        <MetricCard
          title="Daily Total"
          value={metrics.dailyTotal}
          icon={TrendingUp}
          trend={+15}
          className="magnificent-gradient-border"
        />

        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          icon={Target}
          trend={+3.2}
          className="magnificent-gradient-border"
        />

        <MetricCard
          title="Beast Mode"
          value={`${metrics.beastModeProgress}%`}
          icon={Brain}
          trend={+1.5}
          className="magnificent-gradient-border"
        />

        <Card className="magnificent-gradient-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Kevin Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={metrics.kevinAvailable ? "bg-green-500" : "bg-red-500"}>
              {metrics.kevinAvailable ? "Available" : "Busy"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Call Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="magnificent-gradient-border">
          <CardHeader>
            <CardTitle>Call Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callHistory}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--magnificent-primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--magnificent-primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="transfers"
                  stroke="hsl(var(--magnificent-secondary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--magnificent-secondary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="magnificent-gradient-border">
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={learningMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Bar
                  dataKey="progress"
                  fill="url(#magnificentGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="magnificentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--magnificent-primary))" />
                    <stop offset="100%" stopColor="hsl(var(--magnificent-secondary))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Beast Mode Progression */}
      <Card className="magnificent-gradient-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-magnificent-primary" />
            <span>Beast Mode Learning Progression</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BeastModeProgressDisplay progress={metrics.beastModeProgress} />
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions to generate mock data for development
function generateMockCallHistory() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => ({
    time: `${hour}:00`,
    calls: Math.floor(Math.random() * 50) + 10,
    transfers: Math.floor(Math.random() * 20) + 5
  }));
}

function generateMockLearningMetrics() {
  return [
    { category: 'Objection Handling', progress: 75 },
    { category: 'Closing Skills', progress: 62 },
    { category: 'Discovery', progress: 88 },
    { category: 'Rapport Building', progress: 71 },
    { category: 'Product Knowledge', progress: 95 }
  ];
}
