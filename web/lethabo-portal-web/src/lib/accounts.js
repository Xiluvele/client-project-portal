import { API_BASE } from "./api";

function readField(raw, camel, pascal, fallback = "") {
  if (!raw) return fallback;
  const value = raw[camel] ?? raw[pascal];
  return value ?? fallback;
}

export function mapAccount(raw) {
  return {
    id: readField(raw, "id", "Id"),
    name: readField(raw, "name", "Name"),
    email: readField(raw, "email", "Email"),
    role: readField(raw, "role", "Role"),
    clientId: readField(raw, "clientId", "ClientId", null),
    memberId: readField(raw, "memberId", "MemberId", null),
    title: readField(raw, "title", "Title"),
    phone: readField(raw, "phone", "Phone", ""),
    active: readField(raw, "active", "Active", true) !== false,
    activated: readField(raw, "activated", "Activated", true) !== false,
  };
}

export function mapClient(raw) {
  return {
    id: readField(raw, "id", "Id"),
    name: readField(raw, "name", "Name"),
    contact: readField(raw, "contact", "Contact"),
    email: readField(raw, "email", "Email"),
  };
}

export function mapMember(raw) {
  return {
    id: readField(raw, "id", "Id"),
    name: readField(raw, "name", "Name"),
    shortName: readField(raw, "shortName", "ShortName"),
    role: readField(raw, "role", "Role"),
    initials: readField(raw, "initials", "Initials"),
    email: readField(raw, "email", "Email"),
    allocated: Boolean(readField(raw, "allocated", "Allocated", false)),
  };
}

function initialsFrom(name) {
  return String(name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function directoryMembers(accounts, members) {
  const listed = new Map(members.filter((item) => item.id).map((item) => [item.id, item]));
  accounts
    .filter((account) => account.role === "developer" || account.role === "manager")
    .forEach((account) => {
      const id = account.memberId || account.id;
      if (!id || listed.has(id)) return;
      listed.set(id, {
        id,
        name: account.name,
        shortName: account.name,
        role: account.role === "developer" ? "Developer" : "Project Manager",
        initials: initialsFrom(account.name),
        email: account.email,
        allocated: false,
      });
    });
  return [...listed.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function getList(path, token, mapItem) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(body)) {
      return { ok: false, items: [] };
    }
    return { ok: true, items: body.map(mapItem).filter((item) => item.id) };
  } catch {
    return { ok: false, items: [] };
  }
}

export function listAccounts(token) {
  return getList("/api/accounts", token, mapAccount).then((result) => ({
    ok: result.ok,
    users: result.items,
  }));
}

export function listClients(token) {
  return getList("/api/clients", token, mapClient).then((result) => ({
    ok: result.ok,
    clients: result.items,
  }));
}

export function listMembers(token) {
  return getList("/api/team-members", token, mapMember).then((result) => ({
    ok: result.ok,
    members: result.items,
  }));
}

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
export async function setAccountStatus(id, active, token) {
  try {
    const { response, body } = await post(`/api/accounts/${id}/status`, { active }, token);
    if (!response.ok || body.ok === false) {
      return { ok: false, message: body.message || "The account could not be updated." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "The server could not be reached. The account was not updated." };
  }
}

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
