/**
 * Setup global exécuté UNE FOIS avant toute la suite de tests front
 * (déclaré dans vite.config.ts → test.setupFiles).
 *
 * Trois choses ici, et seulement trois : on garde ce fichier minimal pour
 * qu'il reste facile à comprendre d'un coup d'œil.
 */

// 1. Matchers jest-dom : ajoute des assertions lisibles sur le DOM, ex :
//    expect(element).toBeInTheDocument()
//    expect(input).toHaveAccessibleName("Adresse e-mail")
//    expect(button).toBeDisabled()
// Sans ça, il faudrait écrire des vérifications manuelles bien plus
// verbeuses (element !== null, element.getAttribute(...) === ...).
import "@testing-library/jest-dom/vitest";

// 2. Nettoyage automatique du DOM après CHAQUE test (afterEach).
// Sans ça, le rendu d'un test resterait monté pour le suivant : deux tests
// qui rendent chacun un <button> verraient "2 éléments trouvés" au lieu de
// 1 dans le second test, pour une raison invisible dans le code du test
// lui-même. @testing-library/react exporte déjà cleanup ; on l'appelle
// explicitement ici pour que ce soit visible, plutôt que de dépendre d'un
// import automatique "React Testing Library v14+" qui changerait de
// comportement selon la version installée.
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// 3. Matcher d'accessibilité : expect(container).toHaveNoViolations()
// S'appuie sur axe-core (moteur utilisé aussi par l'extension navigateur
// "axe DevTools" et par beaucoup d'outils de CI d'accessibilité). Ce n'est
// PAS un substitut à une vraie validation W3C manuelle (voir
// tests/README_tests.md côté front) ni à un test au clavier/lecteur
// d'écran réel, mais ça attrape automatiquement une bonne partie des
// erreurs mécaniques : contraste, labels manquants, rôles ARIA invalides,
// attributs requis absents, etc.
import { toHaveNoViolations } from "vitest-axe/matchers";
expect.extend(toHaveNoViolations);
