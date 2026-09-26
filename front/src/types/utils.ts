/**
 * Normalise une chaîne pour la recherche "indulgente" :
 * - Passe en minuscules
 * - Décompose les caractères Unicode (NFD) : "œ" → "o" + combining character
 * - Supprime les diacritiques et les caractères combinants
 * - Gère les cas particuliers non couverts par NFD (œ → oe, æ → ae)
 *
 * Exemples :
 *   normalize("Œufs")   → "oeufs"
 *   normalize("oeufs")  → "oeufs"
 *   normalize("Éclairs") → "eclairs"
 */
export function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    // Remplace manuellement les ligatures que NFD ne décompose pas
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    // Décompose les caractères accentués en lettre + diacritique séparé
    .normalize("NFD")
    // Supprime les diacritiques (accents, cédilles, etc.)
    .replace(/[\u0300-\u036f]/g, "");
}