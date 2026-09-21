import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// BrowserRouter doit envelopper toute l'application UNE SEULE FOIS.
// Règle absolue : jamais de BrowserRouter imbriqué dans un composant enfant.
// Tout composant sous BrowserRouter peut utiliser useNavigate, useParams, etc.

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    'Élément #root introuvable dans index.html.'
  );
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);