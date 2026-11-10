import { Routes, Route, Navigate } from "react-router-dom";
import AppRouter  from "./router/AppRouter";
import AdminApp   from "./admin/AdminApp";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useTranslation } from "./context/LocaleContext";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import "./styles/global.css";

// Petit wrapper : pose le titre puis rend ses enfants tels quels.
// Évite de dupliquer `useDocumentTitle(...)` dans chaque page de route.
function TitledRoute({ title, children }: { title: string; children: React.ReactNode }) {
  useDocumentTitle(title);
  return <>{children}</>;
}

export default function App() {
  const { t } = useTranslation();

  return (
    <Routes>
      <Route
        path="/mot-de-passe-oublie"
        element={
          <TitledRoute title={t("auth.forgot_password.title")}>
            <ForgotPasswordPage />
          </TitledRoute>
        }
      />
      <Route
        path="/reinitialiser-mot-de-passe"
        element={
          <TitledRoute title={t("auth.reset_password.title")}>
            <ResetPasswordPage />
          </TitledRoute>
        }
      />

      {/* AppRouter et AdminApp gèrent LEUR PROPRE titre en interne,
          car eux seuls connaissent leur onglet/vue active — voir plus bas */}
      <Route path="/*" element={<AppRouter />} />
      <Route path="/admin/*" element={<AdminApp />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}