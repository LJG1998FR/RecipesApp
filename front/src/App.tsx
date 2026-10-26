/**
 * App.tsx — définition des routes de l'application.
 
 * (routing URL) :
 *   /          → AppRouter (app recettes)
 *   /admin/*   → AdminApp (back-office)
 *
 * Le /* sur /admin/* est important : il signifie "et tous les sous-chemins".
 * Sans lui, /admin/users ne matcherait pas.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import AppRouter  from "./router/AppRouter";
import AdminApp   from "./admin/AdminApp";
import "./styles/global.css";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

export default function App() {
  return (
    <Routes>
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

      <Route path="/*" element={<AppRouter />} />

      <Route path="/admin/*" element={<AdminApp />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}