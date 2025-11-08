import React, { useState, useEffect } from 'react';
import { Printer, Download, Filter } from 'lucide-react';
import PrintableReport from './PrintableReport';
import reportsService from '../../services/reportsService';
import { printElementWithIframe, formatPrintDate } from '../../utils/printHelpers';

/**
 * LeadReport Component
 * Displays and prints lead reports with filtering
 */
const LeadReport = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        reportsService.getLeadsReport(filters),
        reportsService.getLeadStats(),
      ]);

      setLeads(leadsData.data?.leads || []);
      setStats(statsData.data || statsData);
    } catch (error) {
      console.error('Error fetching lead report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printElementWithIframe('printable-lead-report');
  };

  const handleExportCSV = () => {
    const csv = reportsService.exportToCSV('leads', leads);
    const filename = `leads-report-${new Date().toISOString().split('T')[0]}.csv`;
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
      source: '',
      startDate: '',
      endDate: '',
    });
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
    <div className="lead-report">
      {/* Controls - Hidden when printing */}
      <div className="no-print mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Lead Report
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Sources</option>
              <option value="gmail">Gmail</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
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
      <div id="printable-lead-report">
        <PrintableReport
          title="Lead Report"
          subtitle={`Total Leads: ${leads.length}`}
          filters={filters}
        >
          {/* Summary Statistics */}
          {stats && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">New</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.new || 0}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Qualified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.qualified || 0}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Contacted</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.contacted || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Details</h3>
            {leads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Imported
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead, index) => (
                      <tr key={lead._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {lead.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {lead.phone || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
                          {lead.importSource || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatPrintDate(lead.importedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600">No leads found matching the selected filters.</p>
              </div>
            )}
          </div>
        </PrintableReport>
      </div>
    </div>
  );
};

export default LeadReport;
