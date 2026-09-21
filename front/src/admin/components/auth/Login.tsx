// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/auth/Login.tsx
//
// DIFFÉRENCES vs l'original :
//   1. Button importé depuis ui/Button → plus de className "btn-primary" en dur
//   2. `onLogin` retourne une Promise<boolean> au lieu de boolean synchrone,
//      pour préparer la vraie intégration API (fetch async)
//   3. Le hint d'identifiants en bas est conditionnel (uniquement en DEV)
//
// NOTE PÉDAGOGIQUE — async/await sur le submit :
//   handleSubmit est async car `onLogin` simulera bientôt un vrai appel réseau.
//   En attendant, on garde le setTimeout de 500ms pour voir l'état loading.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Button from "../ui/Button";
import { login } from "../../../api";

interface LoginProps {
  /** Retourne true si les identifiants sont valides */
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await login(email, password);

    const ok = await onLogin(email, password);
    if (!ok) {
      setError("Email ou mot de passe incorrect. Vérifiez vos identifiants.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Logo + titre ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <BrandIcon />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Saveurs Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Tableau de bord des recettes</p>
        </div>

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Connexion</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label htmlFor="admin-email-field" className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse email
              </label>
              <input
                id="admin-email-field"
                type="email"
                className="input-field"
                placeholder="admin@saveurs.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="admin-pwd-field" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <input
                id="admin-pwd-field"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-1"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Icône de marque extraite pour alléger le JSX principal ───────────────────
function BrandIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4" />
      <path d="M9 17c0-1.66 1.34-3 3-3s3 1.34 3 3" />
    </svg>
  );
}
