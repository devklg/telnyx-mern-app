import React, { useState, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import PrintableReport from './PrintableReport';
import reportsService from '../../services/reportsService';
import { printElementWithIframe, formatPrintDate, formatPrintDateTime } from '../../utils/printHelpers';

/**
 * CallsReport Component
 * Displays and prints call reports with filtering
 */
const CallsReport = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const callsData = await reportsService.getCallsReport(filters);
      setCalls(callsData.data?.calls || callsData.data || []);
    } catch (error) {
      console.error('Error fetching calls report:', error);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printElementWithIframe('printable-calls-report');
  };

  const handleExportCSV = () => {
    const csv = reportsService.exportToCSV('calls', calls);
    const filename = `calls-report-${new Date().toISOString().split('T')[0]}.csv`;
    reportsService.downloadCSV(csv, filename);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  // Calculate statistics
  const stats = {
    total: calls.length,
    completed: calls.filter(c => c.status === 'completed').length,
    inProgress: calls.filter(c => c.status === 'in_progress').length,
    failed: calls.filter(c => c.status === 'failed').length,
    totalDuration: calls.reduce((acc, c) => acc + (c.duration || 0), 0),
    avgDuration: calls.length > 0
      ? Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / calls.length)
      : 0,
    withRecordings: calls.filter(c => c.recordingUrl).length,
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calls-report">
      {/* Controls - Hidden when printing */}
      <div className="no-print mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Calls Report
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-accent-400 text-gray-900 rounded-lg hover:bg-accent-500 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="failed">Failed</option>
            </select>
          </div>

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
      <div id="printable-calls-report">
        <PrintableReport
          title="Calls Report"
          subtitle={`Total Calls: ${calls.length}`}
          filters={filters}
        >
          {/* Summary Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-blue-600">{formatDuration(stats.avgDuration)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">With Recordings</p>
                <p className="text-2xl font-bold text-purple-600">{stats.withRecordings}</p>
              </div>
            </div>
          </div>

          {/* Calls Table */}
          <div className="avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Call Details</h3>
            {calls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Date/Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Lead
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Engagement
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Recording
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calls.map((call, index) => (
                      <tr key={call._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatPrintDateTime(call.createdAt || call.startTime)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {call.leadName || call.lead?.firstName + ' ' + call.lead?.lastName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatDuration(call.duration)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            call.status === 'completed' ? 'bg-green-100 text-green-800' :
                            call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            call.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {call.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {call.engagementScore ? `${call.engagementScore}/100` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {call.recordingUrl ? (
                            <span className="text-green-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600">No calls found matching the selected filters.</p>
              </div>
            )}
          </div>
        </PrintableReport>
      </div>
    </div>
  );
};

export default CallsReport;
