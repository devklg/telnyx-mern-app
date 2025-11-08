# Reports System Integration Guide

This guide explains how to integrate the Reports System into your application.

## Quick Start

### 1. Import the Reports Page

Add the Reports page to your router:

```jsx
// In your App.jsx or routes configuration
import Reports from './pages/Reports';

<Route path="/reports" element={<Reports />} />
```

### 2. Add Navigation Link

Add a link to the Reports page in your navigation:

```jsx
import { FileText } from 'lucide-react';

<nav>
  <Link to="/reports">
    <FileText className="w-5 h-5" />
    Reports
  </Link>
</nav>
```

## Integration Points

### Lead Detail Page Integration

Add print functionality to individual lead pages:

```jsx
// In your LeadDetail.jsx or similar
import { LeadDetailReport } from '../components/reports';

const LeadDetail = ({ leadId }) => {
  const [showPrintView, setShowPrintView] = useState(false);

  return (
    <div>
      {/* Your existing lead detail view */}

      <button onClick={() => setShowPrintView(true)}>
        Print Lead Report
      </button>

      {showPrintView && (
        <div className="print-overlay">
          <LeadDetailReport leadId={leadId} />
          <button onClick={() => setShowPrintView(false)}>Close</button>
        </div>
      )}
    </div>
  );
};
```

### Dashboard Integration

Add quick report links to your dashboard:

```jsx
import { Link } from 'react-router-dom';
import { FileText, Phone, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  return (
    <div>
      {/* Quick Report Links */}
      <div className="quick-reports">
        <Link to="/reports?type=leads" className="report-card">
          <FileText />
          <span>Lead Report</span>
        </Link>

        <Link to="/reports?type=calls" className="report-card">
          <Phone />
          <span>Calls Report</span>
        </Link>

        <Link to="/reports?type=analytics" className="report-card">
          <TrendingUp />
          <span>Analytics</span>
        </Link>
      </div>
    </div>
  );
};
```

### Export Functionality from List Pages

Add CSV export to your existing list pages:

```jsx
// In LeadsList.jsx
import reportsService from '../services/reportsService';
import { Download } from 'lucide-react';

const LeadsList = () => {
  const [leads, setLeads] = useState([]);

  const handleExportCSV = () => {
    const csv = reportsService.exportToCSV('leads', leads);
    reportsService.downloadCSV(csv, `leads-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div>
      <button onClick={handleExportCSV}>
        <Download className="w-4 h-4" />
        Export to CSV
      </button>

      {/* Your leads table */}
    </div>
  );
};
```

## API Requirements

Ensure your backend provides the following endpoints:

### Lead Endpoints
- `GET /api/leads` - Get all leads with filtering
- `GET /api/leads/stats` - Get lead statistics
- `GET /api/leads/:id` - Get single lead details

### Call Endpoints
- `GET /api/calls` - Get all calls with filtering
- `GET /api/calls/active` - Get active calls

### Analytics Endpoints
- `GET /api/analytics/overview` - Get overview metrics
- `GET /api/analytics/conversion` - Get conversion metrics
- `GET /api/analytics/performance` - Get performance metrics

### Dashboard Endpoint
- `GET /api/dashboard/stats` - Get dashboard statistics

## Customization

### Brand Styling

The reports use your brand colors defined in `index.css`:

```css
@theme {
  --color-primary-500: #3b82f6;  /* Primary Blue */
  --color-accent-400: #facc15;   /* Accent Gold */
  --font-heading: "Orbitron", sans-serif;
  --font-body: "Poppins", sans-serif;
}
```

### Custom Report Headers

Customize the report header in `PrintableReport.jsx`:

```jsx
<div className="report-header">
  <div className="flex items-center justify-between">
    <div>
      <h1>Your Company Name</h1>
      <p>Your Tagline</p>
    </div>
    {/* ... */}
  </div>
</div>
```

### Add Custom Filters

Extend filters in report components:

```jsx
// In LeadReport.jsx
const [filters, setFilters] = useState({
  status: '',
  source: '',
  startDate: '',
  endDate: '',
  // Add your custom filters
  customField: '',
});

