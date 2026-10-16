const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net";

export async function loginRemote(email, password) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message:
          body.message || "Email or password does not match our records.",
      };
    }

    if (!body.user) {
      return {
        ok: false,
        message: "The API did not return the user account.",
      };
    }

    // The backend now returns a JWT after successful authentication.
    if (!body.token) {
      return {
        ok: false,
        message: "The API did not return an authentication token.",
      };
    }

    return {
      ok: true,
      user: body.user,
      token: body.token,
      expiresAt: body.expiresAt,
      message: body.message || "Login successful.",
    };
  } catch {
    return {
      ok: false,
      offline: true,
      message: "The server could not be reached. Please try again.",
    };
  }
}
