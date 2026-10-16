import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EmailOtpStep } from "../components/auth/EmailOtpStep";
import { Button } from "../components/ui/Button";
import { PasswordField, TextField } from "../components/ui/Fields";
import { homeFor } from "../lib/roles";
import { useAppState } from "../state/useAppState";

export function LoginPage() {
  const { login, verifyOtp, resendOtp, cancelOtp } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setOtp({
        email: result.email,
        previewCode: result.previewCode,
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (code) => {
    const result = await verifyOtp(code);

    if (!result.ok) {
      setError(result.message);

      if (result.clear) {
        setOtp(null);
      }

      return;
    }

    navigate(homeFor(result.user.role));
  };

  const resend = async () => {
    const result = await resendOtp();

    if (!result.ok) {
      setError(result.message);
      return result;
    }

    setError("");

    setOtp((current) => ({
      ...current,
      previewCode: result.previewCode,
    }));

    return result;
  };

  const back = () => {
    cancelOtp();
    setOtp(null);
    setError("");
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
          <h1>Every project, file and sign-off in one place.</h1>

          <p>
            Plan work, share designs and track client approvals without digging
            through WhatsApp chats and email threads.
          </p>
        </div>
      </section>

      <section className="signin__panel">
        {otp ? (
          <EmailOtpStep
            className="signin__form"
            stripe
            email={otp.email}
            previewCode={otp.previewCode}
            error={error}
            onSubmit={confirmCode}
            onResend={resend}
            onBack={back}
          />
        ) : (
          <form className="signin__form" onSubmit={submit}>
            <div className="hazard" aria-hidden="true" />

            <h2>Sign in</h2>

            <p className="signin__lead">
              Use your Lethabo M Solutions staff account.
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
            />

            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button type="submit" block disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="signin__alt">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
