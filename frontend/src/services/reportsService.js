import api from './api';

/**
 * Reports Service
 * Handles all report generation and data fetching for reporting
 */

const reportsService = {
  /**
   * Get leads report with filters
   * @param {Object} filters - Report filters (startDate, endDate, status, source)
   * @returns {Promise} Leads report data
   */
  getLeadsReport: async (filters = {}) => {
    try {
      const response = await api.get('/leads', {
        params: {
          ...filters,
          limit: 1000, // Get all for report
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching leads report:', error);
      throw error;
    }
  },

  /**
   * Get single lead full report
   * @param {string} leadId - Lead ID
   * @returns {Promise} Single lead full details
   */
  getLeadFullReport: async (leadId) => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lead report:', error);
      throw error;
    }
  },

  /**
   * Get calls report with filters
   * @param {Object} filters - Report filters (startDate, endDate, status, leadId)
   * @returns {Promise} Calls report data
   */
  getCallsReport: async (filters = {}) => {
    try {
      const response = await api.get('/calls', {
        params: {
          ...filters,
          limit: 1000,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching calls report:', error);
      throw error;
    }
  },

  /**
   * Get analytics overview report
   * @param {Object} filters - Report filters (startDate, endDate)
   * @returns {Promise} Analytics data
   */
  getAnalyticsReport: async (filters = {}) => {
    try {
      const [overview, conversion, performance] = await Promise.all([
        api.get('/analytics/overview', { params: filters }),
        api.get('/analytics/conversion', { params: filters }),
        api.get('/analytics/performance', { params: filters }),
      ]);

      return {
        overview: overview.data,
        conversion: conversion.data,
        performance: performance.data,
      };
    } catch (error) {
      console.error('Error fetching analytics report:', error);
      throw error;
    }
  },

  /**
   * Get lead statistics for reporting
   * @returns {Promise} Lead statistics
   */
  getLeadStats: async () => {
    try {
      const response = await api.get('/leads/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   * @returns {Promise} Dashboard stats
   */
  getDashboardStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Export report to CSV
   * @param {string} reportType - Type of report (leads, calls, analytics)
   * @param {Object} filters - Report filters
   * @param {Array} data - Data to export
   * @returns {Blob} CSV blob for download
   */
  exportToCSV: (reportType, data) => {
    let csvContent = '';

    if (reportType === 'leads' && data.length > 0) {
      // Headers
      csvContent = 'First Name,Last Name,Email,Phone,Status,Source,Imported Date,Assigned To\n';

      // Data rows
      data.forEach(lead => {
        csvContent += `"${lead.firstName || ''}","${lead.lastName || ''}","${lead.email || ''}","${lead.phone || ''}","${lead.status || ''}","${lead.importSource || ''}","${lead.importedAt ? new Date(lead.importedAt).toLocaleDateString() : ''}","${lead.assignedTo?.firstName || ''} ${lead.assignedTo?.lastName || ''}"\n`;
      });
    } else if (reportType === 'calls' && data.length > 0) {
      // Headers
      csvContent = 'Date,Lead Name,Duration,Status,Engagement Score,Recording\n';

      // Data rows
      data.forEach(call => {
        csvContent += `"${call.createdAt ? new Date(call.createdAt).toLocaleDateString() : ''}","${call.leadName || ''}","${call.duration || ''}","${call.status || ''}","${call.engagementScore || 'N/A'}","${call.recordingUrl ? 'Yes' : 'No'}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  },

  /**
   * Download CSV file
   * @param {Blob} blob - CSV blob
   * @param {string} filename - Filename for download
   */
  downloadCSV: (blob, filename) => {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  },
};

export default reportsService;
