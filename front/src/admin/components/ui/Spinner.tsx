// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Spinner.tsx
//
// Spinner de chargement isolé pour l'interface admin.
//
// POURQUOI ne pas réutiliser Loading.tsx du front ?
//   - Loading.tsx utilise les variables CSS du thème sombre (--color-text-muted)
//   - L'admin a un fond blanc, ces variables ne sont pas définies dans ce contexte
//   - On respecte la séparation front / admin (voir src/admin/README.md)
//
// TECHNIQUE : animation CSS @keyframes via style inline.
//   Le keyframe "spin" est injecté une seule fois dans le <head> au montage
//   du composant grâce à useEffect.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";

interface AdminSpinnerProps {
  /** Texte affiché sous le spinner — optionnel */
  label?: string;
  /** Prend toute la hauteur disponible si true (défaut) */
  fullHeight?: boolean;
}

// Injection du keyframe une seule fois dans le <head>
// (évite de le dupliquer à chaque rendu)
function injectSpinKeyframe() {
  if (document.getElementById("admin-spin-keyframe")) return;

  const style = document.createElement("style");
  style.id = "admin-spin-keyframe";
  style.textContent = `
    @keyframes admin-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default function AdminSpinner({
  label = "Chargement…",
  fullHeight = true,
}: AdminSpinnerProps) {
  useEffect(() => {
    injectSpinKeyframe();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: fullHeight ? "60vh" : "auto",
        gap: 12,
      }}
    >
      {/* Cercle animé */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid #e2e8f0",       // cercle gris clair (fond)
          borderTopColor: "#94a3b8",          // arc gris plus foncé (partie animée)
          animation: "admin-spin 0.75s linear infinite",
        }}
      />

      {/* Label optionnel */}
      {label && (
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
          {label}
        </p>
      )}
    </div>
  );
}