// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Modal.tsx
//
// Modale générique réutilisable.
//
// PATTERN : "compound component" simplifié.
// On exporte Modal + Modal.Header + Modal.Footer pour que l'appelant
// contrôle le contenu sans avoir à recréer la structure overlay/box.
//
// ACCESSIBILITÉ : role="dialog" + aria-modal + fermeture sur Escape + overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from "react";
import type { ModalBaseProps } from "../../types";

interface ModalProps extends ModalBaseProps {
  children: ReactNode;
  /** Largeur max de la boîte — défaut 480px */
  maxWidth?: number;
}

export default function Modal({ onClose, children, maxWidth = 480 }: ModalProps) {
  // Fermeture sur touche Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    // Nettoyage obligatoire : évite les fuites mémoire / doublons d'écouteurs
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      // Clic sur l'overlay → fermeture (mais pas sur la boîte elle-même)
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-box"
        style={{ maxWidth }}
        // stopPropagation : évite que le clic sur la boîte ferme la modale
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

Modal.Header = function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
        {title}
      </h3>
      <button
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "0.375rem",
          color: "#94a3b8",
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        aria-label="Fermer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

Modal.Body = function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.5rem",
        padding: "1rem 1.5rem",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#f8fafc",
        borderRadius: "0 0 0.75rem 0.75rem",
      }}
    >
      {children}
    </div>
  );
};
