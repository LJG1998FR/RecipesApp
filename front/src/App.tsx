/**
 * App.tsx — point d'entrée de l'application.
 *
 * Ce fichier est volontairement minimal : il ne contient aucune logique.
 * Toute la navigation est déléguée à AppRouter.
 * Les styles globaux (variables CSS, reset) sont dans styles/global.css.
 */

import AppRouter from "./router/AppRouter";
import "./styles/global.css";

export default function App() {
  return <AppRouter />;
}
