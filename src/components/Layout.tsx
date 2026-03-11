import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>SRS Rereading</h1>
        <nav>
          <NavLink to="/queue">Queue</NavLink>
          <NavLink to="/sources">Sources</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  );
}
