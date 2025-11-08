import React, { useState } from 'react';
import { FileText, Phone, TrendingUp, User } from 'lucide-react';
import LeadReport from '../../components/reports/LeadReport';
import CallsReport from '../../components/reports/CallsReport';
import AnalyticsReport from '../../components/reports/AnalyticsReport';

/**
 * Reports Page
 * Main page for accessing all report types
 */
const Reports = () => {
  const [activeReport, setActiveReport] = useState('leads');

  const reportTypes = [
    {
      id: 'leads',
      name: 'Lead Report',
      icon: User,
      description: 'View and export lead data',
      color: 'blue',
    },
    {
      id: 'calls',
      name: 'Calls Report',
      icon: Phone,
      description: 'View and export call records',
      color: 'green',
    },
    {
      id: 'analytics',
      name: 'Analytics Report',
      icon: TrendingUp,
      description: 'View performance metrics and charts',
      color: 'purple',
    },
  ];

  const renderReport = () => {
    switch (activeReport) {
      case 'leads':
        return <LeadReport />;
      case 'calls':
        return <CallsReport />;
      case 'analytics':
        return <AnalyticsReport />;
      default:
        return <LeadReport />;
    }
  };

  return (
    <div className="reports-page min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary-500" />
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Reports
            </h1>
          </div>
          <p className="text-gray-600">
            Generate, view, and print comprehensive reports for leads, calls, and analytics.
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isActive = activeReport === report.id;

            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`
                  p-6 rounded-lg border-2 transition-all text-left
                  ${isActive
                    ? 'border-primary-500 bg-primary-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-3 rounded-lg
                    ${report.color === 'blue' ? 'bg-blue-100' :
                      report.color === 'green' ? 'bg-green-100' :
                      report.color === 'purple' ? 'bg-purple-100' :
                      'bg-gray-100'}
                  `}>
                    <Icon className={`
                      w-6 h-6
                      ${report.color === 'blue' ? 'text-blue-600' :
                        report.color === 'green' ? 'text-green-600' :
                        report.color === 'purple' ? 'text-purple-600' :
                        'text-gray-600'}
                    `} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {report.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {report.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="report-content">
          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
