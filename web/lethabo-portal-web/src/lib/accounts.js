const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net";

async function post(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function createPendingAccount(payload) {
  try {
    const { response, body } = await post("/api/accounts", payload);
    if (response.status === 409)
      return {
        ok: false,
        message: body.message || "Another user already has this email.",
      };
    if (!response.ok || body.ok === false)
      return {
        ok: false,
        message: body.message || "The account could not be saved.",
      };
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
      message:
        "The API is not running, so this account stays on this browser only.",
    };
  }
}

export async function activateRemote({ email, code, password }) {
  try {
    const { response, body } = await post("/api/accounts/activate", {
      email,
      code,
      password,
    });
    if (response.status === 404)
      return { ok: false, notFound: true, message: body.message };
    if (!response.ok || body.ok === false)
      return {
        ok: false,
        message: body.message || "The account could not be activated.",
      };
    return { ok: true, user: body.user };
  } catch {
    return {
      ok: false,
      offline: true,
      message:
        "The API is not running, so the shared account cannot be checked.",
    };
  }
}
