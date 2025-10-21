/**
 * BMAD V4 - Lead Status Badge Component
 * @owner James Taylor (Leads UI)
 * TODO: Display lead status with color coding
 */

export default function LeadStatusBadge({ status }) {
  // TODO: Color code by status
  const colors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-green-100 text-green-800',
    disqualified: 'bg-red-100 text-red-800',
    converted: 'bg-purple-100 text-purple-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
}
