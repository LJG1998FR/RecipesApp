import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Vite injecte le CSS global via l'import dans App.tsx (import "./styles/global.css")
// Si ce n'est pas le cas, décommentez la ligne suivante :
//import "./styles/global.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    'Élément #root introuvable dans index.html. Vérifiez que <div id="root"></div> est présent.'
  );
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);