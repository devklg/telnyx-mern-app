import React from 'react';
import { formatPrintDate } from '../../utils/printHelpers';

/**
 * PrintableReport Component
 * Wrapper for all printable reports with consistent header/footer
 */
const PrintableReport = ({
  title,
  subtitle,
  filters,
  children,
  showDate = true,
  showFilters = true
}) => {
  const printDate = new Date();

  return (
    <div className="printable-report bg-white">
      {/* Report Header */}
      <div className="report-header border-b-2 border-primary-500 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Magnificent Worldwide
            </h1>
            <p className="text-sm text-gray-600">Marketing & Sales Group</p>
          </div>
          {showDate && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Report Generated:</p>
              <p className="text-sm font-semibold">{formatPrintDate(printDate)}</p>
              <p className="text-xs text-gray-500">{printDate.toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Title */}
      <div className="report-title mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-gray-600">{subtitle}</p>
        )}
      </div>

      {/* Filters Applied */}
      {showFilters && filters && Object.keys(filters).length > 0 && (
        <div className="report-filters bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Filters Applied:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {filters.startDate && (
              <div>
                <span className="text-gray-600">From:</span>{' '}
                <span className="font-medium">{formatPrintDate(filters.startDate)}</span>
              </div>
            )}
            {filters.endDate && (
              <div>
                <span className="text-gray-600">To:</span>{' '}
                <span className="font-medium">{formatPrintDate(filters.endDate)}</span>
              </div>
            )}
            {filters.status && (
              <div>
                <span className="text-gray-600">Status:</span>{' '}
                <span className="font-medium capitalize">{filters.status}</span>
              </div>
            )}
            {filters.source && (
              <div>
                <span className="text-gray-600">Source:</span>{' '}
                <span className="font-medium capitalize">{filters.source}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="report-content">
        {children}
      </div>

      {/* Report Footer */}
      <div className="report-footer mt-8 pt-4 border-t border-gray-300">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Magnificent Worldwide Marketing & Sales Group</p>
          <p>Page 1</p>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;
