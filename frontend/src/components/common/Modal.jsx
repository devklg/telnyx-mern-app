/**
 * BMAD V4 - Modal Component
 * @owner Michael Park (Frontend Lead)
 * TODO: Implement modal dialog component
 */

export default function Modal({ isOpen, onClose, children, title }) {
  // TODO: Implement modal with overlay
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 z-10 max-w-lg w-full">
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
