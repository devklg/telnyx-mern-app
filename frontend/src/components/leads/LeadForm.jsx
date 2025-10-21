/**
 * BMAD V4 - Lead Form Component
 * @owner James Taylor (Leads UI)
 * TODO: Form for creating/editing leads
 */

import { useState } from 'react';

export default function LeadForm({ lead, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(lead || {});

  // TODO: Handle form input changes
  // TODO: Validate form data
  // TODO: Submit to API
  // TODO: Handle errors

  return (
    <form className="space-y-4">
      {/* TODO: Add form fields */}
      {/* First Name, Last Name, Phone, Email, Company, Source */}
    </form>
  );
}
