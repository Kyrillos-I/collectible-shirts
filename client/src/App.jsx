import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AuthScreen from "./components/AuthScreen.jsx";
import HubScreen from "./components/HubScreen.jsx";
import LeaderboardScreen from "./components/LeaderboardScreen.jsx";
import SwipeOpenScreen from "./components/SwipeOpenScreen.jsx";
import VerificationScreen from "./components/VerificationScreen.jsx";
import { request } from "./lib/api.js";

const PENDING_AUTH_KEY = "collectible-shirts.pending-auth";
const HOME_PATH = "/home";

export default function App() {
  const [viewer, setViewer] = useState(null);
  const [booting, setBooting] = useState(true);
  const [pendingAuth, setPendingAuth] = useState(() => readPendingAuth());

  const refreshSession = useCallback(async () => {
    try {
      const payload = await request("/api/auth/session");
      setViewer(payload.user ?? null);
    } catch {
      setViewer(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const handleRequestCode = useCallback(async ({ name, email }) => {
    const payload = await request("/api/auth/request-code", {
      method: "POST",
      body: { name, email },
    });

    const nextPendingAuth = {
      name,
      email,
      developmentCode: payload?.developmentCode ?? "",
    };

    setPendingAuth(nextPendingAuth);
    writePendingAuth(nextPendingAuth);

    return payload;
  }, []);

  const handleVerifyCode = useCallback(async ({ code }) => {
    if (!pendingAuth?.email) {
      throw new Error("Request a code before verifying.");
    }

    const payload = await request("/api/auth/verify-code", {
      method: "POST",
      body: {
        email: pendingAuth.email,
        code,
      },
    });

    clearPendingAuth();
    setPendingAuth(null);
    setViewer(payload.user);
    return payload;
  }, [pendingAuth]);

  const handleResendCode = useCallback(async () => {
    if (!pendingAuth?.email) {
      throw new Error("Request a code before resending.");
    }

    const payload = await request("/api/auth/request-code", {
      method: "POST",
      body: {
        name: pendingAuth.name,
        email: pendingAuth.email,
      },
    });

    const nextPendingAuth = {
      ...pendingAuth,
      developmentCode: payload?.developmentCode ?? "",
    };

    setPendingAuth(nextPendingAuth);
    writePendingAuth(nextPendingAuth);

    return payload;
  }, [pendingAuth]);

  const handleLogout = useCallback(async () => {
    await request("/api/auth/logout", {
      method: "POST",
    });
    clearPendingAuth();
    setPendingAuth(null);
    setViewer(null);
  }, []);

  const handleOpenPack = useCallback(async () => {
    const payload = await request("/api/packs/open", {
      method: "POST",
    });

    setViewer(payload.user);
    return payload;
  }, []);

  if (booting) {
    return (
      <div className="app-shell">
        <div className="page-shell">
          <div className="loading-panel">Loading the collection...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        element={
          viewer ? (
            <Navigate replace to={HOME_PATH} />
          ) : (
            <AuthScreen onRequestCode={handleRequestCode} />
          )
        }
        path="/"
      />
      <Route
        element={
          viewer ? (
            <Navigate replace to={HOME_PATH} />
          ) : (
            <VerificationScreen
              onResend={handleResendCode}
              onVerify={handleVerifyCode}
              pendingAuth={pendingAuth}
            />
          )
        }
        path="/verify"
      />
      <Route
        element={
          viewer ? (
            <HubScreen onLogout={handleLogout} viewer={viewer} />
          ) : (
            <Navigate replace to="/" />
          )
        }
        path={HOME_PATH}
      />
      <Route
        element={
          viewer ? (
            <SwipeOpenScreen onOpenPack={handleOpenPack} viewer={viewer} />
          ) : (
            <Navigate replace to="/" />
          )
        }
        path="/open"
      />
      <Route
        element={<LeaderboardScreen viewer={viewer} />}
        path="/leaderboard"
      />
      <Route element={<Navigate replace to={HOME_PATH} />} path="/hub" />
      <Route
        element={<Navigate replace to={viewer ? HOME_PATH : "/"} />}
        path="*"
      />
    </Routes>
  );
}

function readPendingAuth() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writePendingAuth(value) {
  try {
    window.sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(value));
  } catch {
    // Keep the in-memory auth flow working even if storage is unavailable.
  }
}

function clearPendingAuth() {
  try {
    window.sessionStorage.removeItem(PENDING_AUTH_KEY);
  } catch {
    // Nothing else to do if storage is unavailable.
  }
}
