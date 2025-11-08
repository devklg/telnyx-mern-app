import React, { useState, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PrintableReport from './PrintableReport';
import reportsService from '../../services/reportsService';
import { printElementWithIframe } from '../../utils/printHelpers';

/**
 * AnalyticsReport Component
 * Displays and prints analytics reports with charts
 */
const AnalyticsReport = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const COLORS = ['#3b82f6', '#facc15', '#10b981', '#ef4444', '#8b5cf6', '#f97316'];

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const analyticsData = await reportsService.getAnalyticsReport(filters);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printElementWithIframe('printable-analytics-report');
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Sample data for demonstration (replace with actual API data)
  const leadStatusData = [
    { name: 'New', value: analytics?.overview?.data?.new || 45 },
    { name: 'Contacted', value: analytics?.overview?.data?.contacted || 30 },
    { name: 'Qualified', value: analytics?.overview?.data?.qualified || 20 },
    { name: 'Disqualified', value: analytics?.overview?.data?.disqualified || 5 },
  ];

  const conversionData = [
    { month: 'Jan', leads: 65, qualified: 32, converted: 15 },
    { month: 'Feb', leads: 78, qualified: 40, converted: 22 },
    { month: 'Mar', leads: 90, qualified: 52, converted: 28 },
    { month: 'Apr', leads: 85, qualified: 48, converted: 25 },
    { month: 'May', leads: 95, qualified: 60, converted: 35 },
    { month: 'Jun', leads: 110, qualified: 72, converted: 42 },
  ];

  const performanceData = [
    { day: 'Mon', calls: 25, duration: 450 },
    { day: 'Tue', calls: 30, duration: 520 },
    { day: 'Wed', calls: 28, duration: 480 },
    { day: 'Thu', calls: 35, duration: 600 },
    { day: 'Fri', calls: 32, duration: 550 },
  ];

  return (
    <div className="analytics-report">
      {/* Controls - Hidden when printing */}
      <div className="no-print mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Analytics Report
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Printable Report */}
      <div id="printable-analytics-report">
        <PrintableReport
          title="Analytics Report"
          subtitle="Performance Metrics & Insights"
          filters={filters}
        >
          {/* Key Metrics */}
          <div className="mb-8 avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-blue-600">
                  {leadStatusData.reduce((acc, item) => acc + item.value, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">+12% vs last period</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Qualified Rate</p>
                <p className="text-3xl font-bold text-green-600">38%</p>
                <p className="text-xs text-gray-500 mt-1">+5% vs last period</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-yellow-600">28%</p>
                <p className="text-xs text-gray-500 mt-1">+3% vs last period</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Avg Call Time</p>
                <p className="text-3xl font-bold text-purple-600">8:45</p>
                <p className="text-xs text-gray-500 mt-1">-1:20 vs last period</p>
              </div>
            </div>
          </div>

          {/* Lead Status Distribution */}
          <div className="mb-8 page-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  {leadStatusData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">
                        {leadStatusData.reduce((acc, item) => acc + item.value, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="mb-8 avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel (6 Months)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                  <Bar dataKey="qualified" fill="#facc15" name="Qualified" />
                  <Bar dataKey="converted" fill="#10b981" name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Call Performance */}
          <div className="mb-8 page-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Performance (This Week)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Number of Calls"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="duration"
                    stroke="#facc15"
                    strokeWidth={2}
                    name="Total Duration (min)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Summary Table */}
          <div className="avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Metric
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Current Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Previous Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Leads</td>
                    <td className="px-4 py-3 text-sm text-gray-900">100</td>
                    <td className="px-4 py-3 text-sm text-gray-600">89</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">+12%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Qualification Rate</td>
                    <td className="px-4 py-3 text-sm text-gray-900">38%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">33%</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">+5%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Conversion Rate</td>
                    <td className="px-4 py-3 text-sm text-gray-900">28%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">25%</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">+3%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Avg Call Duration</td>
                    <td className="px-4 py-3 text-sm text-gray-900">8:45</td>
                    <td className="px-4 py-3 text-sm text-gray-600">10:05</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">-13%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Calls</td>
                    <td className="px-4 py-3 text-sm text-gray-900">150</td>
                    <td className="px-4 py-3 text-sm text-gray-600">142</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">+6%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </PrintableReport>
      </div>
    </div>
  );
};

export default AnalyticsReport;
