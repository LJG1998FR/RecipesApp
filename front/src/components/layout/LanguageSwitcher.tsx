// front/src/components/layout/LanguageSwitcher.tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation, type Locale } from "@/context/LocaleContext";

// Liste centralisée : ajouter une langue = ajouter une ligne ici.
const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  // Fermeture au clic extérieur — pattern déjà utilisé dans votre
  // IngredientInput (AddRecipePage.tsx), on reste cohérent avec l'existant.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fermeture au clavier (Échap) — requis pour un composant "menu" accessible
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function choose(code: Locale) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language_switcher.current", { lang: current.label })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 10px",
          borderRadius: 12,
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {/* Drapeau décoratif : l'info "quelle langue" est déjà dans le texte */}
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language_switcher.label")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            backgroundColor: "#2a2420",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 150,
            zIndex: 50,
          }}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={lang.code === locale}
                onClick={() => choose(lang.code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  textAlign: "left",
                  color: "var(--color-text)",
                  backgroundColor: lang.code === locale ? "rgba(224,154,90,0.15)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}