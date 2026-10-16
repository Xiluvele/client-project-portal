import { API_BASE } from "./api";

async function post(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function requestPasswordReset(email) {
  try {
    const { response, body } = await post("/api/auth/forgot-password", { email });
    if (response.status === 404) {
      return {
        ok: false,
        message: "Password reset is not available on the server yet.",
      };
    }
    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        message: body.message || "The reset code could not be sent.",
      };
    }
    return {
      ok: true,
      message:
        body.message ||
        "If that email belongs to an active account, a reset code has been sent.",
    };
  } catch {
    return {
      ok: false,
      message: "The server could not be reached. Please try again.",
    };
  }
}

export async function resetPassword({ email, code, password }) {
  try {
    const { response, body } = await post("/api/auth/reset-password", {
      email,
      code,
      password,
    });
    if (response.status === 404) {
      return {
        ok: false,
        message: "Password reset is not available on the server yet.",
      };
    }
    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        message: body.message || "The password could not be updated.",
      };
    }
    return {
      ok: true,
      message: body.message || "Your password has been updated.",
    };
  } catch {
    return {
      ok: false,
      message: "The server could not be reached. Please try again.",
    };
  }
}
