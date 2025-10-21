/**
 * BMAD V4 - Loader Component
 * @owner Michael Park (Frontend Lead)
 * TODO: Implement loading spinner
 */

export default function Loader({ size = 'md' }) {
  // TODO: Implement loading spinner
  return (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 h-12 w-12"></div>
    </div>
  );
}
