import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Loading from "../components/layout/Loading";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Locale = string;
type Messages = Record<string, unknown>;

const DEFAULT_LOCALE: Locale = "fr";
const STORAGE_KEY = "app_locale";

// Type exporté séparément : permet d'injecter t() comme simple paramètre
// dans des fonctions utilitaires qui ne sont PAS des composants React
// (donc qui ne peuvent pas appeler useTranslation() elles-mêmes).
// Voir RecipeFormShared.tsx -> validateRecipeForm(values, t).
export type TFunction = (key: string, params?: Record<string, string | number>) => string;

// ── Chargement des JSON ──────────────────────────────────────────────────────
const localeLoaders = import.meta.glob<{ default: Messages }>("../locales/*.json");

// ── Contexte ───────────────────────────────────────────────────────────────────
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /**
   * Traduit une clé pointée, ex: t("auth.login.button_submit")
   * Interpolation simple via params, ex: t("home.greeting", { name: "Marie" })
   * sur une valeur YAML "Bonjour, {name} 👋"
   */
  t: TFunction;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE
  );
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    const loader = localeLoaders[`../locales/${locale}.json`];

    if (!loader) {
      console.error(
        `Aucun fichier de traduction trouvé pour "${locale}", repli sur "${DEFAULT_LOCALE}".`
      );
      setLocaleState(DEFAULT_LOCALE);
      return;
    }

    loader().then((mod) => setMessages(mod.default));
  }, [locale]);

  function setLocale(newLocale: Locale) {
    localStorage.setItem(STORAGE_KEY, newLocale);
    setMessages(null);
    setLocaleState(newLocale);
  }

  if (!messages) {
    return <Loading />;
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const value = key
      .split(".")
      .reduce<unknown>((obj, segment) => (obj as Record<string, unknown> | undefined)?.[segment], messages);

    if (typeof value !== "string") {
      console.warn(`Clé de traduction manquante ou invalide : "${key}"`);
      return key;
    }

    if (!params) return value;

    // Interpolation volontairement simple ({token} -> valeur).
    // Pas de gestion des pluriels/genres ici : on utilise des clés
    // separees (ex: "_singular" / "_plural") cote YAML pour ces cas.
    return value.replace(/\{(\w+)\}/g, (match, token) =>
      params[token] !== undefined ? String(params[token]) : match
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation must be used inside <LocaleProvider>");
  return ctx;
}