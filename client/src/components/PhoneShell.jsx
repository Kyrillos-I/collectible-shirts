import { Link } from "react-router-dom";

export default function PhoneShell({
  children,
  backTo,
  backLabel = "Back",
  footer,
}) {
  return (
    <div className="app-shell">
      <div className="page-shell">
        <header className="brand-header">
          <div className="brand-copy">
            <p className="brand-title">MysteryApparel</p>
            <p className="brand-subtitle">Intro To Entrep. Spring 2026</p>
          </div>
        </header>
        <div className="brand-rule" />
        {backTo ? (
          <div className="screen-nav">
            <Link className="back-pill" to={backTo}>
              {backLabel}
            </Link>
          </div>
        ) : null}
        <main className="screen-body">{children}</main>
        {footer ? <footer className="screen-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
