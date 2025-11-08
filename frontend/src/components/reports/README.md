# Reports System

Comprehensive reporting and printing functionality for the BMAD V4 frontend application.

## Features

### Report Types

1. **Lead Report** - View, filter, and export lead data
2. **Lead Detail Report** - Printable detailed view of individual leads
3. **Calls Report** - View, filter, and export call records
4. **Analytics Report** - Performance metrics with charts and visualizations

### Capabilities

- **Print Functionality** - Professional print layouts for all reports
- **CSV Export** - Export lead and call data to CSV
- **Advanced Filtering** - Filter by date range, status, source, etc.
- **Real-time Data** - Fetches latest data from API
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Brand Styling** - Magnificent Worldwide brand colors and fonts

## Components

### PrintableReport

Wrapper component that provides consistent header/footer for all reports.

**Props:**
- `title` (string) - Report title
- `subtitle` (string) - Report subtitle
- `filters` (object) - Applied filters to display
- `showDate` (boolean) - Show generation date (default: true)
- `showFilters` (boolean) - Show filters section (default: true)
- `children` (ReactNode) - Report content

**Example:**
```jsx
<PrintableReport
  title="Lead Report"
  subtitle="Total Leads: 150"
  filters={{ status: 'qualified', startDate: '2024-01-01' }}
>
  {/* Report content */}
</PrintableReport>
```

### LeadReport

Full lead report with filtering and export capabilities.

**Features:**
- Paginated lead list
- Filter by status, source, date range
- Search functionality
- CSV export
- Print functionality
- Summary statistics

**Usage:**
```jsx
import { LeadReport } from '../../components/reports';

<LeadReport />
```

### LeadDetailReport

Detailed view of a single lead for printing.

**Props:**
- `leadId` (string, required) - ID of the lead

**Features:**
- Contact information
- Lead status and details
- Gmail integration info
- Notes history
- Additional information
- Metadata

**Usage:**
```jsx
import { LeadDetailReport } from '../../components/reports';

<LeadDetailReport leadId="123abc" />
```

### CallsReport

Call records report with filtering and export.

**Features:**
- Call history
- Filter by status, date range
- Duration statistics
- Recording indicators
- CSV export
- Print functionality

**Usage:**
```jsx
import { CallsReport } from '../../components/reports';

<CallsReport />
```

### AnalyticsReport

Performance analytics with charts and metrics.

**Features:**
- Key performance metrics
- Lead status distribution (pie chart)
- Conversion funnel (bar chart)
- Call performance trends (line chart)
- Performance summary table
- Date range filtering

**Usage:**
```jsx
import { AnalyticsReport } from '../../components/reports';

<AnalyticsReport />
```

## Services

### reportsService

API service for fetching report data.

**Methods:**

- `getLeadsReport(filters)` - Get leads with filters
- `getLeadFullReport(leadId)` - Get single lead details
- `getCallsReport(filters)` - Get calls with filters
- `getAnalyticsReport(filters)` - Get analytics data
- `getLeadStats()` - Get lead statistics
- `getDashboardStats()` - Get dashboard stats
- `exportToCSV(reportType, data)` - Export data to CSV
- `downloadCSV(blob, filename)` - Download CSV file

**Example:**
```javascript
import reportsService from '../../services/reportsService';

// Fetch leads report
const data = await reportsService.getLeadsReport({
  status: 'qualified',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// Export to CSV
const csv = reportsService.exportToCSV('leads', data.leads);
reportsService.downloadCSV(csv, 'leads-report.csv');
```

## Utilities

### printHelpers

Utility functions for printing functionality.

**Functions:**

- `printElement(elementId)` - Simple print (reloads page)
- `printElementWithIframe(elementId)` - Advanced print (preserves state)
- `formatPrintDate(date)` - Format date for printing
- `formatPrintDateTime(date)` - Format date/time for printing
- `generatePrintFilename(reportType, filters)` - Generate filename
- `addPrintStyles()` - Add print styles to document (auto-called)

**Example:**
```javascript
import { printElementWithIframe, formatPrintDate } from '../../utils/printHelpers';

// Print a report
printElementWithIframe('printable-report-id');

// Format dates
const formattedDate = formatPrintDate(new Date());
// Output: "January 1, 2024"
```

