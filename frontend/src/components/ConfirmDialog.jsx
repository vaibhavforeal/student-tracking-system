import { useEffect, useRef } from 'react';
import { HiOutlineExclamation } from 'react-icons/hi';

/**
 * Reusable confirmation dialog that replaces window.confirm().
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete Department?"
 *     message="This action cannot be undone."
 *     confirmText="Delete"
 *     onConfirm={handleConfirmedDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the modal is rendered
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 2000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          textAlign: 'center',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <div style={{ padding: 'var(--space-8) var(--space-6) var(--space-4)' }}>
          {/* Warning icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-5)',
            }}
          >
            <HiOutlineExclamation size={28} style={{ color: '#ef4444' }} />
          </div>

          <h3
            style={{
              fontSize: 'var(--font-lg)',
              fontWeight: 600,
              color: 'var(--color-gray-900)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--color-gray-500)',
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            padding: 'var(--space-4) var(--space-6) var(--space-6)',
            justifyContent: 'center',
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ minWidth: '100px' }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
            style={{ minWidth: '100px' }}
          >
            {loading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