// Add filter UI
<div>
  <label>Custom Field</label>
  <select
    value={filters.customField}
    onChange={(e) => handleFilterChange('customField', e.target.value)}
  >
    <option value="">All</option>
    <option value="option1">Option 1</option>
  </select>
</div>
```

### Custom CSV Columns

Modify CSV export in `reportsService.js`:

```javascript
exportToCSV: (reportType, data) => {
  let csvContent = '';

  if (reportType === 'leads' && data.length > 0) {
    // Add your custom headers
    csvContent = 'First Name,Last Name,Email,Phone,Status,Source,Custom Field\n';

    // Add your custom data
    data.forEach(lead => {
      csvContent += `"${lead.firstName}","${lead.lastName}","${lead.email}","${lead.phone}","${lead.status}","${lead.importSource}","${lead.customField}"\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return blob;
}
```

## Styling

### Print Styles

Customize print styles in `index.css`:

```css
@media print {
  /* Custom print styles */
  @page {
    margin: 2cm;  /* Adjust margins */
    size: letter; /* Change page size */
  }

  /* Hide custom elements */
  .my-custom-class {
    display: none !important;
  }
}
```

### Report Component Styles

Add custom styles to report components:

```jsx
<div className="my-custom-report">
  <PrintableReport
    title="Custom Report"
    subtitle="Custom Subtitle"
  >
    <div className="custom-section">
      {/* Custom content with custom styles */}
    </div>
  </PrintableReport>
</div>
```

```css
/* In your CSS file */
.my-custom-report {
  /* Custom styles */
}

.custom-section {
  /* Section styles */
}

@media print {
  .custom-section {
    /* Print-specific styles */
  }
}
```

## Advanced Usage

### Email Reports

Integrate with email service:

```jsx
import { printElementWithIframe } from '../utils/printHelpers';

const emailReport = async (reportHtml) => {
  const response = await api.post('/api/reports/email', {
    to: 'user@example.com',
    subject: 'Your Report',
    html: reportHtml,
  });
};
```

### Save Report as PDF

Use browser print to PDF:

```jsx
import { printElementWithIframe } from '../utils/printHelpers';

const saveAsPDF = () => {
  // User must select "Save as PDF" in print dialog
  printElementWithIframe('report-id');
};
```

### Schedule Reports

Create a scheduling interface:

```jsx
const ScheduleReport = () => {
  const [schedule, setSchedule] = useState({
    frequency: 'weekly',
    reportType: 'leads',
    recipients: [],
  });

  const handleSchedule = async () => {
    await api.post('/api/reports/schedule', schedule);
  };

  return (
    <div>
      {/* Schedule form */}
    </div>
  );
};
```

## Testing

### Test Print Functionality

1. Open a report page
2. Click the "Print" button
3. Verify:
   - No navigation or buttons in print preview
   - Headers and footers are correct
   - Tables are formatted properly
   - Charts are visible
   - Page breaks are appropriate

### Test CSV Export

1. Generate a report with data
2. Click "Export CSV"
3. Verify:
   - File downloads successfully
   - All expected columns are present
   - Data is formatted correctly
   - Special characters are handled

### Test Filters

1. Apply various filters
2. Verify data updates correctly
3. Clear filters and verify all data shows

## Troubleshooting

### Issue: Reports page not showing

**Solution:** Check that the route is properly configured in your router

```jsx
<Route path="/reports" element={<Reports />} />
```

### Issue: Print button doesn't work

**Solution:**
1. Check browser console for errors
2. Verify element ID matches
3. Ensure print styles are loaded

### Issue: CSV export is empty

**Solution:**
1. Check that data is loaded
2. Verify API responses
3. Check console for errors

### Issue: Charts don't print

**Solution:**
1. Ensure charts are fully loaded before printing
2. Add delay before print: `setTimeout(() => print(), 500)`
3. Check print styles for chart containers

## Support

For issues or questions:
- Check the [Reports README](/src/components/reports/README.md)
- Review component source code
- Contact the development team

## Next Steps

1. ✅ Integrate Reports page into your app
2. ✅ Test all report types
3. ✅ Customize styling to match your brand
4. ✅ Add navigation links
5. ✅ Test print functionality
6. ✅ Configure API endpoints
7. ✅ Train users on features