## Print Styles

Print-specific CSS is defined in `/src/index.css` under `@media print`.

**Features:**
- Hides navigation, buttons, and non-printable elements
- Sets A4 page size with proper margins
- Formats tables for printing
- Ensures charts and graphs are visible
- Maintains status badge colors for clarity
- Page break control

**CSS Classes:**

- `.no-print` - Hide element when printing
- `.page-break` - Force page break after element
- `.avoid-break` - Prevent page break inside element
- `.printable-report` - Main report container

## Filters

All reports support filtering with the following common filters:

### Date Range Filters
- `startDate` (string) - Filter from date (YYYY-MM-DD)
- `endDate` (string) - Filter to date (YYYY-MM-DD)

### Lead Report Filters
- `status` (string) - new, contacted, qualified, disqualified
- `source` (string) - gmail, manual, import
- `search` (string) - Search by name, email, or phone

### Call Report Filters
- `status` (string) - completed, in_progress, failed
- `leadId` (string) - Filter by specific lead

## Export Formats

### CSV Export

CSV exports include:

**Lead Reports:**
- First Name, Last Name, Email, Phone, Status, Source, Imported Date, Assigned To

**Call Reports:**
- Date, Lead Name, Duration, Status, Engagement Score, Recording

## Usage Examples

### Basic Reports Page

```jsx
import React, { useState } from 'react';
import { LeadReport, CallsReport, AnalyticsReport } from '../components/reports';

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('leads');

  return (
    <div>
      <h1>Reports</h1>
      <div>
        <button onClick={() => setActiveReport('leads')}>Leads</button>
        <button onClick={() => setActiveReport('calls')}>Calls</button>
        <button onClick={() => setActiveReport('analytics')}>Analytics</button>
      </div>

      {activeReport === 'leads' && <LeadReport />}
      {activeReport === 'calls' && <CallsReport />}
      {activeReport === 'analytics' && <AnalyticsReport />}
    </div>
  );
};
```

### Print Individual Lead from Lead Detail Page

```jsx
import React from 'react';
import { LeadDetailReport } from '../components/reports';

const LeadDetailPage = ({ match }) => {
  const leadId = match.params.id;

  return (
    <div>
      <LeadDetailReport leadId={leadId} />
    </div>
  );
};
```

### Custom Report Component

```jsx
import React from 'react';
import { PrintableReport } from '../components/reports';
import { printElementWithIframe } from '../utils/printHelpers';

const CustomReport = ({ data }) => {
  const handlePrint = () => {
    printElementWithIframe('custom-report');
  };

  return (
    <div>
      <button onClick={handlePrint} className="no-print">Print</button>

      <div id="custom-report">
        <PrintableReport
          title="Custom Report"
          subtitle="My Custom Data"
        >
          <div>
            {/* Custom report content */}
          </div>
        </PrintableReport>
      </div>
    </div>
  );
};
```

## Browser Support

- Chrome/Edge (recommended for best print support)
- Firefox
- Safari

## Best Practices

1. **Use `no-print` class** for elements that shouldn't appear in printed output
2. **Use `avoid-break` class** to keep sections together when printing
3. **Use `page-break` class** to force page breaks between major sections
4. **Test print preview** before finalizing report layouts
5. **Keep tables simple** for better print formatting
6. **Use semantic HTML** for better accessibility
7. **Optimize charts** for black and white printing if needed

## Troubleshooting

### Print doesn't work
- Ensure the element ID matches the one passed to `printElementWithIframe()`
- Check browser console for errors
- Verify print styles are loaded

### Charts don't appear in print
- Charts require JavaScript to render, ensure they're loaded before printing
- Add `page-break-inside: avoid` to chart containers

### Export CSV is empty
- Verify data is loaded before calling export
- Check API responses for errors
- Ensure data format matches expected structure

## Future Enhancements

- [ ] PDF export functionality
- [ ] Email report functionality
- [ ] Scheduled report generation
- [ ] Custom report builder
- [ ] Report templates
- [ ] Multi-page print pagination
- [ ] Chart customization options
- [ ] Advanced filters UI
- [ ] Report history/bookmarks
