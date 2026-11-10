// front/src/hooks/useDocumentTitle.ts
import { useEffect } from "react";

const APP_NAME = "Saveurs";

/**
 * Pose document.title au format "Saveurs - {pageName}".
 * Si pageName est undefined (ex: écran en cours de chargement), on garde
 * juste le nom de l'app — évite un flash "Saveurs - undefined".
 */
export function useDocumentTitle(pageName?: string) {
  useEffect(() => {
    document.title = pageName ? `${APP_NAME} - ${pageName}` : APP_NAME;
  }, [pageName]);
}