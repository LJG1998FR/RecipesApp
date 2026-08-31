import type { NavTab } from "../../types";
import { HomeIcon, BookmarkIcon, PersonIcon } from "../icons";

interface Props {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const NAV_ITEMS: { key: NavTab; icon: (active: boolean) => JSX.Element; label: string }[] = [
  { key: "home",    icon: (a) => <HomeIcon active={a} />,     label: "Accueil"     },
  { key: "saved",   icon: (a) => <BookmarkIcon active={a} />, label: "Sauvegardés" },
  { key: "profile", icon: (a) => <PersonIcon active={a} />,   label: "Profil"      },
];

export default function BottomNav({ active, onChange }: Props) {
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
        {NAV_ITEMS.map(({ key, icon, label }) => {
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
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
