import { useEffect, useState } from "react";

import GoldConfetti, { GOLD_SHIRT_KEY } from "./GoldConfetti.jsx";
import PhoneShell from "./PhoneShell.jsx";
import { buildApiUrl, request } from "../lib/api.js";

export default function LeaderboardScreen({ viewer }) {
  const [leaderboard, setLeaderboard] = useState({
    entries: [],
    topEntry: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    const source = new EventSource(buildApiUrl("/api/leaderboard/stream"), {
      withCredentials: true,
    });

    async function loadInitial() {
      try {
        const payload = await request("/api/leaderboard");

        if (active) {
          setLeaderboard(payload);
          setLoading(false);
          setLastUpdatedAt(Date.now());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    }

    loadInitial();

    source.onopen = () => {
      if (active) {
        setConnectionStatus("live");
      }
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (active) {
          setLeaderboard(payload);
          setLoading(false);
          setError("");
          setConnectionStatus("live");
          setLastUpdatedAt(Date.now());
        }
      } catch {
        // Ignore malformed keepalive events.
      }
    };

    source.onerror = () => {
      if (active) {
        setConnectionStatus("reconnecting");
      }
    };

    return () => {
      active = false;
      source.close();
    };
  }, []);

  const backTo = viewer ? "/home" : "/";
  const topEntry = leaderboard.topEntry;
  const restEntries = leaderboard.entries.slice(1);
  const topIsGold = topEntry?.shirt?.shirtKey === GOLD_SHIRT_KEY;
  const showGoldConfetti = topIsGold;
  const connectionLabel =
    connectionStatus === "live"
      ? "Live"
      : connectionStatus === "reconnecting"
        ? "Reconnecting..."
        : "Connecting...";
  const lastUpdatedLabel = lastUpdatedAt
    ? `Last update ${formatTime(lastUpdatedAt)}`
    : "Waiting for first update";
  const viewerName = getLeaderboardName(viewer);

  return (
    <PhoneShell backTo={backTo} backLabel="Home">
      {showGoldConfetti ? <GoldConfetti /> : null}

      <section className="leaderboard-hero">
        <div className="leaderboard-statusbar">
          <div
            className={`leaderboard-live-pill leaderboard-live-pill--${connectionStatus}`}
          >
            <span className="leaderboard-live-dot" />
            <span>{connectionLabel}</span>
          </div>
          <p className="leaderboard-last-updated">{lastUpdatedLabel}</p>
        </div>
      </section>

      {loading ? (
        <p className="status-message info">Loading the standings...</p>
      ) : null}
      {error ? <p className="status-message error">{error}</p> : null}

      {topEntry ? (
        <article
          className={`podium-card ${topIsGold ? "podium-card--gold" : ""}`}
        >
          {topIsGold ? (
            <div className="podium-winner-badge">Gift Card Winner</div>
          ) : null}
          <div className="podium-rank">01</div>
          <p className="podium-tier" style={{ color: topEntry.shirt.accent }}>
            {topEntry.shirt.tierLabel}
          </p>
          <h1 className="podium-name">{getLeaderboardName(topEntry)}</h1>
          <p className="podium-pull">Opened: {topEntry.shirt.shirtName}</p>
          <div className="podium-probability">
            <span>Probability</span>
            <strong>{topEntry.shirt.probabilityLabel}</strong>
          </div>
        </article>
      ) : (
        <div className="empty-state">
          The board is empty right now. Open the first pack to set the pace.
        </div>
      )}

      <section className="entry-list">
        {restEntries.map((entry) => {
          const entryName = getLeaderboardName(entry);
          const isViewer = Boolean(viewerName) && viewerName === entryName;
          const isGoldEntry = entry.shirt.shirtKey === GOLD_SHIRT_KEY;

          return (
            <article
              className={`entry-card ${isViewer ? "entry-card--viewer" : ""} ${
                isGoldEntry ? "entry-card--gold" : ""
              }`}
              key={entry.id}
            >
              <div className="entry-rank">
                {String(entry.rank).padStart(2, "0")}
              </div>
              <div className="entry-copy">
                <h2 className="entry-handle">{entryName}</h2>
                <p className="entry-tier" style={{ color: entry.shirt.accent }}>
                  {entry.shirt.tierLabel} ({entry.shirt.probabilityLabel})
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </PhoneShell>
  );
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLeaderboardName(entry) {
  if (entry?.fullName?.trim()) {
    return entry.fullName.trim();
  }

  return (entry?.displayHandle ?? "Collector")
    .replace(/_+/g, " ")
    .trim();
}
