/**
 * Print Helpers
 * Utilities for printing reports and documents
 */

/**
 * Trigger browser print dialog for a specific element
 * @param {string} elementId - ID of element to print
 */
export const printElement = (elementId) => {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error('Print element not found:', elementId);
    return;
  }

  // Store original body content
  const originalContent = document.body.innerHTML;

  // Replace body with print content
  document.body.innerHTML = printContent.innerHTML;

  // Trigger print
  window.print();

  // Restore original content
  document.body.innerHTML = originalContent;

  // Reload to restore React event listeners
  window.location.reload();
};

/**
 * Better print method using iframe (preserves page state)
 * @param {string} elementId - ID of element to print
 */
export const printElementWithIframe = (elementId) => {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error('Print element not found:', elementId);
    return;
  }

  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow.document;

  // Copy styles from parent document
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        // Handle cross-origin stylesheets
        return '';
      }
    })
    .join('\n');

  // Write content to iframe
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Report</title>
        <style>
          ${styles}

          /* Print-specific styles */
          @media print {
            body {
              margin: 0;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    }, 250);
  };
};

/**
 * Format date for printing
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatPrintDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time for printing
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export const formatPrintDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate print-friendly filename
 * @param {string} reportType - Type of report
 * @param {Object} filters - Report filters
 * @returns {string} Filename
 */
export const generatePrintFilename = (reportType, filters = {}) => {
  const date = new Date().toISOString().split('T')[0];
  let filename = `${reportType}-report-${date}`;

  if (filters.startDate && filters.endDate) {
    filename += `-${filters.startDate}-to-${filters.endDate}`;
  }

  return filename;
};

/**
 * Add print styles to document
 */
export const addPrintStyles = () => {
  const styleId = 'print-styles';

  // Check if styles already added
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @media print {
      /* Hide non-printable elements */
      .no-print,
      .no-print *,
      button:not(.print-button),
      nav,
      .sidebar,
      header .actions,
      .page-header .actions {
        display: none !important;
      }

      /* Page setup */
      @page {
        margin: 1cm;
        size: A4;
      }

      body {
        font-size: 11pt;
        line-height: 1.5;
        color: #000;
        background: #fff;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      th, td {
        padding: 8px;
        border: 1px solid #ddd;
      }

      /* Page breaks */
      .page-break {
        page-break-after: always;
      }

      .avoid-break {
        page-break-inside: avoid;
      }

      /* Headers */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
        color: #000;
      }

      /* Links */
      a {
        color: #000;
        text-decoration: underline;
      }

      /* Remove shadows and backgrounds */
      * {
        box-shadow: none !important;
        text-shadow: none !important;
      }

      .card,
      .panel {
        border: 1px solid #ddd !important;
        background: #fff !important;
      }
    }
  `;

  document.head.appendChild(style);
};

// Auto-add print styles when module is imported
if (typeof window !== 'undefined') {
  addPrintStyles();
}
