import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import PhoneShell from "./PhoneShell.jsx";

export default function VerificationScreen({
  pendingAuth,
  onVerify,
  onResend,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const lastSubmissionRef = useRef("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (code.length === 6 && lastSubmissionRef.current !== code && !verifying) {
      lastSubmissionRef.current = code;
      void handleVerify(code);
    }

    if (code.length < 6) {
      lastSubmissionRef.current = "";
    }
  }, [code, verifying]);

  if (!pendingAuth?.email) {
    return <Navigate replace to="/" />;
  }

  async function handleVerify(nextCode) {
    try {
      setVerifying(true);
      setError("");
      await onVerify({ code: nextCode });
      navigate("/home", { replace: true });
    } catch (verificationError) {
      setError(verificationError.message);
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    try {
      setResending(true);
      setError("");
      await onResend();
      inputRef.current?.focus();
    } catch (resendError) {
      setError(resendError.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <PhoneShell
      backTo="/"
      backLabel="Edit"
      footer={
        <Link className="leaderboard-chip leaderboard-chip--inline" to="/leaderboard">
          <img
            alt=""
            aria-hidden="true"
            className="leaderboard-chip-image"
            src="/images/leaderboard.png"
          />
          <span>View Leaderboard</span>
        </Link>
      }
    >
      <section className="auth-hero">
        <h1 className="hero-title">Enter The 6 Digit Code Sent To Your Email</h1>
        <p className="hero-support">{pendingAuth.email}</p>
      </section>

      <div className="otp-zone" onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          autoComplete="one-time-code"
          className="otp-catcher"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          value={code}
        />
        <div className="otp-slots" role="presentation">
          {Array.from({ length: 6 }).map((_, index) => {
            const digit = code[index] ?? "";
            return (
              <div
                key={index}
                className={`otp-slot ${digit ? "filled" : ""} ${
                  verifying ? "pending" : ""
                }`}
              >
                {digit}
              </div>
            );
          })}
        </div>
      </div>

      <p className="helper-text">
        {verifying
          ? "Checking your code..."
          : "The code verifies automatically as soon as all six digits are entered."}
      </p>

      {error ? <p className="status-message error">{error}</p> : null}
      {pendingAuth.developmentCode ? (
        <p className="status-message info">
          Dev code: <strong>{pendingAuth.developmentCode}</strong>
        </p>
      ) : null}

      <button
        className="secondary-button"
        disabled={resending || verifying}
        onClick={handleResend}
        type="button"
      >
        {resending ? "Resending..." : "Resend Code"}
      </button>
    </PhoneShell>
  );
}
