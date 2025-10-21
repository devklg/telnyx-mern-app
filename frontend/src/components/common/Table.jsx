/**
 * BMAD V4 - Table Component
 * @owner Michael Park (Frontend Lead)
 * TODO: Implement data table component
 */

export default function Table({ columns, data, onRowClick }) {
  // TODO: Implement table with sorting and pagination
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* TODO: Render rows */}
        </tbody>
      </table>
    </div>
  );
}
