import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/Fields";
import { homeFor } from "../lib/roles";
import { useAppState } from "../state/useAppState";

export function ActivatePage() {
  const { activateAccount, logout } = useAppState();
  const navigate = useNavigate();
  const cleared = useRef(false);

  // Clear any existing signed-in session when the activation
  // page is opened.
  useEffect(() => {
    if (cleared.current) return;

    cleared.current = true;
    logout();
  }, [logout]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    // Clear an old error before trying again.
    setError("");

    // Make sure both password fields match.
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    // The API requires a password of at least 8 characters.
    if (password.length < 8) {
      setError("The password must be at least 8 characters.");
      return;
    }

    // Activation codes are 6 digits.
    if (code.length !== 6) {
      setError("Please enter the 6-digit activation code.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Wait for the ASP.NET Core API to activate the account.
      const result = await activateAccount({
        email: email.trim(),
        code,
        password,
      });

      if (!result.ok) {
        setError(
          result.message ||
            "The account could not be activated. Please try again.",
        );
        return;
      }

      // Once activation succeeds, send the user to the
      // dashboard that belongs to their role.
      navigate(homeFor(result.user.role));
    } catch {
      setError("The account could not be activated. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signin">
      <section className="signin__brand">
        <div className="portal-lockup">
          <span className="logo__mark">LM</span>

          <span>
            <strong>Lethabo M Solutions</strong>
            <small>Client Project Portal</small>
          </span>
        </div>

        <div className="signin__copy">
          <h1>Choose your password and open the portal.</h1>

          <p>
            The activation code was emailed when an administrator added your
            account.
          </p>
        </div>
      </section>

      <section className="signin__panel">
        <form className="signin__form" onSubmit={submit}>
          <div className="hazard" aria-hidden="true" />

          <h2>Activate account</h2>

          <p className="signin__lead">
            Enter the code from the email, then choose a password of at least 8
            characters.
          </p>

          {error ? <div className="form-error">{error}</div> : null}

          <TextField
            label="Email address"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextField
            label="Activation code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit code"
          />

          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />

          <Button type="submit" block disabled={isSubmitting}>
            {isSubmitting ? "Activating..." : "Activate and sign in"}
          </Button>

          <p className="signin__alt">
            Already activated? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
