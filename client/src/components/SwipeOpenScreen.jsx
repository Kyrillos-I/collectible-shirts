import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { PackArtwork, ShirtArtwork } from "./Artwork.jsx";
import GoldConfetti, { GOLD_SHIRT_KEY } from "./GoldConfetti.jsx";
import PhoneShell from "./PhoneShell.jsx";

const REVEAL_THRESHOLD = 0.84;

export default function SwipeOpenScreen({ viewer, onOpenPack }) {
  const trackRef = useRef(null);
  const knobRef = useRef(null);
  const dragRef = useRef({ pointerId: null, startX: 0, startProgress: 0 });
  const progressRef = useRef(0);
  const frameRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [maxTravel, setMaxTravel] = useState(0);
  const [knobWidth, setKnobWidth] = useState(64);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [flashColor, setFlashColor] = useState("#ffffff");
  const [revealedPull, setRevealedPull] = useState(null);
  const [error, setError] = useState("");
  const showGoldConfetti = revealedPull?.shirtKey === GOLD_SHIRT_KEY;

  useEffect(() => {
    if (!trackRef.current || !knobRef.current) {
      return undefined;
    }

    const updateMetrics = () => {
      const nextKnobWidth = knobRef.current.clientWidth;
      const travel =
        trackRef.current.clientWidth - nextKnobWidth - 18;
      setKnobWidth(nextKnobWidth);
      setMaxTravel(Math.max(travel, 0));
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);

    return () => {
      window.removeEventListener("resize", updateMetrics);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!revealedPull) {
      return;
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [revealedPull]);

  if (viewer.packsAvailable < 1 && !revealedPull && !isOpening) {
    return <Navigate replace to="/home" />;
  }

  function commitProgress(nextProgress) {
    progressRef.current = nextProgress;

    if (frameRef.current) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setProgress(progressRef.current);
    });
  }

  function beginDrag(event) {
    if (isOpening || revealedPull || !event.isPrimary) {
      return;
    }

    event.preventDefault();
    setHasInteracted(true);
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startProgress: progressRef.current,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!isDragging || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragRef.current.startX;
    const nextProgress = clamp(
      dragRef.current.startProgress + deltaX / Math.max(maxTravel, 1),
      0,
      1,
    );

    commitProgress(nextProgress);
  }

  function endDrag(event) {
    if (!isDragging || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setIsDragging(false);
    dragRef.current.pointerId = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (progressRef.current >= REVEAL_THRESHOLD) {
      void completeReveal();
      return;
    }

    commitProgress(0);
  }

  async function completeReveal() {
    try {
      setIsOpening(true);
      setError("");
      commitProgress(1);
      setFlashColor("#ffffff");
      setFlashActive(true);

      const payload = await onOpenPack();
      setFlashColor(payload.pull.accent);
      setRevealedPull(payload.pull);
      await wait(760);
    } catch (openError) {
      setError(openError.message);
      commitProgress(0);
    } finally {
      setIsOpening(false);
      setFlashActive(false);
    }
  }

  function renderLeaderboardChip(className = "leaderboard-chip") {
    return (
      <Link aria-label="Leaderboard" className={className} to="/leaderboard">
        <img
          alt=""
          aria-hidden="true"
          className="leaderboard-chip-image"
          src="/images/leaderboard.png"
        />
        <span>Leaderboard</span>
      </Link>
    );
  }

  const progressWidth = Math.max(
    knobWidth * 0.38,
    progress * maxTravel + knobWidth * 0.38,
  );

  return (
    <PhoneShell
      backTo="/home"
      footer={revealedPull ? null : renderLeaderboardChip()}
    >
      {showGoldConfetti ? <GoldConfetti /> : null}

      <div
        className={`flash-overlay ${flashActive ? "active" : ""}`}
        style={{
          background: flashColor,
        }}
      />

      <section className="swipe-stage">
        <div className="art-card swipe-art-card">
          {revealedPull ? (
            <ShirtArtwork
              className="reveal-shirt"
              shirtKey={revealedPull.shirtKey}
            />
          ) : (
            <PackArtwork className="pack-svg" progress={progress} />
          )}
        </div>

        <h1
          className={`swipe-title ${revealedPull ? "swipe-title--revealed" : ""} ${
            revealedPull?.shirtKey === GOLD_SHIRT_KEY
              ? "swipe-title--gold"
              : ""
          }`}
        >
          {revealedPull
            ? revealedPull.shirtKey === GOLD_SHIRT_KEY
              ? "You Got Gold! Enjoy Your Giftcard"
              : "Your Pack Is Open!"
            : "Slide To Open Your Pack!"}
        </h1>

        {revealedPull ? (
          <div className="reveal-card">
            <p className="reveal-tier" style={{ color: revealedPull.accent }}>
              {revealedPull.tierLabel}
            </p>
            <h2 className="reveal-name">{revealedPull.shirtName}</h2>
            <p className="hero-support">
              Odds: {revealedPull.probabilityLabel}. The leaderboard updates
              live as each person opens their pack.
            </p>
            <div className="button-cluster">
              {renderLeaderboardChip(
                "leaderboard-chip leaderboard-chip--inline button-link",
              )}
              <Link className="ghost-button button-link" to="/home">
                Back To Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`swipe-track ${isDragging ? "dragging" : ""} ${
                isOpening ? "opening" : ""
              }`}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              ref={trackRef}
              role="presentation"
            >
              <div
                className="swipe-progress"
                style={{ width: `${progressWidth}px` }}
              />
              <div className="swipe-instruction">Slide To Reveal</div>
              <div
                className={`slider-knob ${!hasInteracted ? "knob-bounce" : ""}`}
                ref={knobRef}
                style={{ transform: `translateX(${progress * maxTravel}px)` }}
              >
                <span className="slider-arrow">›</span>
              </div>
            </div>

            <p className="helper-text">
              The knob snaps back if you let go early. Drag nearly all the way
              to open your pack.
            </p>
          </>
        )}

        {error ? <p className="status-message error">{error}</p> : null}
      </section>
    </PhoneShell>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}
