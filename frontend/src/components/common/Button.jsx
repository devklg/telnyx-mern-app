/**
 * BMAD V4 - Button Component
 * @owner Michael Park (Frontend Lead)
 * TODO: Implement reusable button component
 */

export default function Button({ children, onClick, variant = 'primary', disabled = false }) {
  // TODO: Implement button with variants
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-${variant}`}
    >
      {children}
    </button>
  );
}
