import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PhoneShell from "./PhoneShell.jsx";

const RUTGERS_EMAIL_REGEX =
  /^[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*rutgers\.edu$/i;

export default function AuthScreen({ onRequestCode }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!RUTGERS_EMAIL_REGEX.test(email.trim())) {
      setError("Use a Rutgers email ending in rutgers.edu.");
      return;
    }

    try {
      setSubmitting(true);
      await onRequestCode({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      navigate("/verify");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PhoneShell>
      <section className="auth-hero">
        <h1 className="hero-title auth-title">
          Enter Your <span className="hero-accent">Rutgers</span> Email To
          Receive A Code
        </h1>
      </section>

      <form className="glass-panel form-stack" onSubmit={handleSubmit}>
        <label className="field-stack">
          <span className="visually-hidden">Full name</span>
          <input
            autoComplete="name"
            className="text-input"
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Full Name"
            value={name}
          />
        </label>

        <label className="field-stack">
          <span className="visually-hidden">Rutgers email</span>
          <input
            autoComplete="email"
            className="text-input"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="netid@scarletmail.rutgers.edu"
            value={email}
          />
        </label>

        {error ? <p className="status-message error">{error}</p> : null}

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Sending..." : "Send Code"}
        </button>
      </form>
    </PhoneShell>
  );
}
