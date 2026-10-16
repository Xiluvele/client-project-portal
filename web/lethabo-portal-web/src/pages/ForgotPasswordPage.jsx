import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { PasswordField, TextField } from "../components/ui/Fields";
import { requestPasswordReset, resetPassword } from "../lib/passwordReset";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSent(true);
      setNotice(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("The password must be at least 8 characters.");
      return;
    }
    if (code.length !== 6) {
      setError("Please enter the 6-digit reset code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword({
        email: email.trim(),
        code,
        password,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate("/login", {
        replace: true,
        state: { notice: result.message },
      });
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
          <h1>Reset your password.</h1>
          <p>
            Accounts are added by an administrator. If you already have one,
            we can email you a code to choose a new password.
          </p>
        </div>
      </section>

      <section className="signin__panel">
        <form className="signin__form" onSubmit={sent ? savePassword : sendCode}>
          <div className="hazard" aria-hidden="true" />
          <h2>Forgot password</h2>
          <p className="signin__lead">
            {sent
              ? "Enter the 6-digit code from the email, then choose a new password."
              : "Enter the email address on your account. The code expires in 15 minutes."}
          </p>

          {notice ? <div className="form-note">{notice}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}

          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={sent}
          />

          {sent ? (
            <>
              <TextField
                label="Reset code"
                name="code"
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
              <PasswordField
                label="New password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordField
                label="Confirm password"
                name="confirm"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </>
          ) : null}

          <Button type="submit" block disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : sent
                ? "Update password"
                : "Email reset code"}
          </Button>

          <p className="signin__alt">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
