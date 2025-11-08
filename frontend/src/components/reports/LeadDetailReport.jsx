import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import PrintableReport from './PrintableReport';
import reportsService from '../../services/reportsService';
import { printElementWithIframe, formatPrintDate, formatPrintDateTime } from '../../utils/printHelpers';

/**
 * LeadDetailReport Component
 * Printable detailed view of a single lead
 * @param {string} leadId - ID of the lead to display
 */
const LeadDetailReport = ({ leadId }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leadId) {
      fetchLeadDetails();
    }
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const response = await reportsService.getLeadFullReport(leadId);
      setLead(response.data);
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printElementWithIframe('printable-lead-detail');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="lead-detail-report">
      {/* Print Button - Hidden when printing */}
      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Lead Report
        </button>
      </div>

      {/* Printable Content */}
      <div id="printable-lead-detail">
        <PrintableReport
          title="Lead Details Report"
          subtitle={`${lead.firstName} ${lead.lastName}`}
          showFilters={false}
        >
          {/* Contact Information */}
          <section className="mb-6 avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">
                  {lead.firstName} {lead.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{lead.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{lead.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium text-gray-900">{lead.company || 'N/A'}</p>
              </div>
              {lead.address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{lead.address}</p>
                </div>
              )}
            </div>
          </section>

          {/* Lead Status & Details */}
          <section className="mb-6 avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
              Lead Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                  lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                  lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                  lead.status === 'disqualified' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {lead.status || 'Unknown'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Import Source</p>
                <p className="font-medium text-gray-900 capitalize">{lead.importSource || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Imported Date</p>
                <p className="font-medium text-gray-900">{formatPrintDate(lead.importedAt)}</p>
              </div>
              {lead.assignedTo && (
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-medium text-gray-900">
                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Gmail Information (if available) */}
          {(lead.gmailMessageId || lead.gmailThreadId) && (
            <section className="mb-6 avoid-break">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                Gmail Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {lead.gmailMessageId && (
                  <div>
                    <p className="text-sm text-gray-600">Message ID</p>
                    <p className="font-mono text-xs text-gray-900">{lead.gmailMessageId}</p>
                  </div>
                )}
                {lead.gmailThreadId && (
                  <div>
                    <p className="text-sm text-gray-600">Thread ID</p>
                    <p className="font-mono text-xs text-gray-900">{lead.gmailThreadId}</p>
                  </div>
                )}
                {lead.emailSubject && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Email Subject</p>
                    <p className="font-medium text-gray-900">{lead.emailSubject}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Notes */}
          {lead.notes && lead.notes.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                Notes ({lead.notes.length})
              </h3>
              <div className="space-y-3">
                {lead.notes.map((note, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 avoid-break">
                    <p className="text-sm text-gray-900 mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {note.createdBy?.firstName} {note.createdBy?.lastName}
                      </span>
                      <span>{formatPrintDateTime(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Additional Information */}
          {lead.additionalInfo && (
            <section className="mb-6 avoid-break">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                Additional Information
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                  {JSON.stringify(lead.additionalInfo, null, 2)}
                </pre>
              </div>
            </section>
          )}

          {/* Metadata */}
          <section className="avoid-break">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Lead ID</p>
                <p className="font-mono text-xs text-gray-900">{lead._id}</p>
              </div>
              <div>
                <p className="text-gray-600">Created At</p>
                <p className="text-gray-900">{formatPrintDateTime(lead.createdAt)}</p>
              </div>
              {lead.updatedAt && (
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="text-gray-900">{formatPrintDateTime(lead.updatedAt)}</p>
                </div>
              )}
            </div>
          </section>
        </PrintableReport>
      </div>
    </div>
  );
};

export default LeadDetailReport;
