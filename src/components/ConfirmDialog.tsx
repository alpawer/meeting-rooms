'use client';

import { useEffect, useRef } from 'react';
import { usePreferences } from '@/components/Preferences';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for actions that cannot be undone. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = usePreferences();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p className="dialog-sub" style={{ marginTop: 8 }}>
          {description}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={pending}>
            {t.confirm.keep}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t.confirm.cancelling : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
