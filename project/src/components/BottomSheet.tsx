import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional labelled actions row under the body. */
  footer?: ReactNode;
};

/** Reusable bottom sheet for phone actions (tap targets ≥44px via CSS). */
export function BottomSheet({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bottom-sheet-root" role="presentation">
      <button
        type="button"
        className="bottom-sheet-backdrop"
        aria-label="Close sheet"
        onClick={onClose}
      />
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet-handle" aria-hidden />
        <header className="bottom-sheet-header">
          <h2>{title}</h2>
          <button type="button" className="secondary tap-target" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="bottom-sheet-body">{children}</div>
        {footer ? <footer className="bottom-sheet-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
