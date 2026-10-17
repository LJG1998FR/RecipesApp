import { JSX } from "react/jsx-runtime";
import type { NavTab } from "../../types";
import { HomeIcon, BookmarkIcon, PersonIcon, PlusNavIcon } from "../icons";
import { useTranslation } from "@/context/LocaleContext";

interface Props {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

// On stocke ici la CLÉ de traduction (labelKey), pas le texte lui-même :
// ce tableau est défini hors du composant, donc on n'a pas accès au hook
// useTranslation() à cet endroit. La traduction se fait au rendu, plus bas.
const NAV_ITEMS: { key: NavTab; icon: (active: boolean) => JSX.Element; labelKey: string }[] = [
  { key: "home",    icon: (a) => <HomeIcon active={a} />,     labelKey: "common.nav.home"     },
  { key: "saved",   icon: (a) => <BookmarkIcon active={a} />, labelKey: "common.nav.saved" },
  { key: "addrecipe",   icon: (a) => <PlusNavIcon active={a} />, labelKey: "common.nav.add_recipe" },
  { key: "profile", icon: (a) => <PersonIcon active={a} />,   labelKey: "common.nav.profile"      },
];

export default function BottomNav({ active, onChange }: Props) {
  const { t } = useTranslation();
return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "10px 24px 4px",
        }}
      >
        {NAV_ITEMS.map(({ key, icon, labelKey }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 16px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "background-color 0.15s",
                /* Fond orange très subtil sur l'onglet actif */
                backgroundColor: isActive ? "rgba(224,154,90,0.12)" : "transparent",
              }}
            >
              {/* Icône — orange si actif, gris sinon */}
              <span style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-dim)" }}>
                {icon(isActive)}
              </span>
              {/* Label — orange + bold si actif */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "var(--color-primary)" : "var(--color-text-dim)",
                  letterSpacing: isActive ? "0.01em" : "normal",
                }}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
