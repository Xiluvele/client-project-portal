import { API_BASE } from "./api";

// ------------------------------------------------------------
// POST helper
// ------------------------------------------------------------
// token is optional because some endpoints, such as account
// activation, must remain available before the user signs in.
async function post(path, payload, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add the JWT only when the endpoint requires authentication.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  return { response, body };
}

// ------------------------------------------------------------
// CREATE ACCOUNT
// ------------------------------------------------------------
// Only an authenticated Administrator should be able to call
// POST /api/accounts.
//
// The backend is the final security check. It returns:
// 401 - no/invalid JWT
// 403 - authenticated but not Administrator
export async function createPendingAccount(payload, token) {
  try {
    if (!token) {
      return {
        ok: false,
        unauthorized: true,
        message:
          "Your login session is missing or has expired. Please sign in again.",
      };
    }

    const { response, body } = await post("/api/accounts", payload, token);

    if (response.status === 401) {
      return {
        ok: false,
        unauthorized: true,
        message: "Your login session has expired. Please sign in again.",
      };
    }

    if (response.status === 403) {
      return {
        ok: false,
        forbidden: true,
        message: "Only an Administrator can create user accounts.",
      };
    }

    if (response.status === 409) {
      return {
        ok: false,
        message: body.message || "Another user already has this email.",
      };
    }

    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        message: body.message || "The account could not be saved.",
      };
    }

    return {
      ok: true,
      emailed: Boolean(body.emailed),
      previewCode: body.previewCode || null,
      message: body.message || "",
      user: body.user,
    };
  } catch {
    return {
      ok: false,
      offline: true,
      message: "The server could not be reached. The account was not created.",
    };
  }
}

// ------------------------------------------------------------
// ACTIVATE ACCOUNT
// ------------------------------------------------------------
// Activation remains public because a newly invited user does
// not have a JWT until they have activated their account and
// signed in.
export async function activateRemote({ email, code, password }) {
  try {
    const { response, body } = await post("/api/accounts/activate", {
      email,
      code,
      password,
    });

    if (response.status === 404) {
      return {
        ok: false,
        notFound: true,
        message: body.message,
      };
    }

    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        message: body.message || "The account could not be activated.",
      };
    }

    return {
      ok: true,
      user: body.user,
    };
  } catch {
    return {
      ok: false,
      offline: true,
      message:
        "The API is not running, so the shared account cannot be checked.",
    };
  }
}
