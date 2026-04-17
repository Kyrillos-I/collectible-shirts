import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PackArtwork, ShirtArtwork } from "./Artwork.jsx";
import PhoneShell from "./PhoneShell.jsx";
import { SHIRTS } from "../lib/shirts.js";

export default function HubScreen({ viewer, onLogout }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await onLogout();
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <PhoneShell
      footer={
        <Link aria-label="Leaderboard" className="leaderboard-chip" to="/leaderboard">
          <img
            alt=""
            aria-hidden="true"
            className="leaderboard-chip-image"
            src="/images/leaderboard.png"
          />
          <span>Leaderboard</span>
        </Link>
      }
    >
      <section className="welcome-copy">
        <h1 className="welcome-title">Welcome, {viewer.fullName}</h1>
        <p className="hero-support">
          {viewer.packsAvailable > 0
            ? "Your pack is ready to be opened."
            : "Your pack is opened. Check the leaderboard to see where it landed."}
        </p>
      </section>

      <div className="pack-showcase">
        <div className="art-card">
          <div className="pack-preview-stack">
            {viewer.latestPull ? (
              <ShirtArtwork className="shirt-preview" shirtKey={viewer.latestPull.shirtKey} />
            ) : (
              <PackArtwork className="pack-svg" progress={0} />
            )}
          </div>
        </div>

        {viewer.latestPull ? (
          <p className="pull-summary">
            Your pack contains:{" "}
            <span style={{ color: viewer.latestPull.accent }}>
              {viewer.latestPull.shirtName}
            </span>
          </p>
        ) : null}

        {viewer.packsAvailable > 0 ? (
          <button
            className="primary-button"
            onClick={() => navigate("/open")}
            type="button"
          >
            Open Your Pack
          </button>
        ) : null}
      </div>

      <section className="chance-section">
        <h2 className="section-heading">What You Can Get</h2>
        <div className="chance-list">
          {SHIRTS.map((shirt) => (
            <article className="chance-row" key={shirt.key}>
              <div>
                <h3 className="chance-name" style={{ color: shirt.accent }}>
                  {shirt.name}
                </h3>
                <p className="chance-odds">{shirt.probabilityLabel} chance</p>
              </div>
              <ShirtArtwork className="chance-art" shirtKey={shirt.key} />
            </article>
          ))}
        </div>
      </section>

      <button className="ghost-button" onClick={handleLogout} type="button">
        {loggingOut ? "Logging Out..." : "Log Out"}
      </button>
    </PhoneShell>
  );
}
