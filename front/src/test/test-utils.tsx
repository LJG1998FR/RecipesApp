import type { ReactElement } from "react";
import { render, screen, waitFor, type RenderOptions } from "@testing-library/react";
import { LocaleProvider } from "../context/LocaleContext";

/**
 * Beaucoup de composants de l'app (FrontOffice ET BackOffice) appellent
 * useTranslation() et doivent donc être rendus à l'intérieur d'un vrai
 * <LocaleProvider>. On a deux options pour les tests :
 *
 *   1. Mocker LocaleContext entièrement (rapide, mais on ne teste alors
 *      plus du tout que les vraies clés de traduction existent : une faute
 *      de frappe dans "recipe.form.error_title_required" ne serait JAMAIS
 *      détectée par un test qui renvoie juste la clé telle quelle).
 *   2. Utiliser le VRAI LocaleProvider avec les VRAIS fichiers
 *      front/src/locales/fr.json et en.json.
 *
 * On choisit l'option 2 ici : plus proche de ce que verra réellement
 * l'utilisateur, et ça fait doublement office de test de non-régression
 * sur les fichiers de traduction (une clé supprimée par erreur dans
 * fr.json ferait échouer n'importe quel test qui s'attend à voir son texte
 * affiché).
 *
 * Contrepartie : LocaleProvider affiche <Loading /> (role="status") tant
 * que le JSON n'est pas chargé (import.meta.glob + import() dynamique,
 * donc toujours au moins un micro-tick asynchrone, même en test). On
 * attend donc explicitement sa disparition avant de rendre la main à
 * l'appelant — sinon un test pourrait chercher un texte qui n'est pas
 * encore monté et échouer pour une mauvaise raison ("élément introuvable"
 * au lieu de "pas encore chargé").
 */
export async function renderWithLocale(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const utils = render(ui, {
    wrapper: ({ children }) => <LocaleProvider>{children}</LocaleProvider>,
    ...options,
  });

  await waitFor(() => {
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  return utils;
}

export * from "@testing-library/react";
