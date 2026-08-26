import type { ReactNode } from "react";
import { Dumbbell, History, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="app-shell">
    <a className="skip-link" href="#main-content">
      Saltar al contenido
    </a>
    <div id="main-content" className="app-content">
      {children}
    </div>
    <nav className="bottom-nav" aria-label="Navegación principal">
      <NavLink to="/" end>
        <Home aria-hidden="true" />
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/historial">
        <History aria-hidden="true" />
        <span>Historial</span>
      </NavLink>
      <NavLink to="/ajustes">
        <Settings aria-hidden="true" />
        <span>Ajustes</span>
      </NavLink>
    </nav>
    <div className="desktop-brand" aria-hidden="true">
      <Dumbbell />
      <span>Fuerza</span>
    </div>
  </div>
);
