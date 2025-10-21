/**
 * BMAD V4 - Card Component
 * @owner Michael Park (Frontend Lead)
 * TODO: Implement card container component
 */

export default function Card({ children, title, className = '' }) {
  // TODO: Implement card component
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
