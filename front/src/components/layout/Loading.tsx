import type { CSSProperties } from "react";

// role="status" : rôle ARIA qui porte en lui-même aria-live="polite" et
// aria-atomic="true" par défaut (table des rôles ARIA) — on le redéclare
// explicitement par robustesse (certaines versions de lecteurs d'écran/
// navigateurs plus anciens appliquent mal les valeurs implicites), mais ce
// n'est techniquement pas indispensable avec role="status" seul.
// aria-busy="true" renforce le signal "contenu en cours de modification".
//
// ⚠️ Un spinner purement visuel ne communique RIEN à un lecteur d'écran, même
// entouré de role="status"/aria-live : une zone "live" n'annonce que ce qui
// change dans son CONTENU TEXTUEL (ou son nom accessible). Sans texte, c'est
// un <div> muet qui tourne dans le vide. Le spinner devient donc purement
// décoratif (aria-hidden="true"), et le texte "Chargement…" reste présent
// dans le DOM pour les technologies d'assistance — juste masqué visuellement
// (sr-only) plutôt que supprimé, puisque c'est lui, et lui seul, qui porte
// l'information réellement annoncée à l'oral.
//
// prefers-reduced-motion : une rotation continue peut gêner des personnes
// avec des troubles vestibulaires (nausées, vertiges) si l'écran de
// chargement reste affiché plusieurs secondes. On coupe l'animation pour qui
// l'a demandé dans les réglages système, sans rien changer pour les autres.
//
// ⚠️ PAS de useTranslation() ici, volontairement : LocaleContext.tsx rend
// LUI-MÊME <Loading /> pendant qu'il charge encore fr.json/en.json, AVANT
// de poser son <LocaleContext.Provider>. Si Loading dépend de
// useTranslation(), on obtient une dépendance circulaire impossible à
// satisfaire ("useTranslation must be used inside <LocaleProvider>" au
// runtime) : il faudrait que les traductions soient déjà chargées pour
// afficher le message disant qu'elles sont en train de charger. Ce
// composant doit rester utilisable AVANT que les Providers (Locale, User…)
// n'aient fini leur propre initialisation — donc texte en dur, assumé.
const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function Loading() {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}
      >
        <span className="a11y-spinner" aria-hidden="true" />
        <span style={visuallyHiddenStyle}>Chargement…</span>
      </div>
    );
}