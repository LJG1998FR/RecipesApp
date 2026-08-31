// ── Icônes SVG — tous les svg inline du projet regroupés ici ──────────────────
// Import : import { StarIcon, ClockIcon, ... } from "../icons";

export const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#e09a5a">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z" />
  </svg>
);

export const ClockIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const FlameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.5.4-2.9 1-4z" />
  </svg>
);

export const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill={filled ? "#e09a5a" : "none"}
    stroke={filled ? "#e09a5a" : "currentColor"}
    strokeWidth="2"
  >
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

export const HomeIcon = ({ active = false }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8"
    fill={active ? "currentColor" : "none"}
    stroke="currentColor"
  >
    {active ? (
      /* Rempli quand actif — maison pleine avec porte découpée */
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1V9.5z" />
    ) : (
      /* Outline quand inactif */
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    )}
  </svg>
);

export const BookmarkIcon = ({ active = false }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8"
    fill={active ? "currentColor" : "none"}
    stroke="currentColor"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

export const PersonIcon = ({ active = false }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8"
    fill={active ? "currentColor" : "none"}
    stroke="currentColor"
  >
    {active ? (
      /* Rempli quand actif */
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 8a7 7 0 0114 0H5z" />
    ) : (
      /* Outline quand inactif */
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    )}
  </svg>
);

export const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const BulbIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 017 7c0 2.62-1.46 4.91-3.62 6.16L15 17H9l-.38-1.84A7 7 0 015 9a7 7 0 017-7z" />
  </svg>
);
