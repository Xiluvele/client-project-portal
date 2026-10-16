import { useCallback, useEffect, useMemo, useState } from "react";
import { AppStateContext } from "./useAppState";
import { cloneSeed } from "../data/seed";
import { createId, formatRand } from "../lib/format";
import { PORTAL_URL } from "../lib/api";
import { activateRemote, createPendingAccount, directoryMembers, listAccounts, listClients, listMembers, setAccountStatus } from "../lib/accounts";
import { loginRemote } from "../lib/auth";
import { emailPaymentReminder, emailSignInCode } from "../lib/mailCode";
import { assessOtp, createOtpChallenge } from "../lib/otp";
import { roleLabel } from "../lib/roles";
import {
  addDaysISO,
  dateLabel,
  effectiveStatus,
  invoiceTotal,
  todayISO,
} from "../lib/invoiceDates";

const SESSION_KEY = "lethabo-connect-session";
const USERS_KEY = "lethabo-connect-users-v2";
const CLIENTS_KEY = "lethabo-connect-clients-v2";
const DROP_FLAG = "lethabo-connect-drop-readd-v4";
const DROPPED_EMAILS = new Set([
  "xiluvelotalin@gmail.com",
  "thabedenokubonga5@gmail.com",
  "galarisima986@gmail.com",
  "nompumelelononhlanhla18@gmail.com",
  "mncwangonf@gmail.com",
]);

let dropStoredAccounts = null;

function shouldDropStoredAccounts() {
  if (dropStoredAccounts !== null) return dropStoredAccounts;
  try {
    dropStoredAccounts = localStorage.getItem(DROP_FLAG) !== "1";
    if (dropStoredAccounts) localStorage.setItem(DROP_FLAG, "1");
  } catch {
    dropStoredAccounts = false;
  }
  return dropStoredAccounts;
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (DROPPED_EMAILS.has(String(saved?.email ?? "").toLowerCase())) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId ?? null,
    memberId: user.memberId ?? null,
    title: user.title ?? "",
  };
}

function forgetStoredPeople() {
  try {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(CLIENTS_KEY);
  } catch {
    /* Older browser copies can stay if storage is unavailable. */
  }
}

export function AppStateProvider({ children }) {
  const seed = useMemo(() => cloneSeed(), []);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState(seed.projects);
  const [invoices, setInvoices] = useState(seed.invoices);
  const [activities, setActivities] = useState(seed.activities);
  const [changeRequests, setChangeRequests] = useState(seed.changeRequests);
  const [requirements, setRequirements] = useState(seed.requirements);
  const [notifications, setNotifications] = useState(seed.notifications);
  const [session, setSession] = useState(() => {
    const saved = readSession();
    if (
      shouldDropStoredAccounts() &&
      DROPPED_EMAILS.has(String(saved?.email ?? "").toLowerCase())
    ) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* The stored sign-in can stay if storage is unavailable. */
      }
      return null;
    }
    return saved;
  });
  const [otpChallenge, setOtpChallenge] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    forgetStoredPeople();
    if (!shouldDropStoredAccounts()) return;
    setSession((current) => {
      if (!DROPPED_EMAILS.has(String(current?.email ?? "").toLowerCase())) return current;
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* The stored sign-in can stay if storage is unavailable. */
      }
      return null;
    });
  }, []);

  const refreshPeople = useCallback(async (token) => {
    if (!token) return;
    const [accountResult, clientResult, memberResult] = await Promise.all([
      listAccounts(token),
      listClients(token),
      listMembers(token),
    ]);
    if (accountResult.ok) setUsers(accountResult.users);
    if (clientResult.ok) setClients(clientResult.clients);
    if (memberResult.ok || accountResult.ok) {
      setMembers(directoryMembers(accountResult.users, memberResult.members));
    }
  }, []);

  useEffect(() => {
    refreshPeople(session?.token);
  }, [refreshPeople, session?.token]);

  const record = users.find((item) => item.id === session?.id) ?? session;
  const user = record && record.active !== false ? record : null;

  const persist = (nextUser, token = null) => {
    const safeUser = publicUser(nextUser);
    const safe = safeUser
      ? { ...safeUser, token: token ?? session?.token ?? null }
      : null;
    setSession(safe);
    if (safe) localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    else localStorage.removeItem(SESSION_KEY);
  };

  // Records who did what. The actor defaults to the signed-in user.
  const addAudit = (event) =>
    setAuditLog((current) => [
      {
        id: createId("audit"),
        at: new Date().toISOString(),
        actor: user?.name ?? "Unknown",
        ...event,
      },
      ...current,
    ]);

  const activeSignInCode = (account) => {
    if (!account?.signInCode || Date.now() > account.signInCodeExpires)
      return null;
    return {
      purpose: "login",
      userId: account.id,
      email: account.email,
      code: account.signInCode,
      expiresAt: account.signInCodeExpires,
      attempts: 0,
    };
  };

  const rememberSignInCode = (userId, challenge) => {
    setUsers((current) =>
      current.map((item) =>
        item.id === userId
          ? {
              ...item,
              signInCode: challenge.code,
              signInCodeExpires: challenge.expiresAt,
            }
          : item,
      ),
    );
  };

  const login = async (email, password) => {
    const normalised = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!normalised || !password) {
      return { ok: false, message: "Enter your email address and password." };
    }

    const remote = await loginRemote(normalised, password);

    if (!remote.ok) {
      addAudit({
        actor: "Unknown",
        type: "signin_failed",
        category: "signins",
        target: normalised,
      });
      return {
        ok: false,
        message:
          remote.message || "Email or password does not match our records.",
      };
    }

    const apiUser = remote.user;
    setPendingToken(remote.token);
    const ready = {
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role,
      clientId: apiUser.clientId ?? null,
      memberId: apiUser.memberId ?? null,
      title: apiUser.title || roleLabel(apiUser.role),
      active: true,
      activated: true,
      failedAttempts: 0,
      locked: false,
    };

    setUsers((current) => {
      const index = current.findIndex(
        (item) =>
          item.id === ready.id ||
          item.email.toLowerCase() === ready.email.toLowerCase(),
      );
      if (index === -1) return [...current, ready];
      return current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...ready } : item,
      );
    });

    const challenge = createOtpChallenge({
      purpose: "login",
      userId: ready.id,
      email: ready.email,
    });
    setOtpChallenge(challenge);

    // Store the sign-in code on the same user record so the existing OTP flow can verify it.
    setUsers((current) =>
      current.map((item) =>
        item.id === ready.id
          ? {
              ...item,
              signInCode: challenge.code,
              signInCodeExpires: challenge.expiresAt,
            }
          : item,
      ),
    );

    const delivery = await emailSignInCode({
      email: ready.email,
      name: ready.name,
      code: challenge.code,
      purpose: "login",
    });

    return {
      ok: true,
      step: "otp",
      email: ready.email,
      previewCode: delivery.sent ? null : challenge.code,
      emailed: delivery.sent,
      message: delivery.message,
    };
  };

  const logout = () => {
    if (user)
      addAudit({ type: "signout", category: "signins", target: user.email });
    setPendingToken(null);
    persist(null);
  };

  const resendOtp = async () => {
    if (!otpChallenge)
      return { ok: false, message: "Start again to request a code." };
    const challenge = createOtpChallenge({
      purpose: otpChallenge.purpose,
      userId: otpChallenge.userId,
      email: otpChallenge.email,
      draft: otpChallenge.draft,
    });
    setOtpChallenge(challenge);
    if (challenge.userId) rememberSignInCode(challenge.userId, challenge);
    const delivery = await emailSignInCode({
      email: challenge.email,
      name:
        users.find((item) => item.id === challenge.userId)?.name ??
        challenge.draft?.name ??
        "",
      code: challenge.code,
      purpose: challenge.purpose,
    });
    return {
      ok: true,
      previewCode: delivery.sent ? null : challenge.code,
      emailed: delivery.sent,
      message: delivery.message,
    };
  };

  const cancelOtp = () => {
    setOtpChallenge(null);
    setPendingToken(null);
  };

  const verifyOtp = (code) => {
    const result = assessOtp(otpChallenge, code);
    if (!result.ok) {
      if (result.clear) {
        setOtpChallenge(null);
        setPendingToken(null);
      } else if (result.attempts)
        setOtpChallenge({ ...otpChallenge, attempts: result.attempts });
      return {
        ok: false,
        message: result.message,
        clear: Boolean(result.clear),
      };
    }

    if (otpChallenge.purpose === "login") {
      const match = users.find((item) => item.id === otpChallenge.userId);
      setOtpChallenge(null);
      if (!match || match.active === false) {
        return {
          ok: false,
          message:
            "This account can no longer sign in. Contact an administrator.",
        };
      }
      addAudit({
        actor: match.name,
        type: "signin",
        category: "signins",
        target: match.email,
      });
      persist(match, pendingToken);
      setPendingToken(null);
      return { ok: true, user: publicUser(match) };
    }

    const draft = otpChallenge.draft;
    if (users.some((item) => item.email.toLowerCase() === draft.email)) {
      setOtpChallenge(null);
      return {
        ok: false,
        message: "An account with that email already exists.",
      };
    }

    let clientId = null;
    if (draft.role === "client") {
      clientId = createId("client");
      setClients((current) => [
        ...current,
        {
          id: clientId,
          name: draft.company,
          contact: draft.name,
          email: draft.email,
        },
      ]);
    }

    const next = {
      id: createId("user"),
      name: draft.name,
      email: draft.email,
      password: draft.password,
      role: draft.role,
      clientId,
      memberId: null,
      title: draft.role === "client" ? draft.company : draft.title,
      active: true,
    };
    setUsers((current) => [...current, next]);
    setOtpChallenge(null);
    persist(next);
    return { ok: true, user: publicUser(next) };
  };

  const addActivity = useCallback((projectId, text) => {
    setActivities((current) => [
      {
        id: createId("activity"),
        projectId,
        text,
        createdAt: new Date().toISOString(),
        audience: "project",
      },
      ...current,
    ]);
  }, []);

  const notify = (userIds, text, projectId) => {
    const rows = [...new Set(userIds.filter(Boolean))].map((userId) => ({
      id: createId("note"),
      userId,
      projectId,
      text,
      read: false,
      createdAt: new Date().toISOString(),
    }));
    if (rows.length) setNotifications((current) => [...rows, ...current]);
  };

  const clientUserIds = (clientId) =>
    users
      .filter(
        (item) =>
          item.role === "client" &&
          item.clientId === clientId &&
          item.active !== false,
      )
      .map((item) => item.id);
  const managerIds = () =>
    users
      .filter((item) => item.role === "manager" && item.active !== false)
      .map((item) => item.id);

  const createProject = ({
    clientId,
    name,
    service,
    dueAt,
    memberIds,
    description,
    brief,
  }) => {
    const errors = {};
    if (!clientId)
      errors.clientId =
        "Select a client. The project cannot be saved without one.";
    if (!name?.trim()) errors.name = "Enter a project title.";
    if (!description?.trim()) errors.description = "Enter a description.";
    if (!dueAt) errors.dueAt = "Choose a due date.";
    if (!service)
      errors.service = "Select a service offered by Lethabo M Solutions.";
    if (!memberIds?.length) errors.memberIds = "Select an available developer.";
    if (Object.keys(errors).length) return { ok: false, errors };

    const project = {
      id: createId("project"),
      clientId,
      name: name.trim(),
      service: (service || name).trim(),
      status: "in_progress",
      stage: "discovery",
      startedLabel: new Date().toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
      }),
      dueAt,
      dueLabel: dateLabel(dueAt),
      dueThisWeek: dueAt >= todayISO() && dueAt <= addDaysISO(todayISO(), 7),
      progress: 8,
      memberIds,
      description: description.trim(),
      milestones: [],
      tasks: [],
      files: brief?.name
        ? [
            {
              id: createId("file"),
              name: brief.name,
              kind: brief.kind || "File",
              description: "Project brief",
              previewUrl: brief.previewUrl || "",
              version: 1,
              uploadedBy: user?.name?.split(" ")[0] ?? "Team",
              createdAt: new Date().toISOString(),
              approval: "pending",
            },
          ]
        : [],
      comments: [],
    };
    setProjects((current) => [project, ...current]);
    const client = clients.find((item) => item.id === clientId);
    addActivity(
      project.id,
      `${client?.name ?? "A client"} was added to ${project.name}`,
    );
    notify(
      clientUserIds(clientId),
      `${project.name} is now visible on your account.`,
      project.id,
    );
    addAudit({
      type: "project_created",
      category: "projects",
      target: project.name,
    });
    return { ok: true, project };
  };

  const deleteProject = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project)
      return { ok: false, message: "That project could not be found." };
    setProjects((current) => current.filter((item) => item.id !== projectId));
    setInvoices((current) =>
      current.filter((item) => item.projectId !== projectId),
    );
    setChangeRequests((current) =>
      current.filter((item) => item.projectId !== projectId),
    );
    setRequirements((current) =>
      current.filter((item) => item.projectId !== projectId),
    );
    setActivities((current) =>
      current.filter((item) => item.projectId !== projectId),
    );
    setNotifications((current) =>
      current.filter((item) => item.projectId !== projectId),
    );
    return { ok: true };
  };

  const updateProject = (projectId, patch) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
    );
  };

  const moveTask = (projectId, taskId, status) => {
    const project = projects.find((item) => item.id === projectId);
    const task = project?.tasks.find((item) => item.id === taskId);
    setProjects((current) =>
      current.map((item) => {
        if (item.id !== projectId) return item;
        return {
          ...item,
          tasks: item.tasks.map((entry) =>
            entry.id === taskId ? { ...entry, status } : entry,
          ),
        };
      }),
    );
    if (task && project) {
      addActivity(
        projectId,
        `${task.title} is now ${status === "backlog" ? "To Do" : status.replace("_", " ")}`,
      );
      notify(
        clientUserIds(project.clientId),
        `${project.name} progress was updated.`,
        projectId,
      );
    }
  };

  const addTask = (projectId, { title, description, dueLabel, assigneeId }) => {
    const project = projects.find((item) => item.id === projectId);
    const task = {
      id: createId("task"),
      title: title.trim(),
      description: description.trim(),
      dueLabel: dueLabel.trim() || "No date",
      type: "dev",
      status: "backlog",
      assigneeId: assigneeId || null,
    };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? { ...item, tasks: [task, ...item.tasks] }
          : item,
      ),
    );
    if (!assigneeId) {
      addActivity(projectId, `Unassigned task added: ${task.title}`);
      return task;
    }
    const developer = users.find(
      (item) =>
        item.role === "developer" && (item.memberId || item.id) === assigneeId,
    );
    addActivity(
      projectId,
      `${task.title} assigned to ${developer?.name ?? "a developer"}`,
    );
    notify(
      developer ? [developer.id] : [],
      `You were assigned “${task.title}” on ${project?.name ?? "a project"}.`,
      projectId,
    );
    return task;
  };

  const assignTask = (projectId, taskId, assigneeId) => {
    const project = projects.find((item) => item.id === projectId);
    const task = project?.tasks.find((item) => item.id === taskId);
    const developer = users.find(
      (item) =>
        item.role === "developer" &&
        item.active !== false &&
        (item.memberId || item.id) === assigneeId,
    );
    if (!task || !developer) return { ok: false, message: "Choose a developer." };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              tasks: item.tasks.map((entry) =>
                entry.id === taskId
                  ? { ...entry, assigneeId: developer.memberId || developer.id }
                  : entry,
              ),
            }
          : item,
      ),
    );
    addActivity(projectId, `${task.title} assigned to ${developer.name}`);
    notify(
      [developer.id],
      `You were assigned “${task.title}” on ${project?.name ?? "a project"}.`,
      projectId,
    );
    return { ok: true };
  };

  const nudgeClient = (projectId, taskId) => {
    const project = projects.find((item) => item.id === projectId);
    const task = project?.tasks.find((item) => item.id === taskId);
    const recipients = clientUserIds(project?.clientId);
    if (!task || !recipients.length) {
      return { ok: false, message: "This client has no portal login to notify." };
    }
    notify(
      recipients,
      `Please review “${task.title}” on ${project.name}.`,
      projectId,
    );
    addActivity(projectId, `Client nudged about ${task.title}`);
    return { ok: true };
  };

  const addComment = (projectId, body, replyToId = null) => {
    const text = body?.trim();
    if (!user || !text) return { ok: false };
    const project = projects.find((item) => item.id === projectId);
    const parent = (project?.comments ?? []).find((item) => item.id === replyToId);
    const rootId = parent ? (parent.replyToId || parent.id) : null;
    const comment = {
      id: createId("comment"),
      authorName:
        user.role === "client"
          ? (clients.find((item) => item.id === user.clientId)?.name ??
            user.name)
          : user.name,
      initials: user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      role: user.role,
      body: text,
      replyToId: rootId,
      createdAt: new Date().toISOString(),
      read: user.role !== "client",
    };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? { ...item, comments: [...(item.comments ?? []), comment] }
          : item,
      ),
    );
    addActivity(
      projectId,
      parent
        ? `${comment.authorName} replied to ${parent.authorName}`
        : `${comment.authorName} left a comment`,
    );
    if (user.role === "client") {
      notify(
        managerIds(),
        parent
          ? `${comment.authorName} replied to ${parent.authorName}.`
          : `${comment.authorName} left feedback.`,
        projectId,
      );
    }
    return { ok: true };
  };

  const markProjectCommentsRead = useCallback((projectId) => {
    setProjects((current) => {
      const project = current.find((item) => item.id === projectId);
      if (
        !project?.comments.some(
          (comment) => comment.role === "client" && !comment.read,
        )
      )
        return current;
      return current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              comments: item.comments.map((comment) =>
                comment.role === "client"
                  ? { ...comment, read: true }
                  : comment,
              ),
            }
          : item,
      );
    });
  }, []);

  const addFile = (projectId, { name, kind, description, previewUrl }) => {
    const project = projects.find((item) => item.id === projectId);
    const cleanName = name.trim();
    const existing =
      project?.files.filter(
        (file) => file.name.toLowerCase() === cleanName.toLowerCase(),
      ) ?? [];
    const version =
      existing.reduce((max, file) => Math.max(max, file.version || 1), 0) +
        (existing.length ? 1 : 0) || 1;
    const file = {
      id: createId("file"),
      name: cleanName,
      kind,
      description: (description || "").trim(),
      previewUrl: previewUrl || "",
      version: existing.length ? version : 1,
      uploadedBy: user?.name?.split(" ")[0] ?? "Team",
      createdAt: new Date().toISOString(),
      approval: "pending",
    };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? { ...item, files: [file, ...item.files] }
          : item,
      ),
    );
    addActivity(
      projectId,
      `${file.uploadedBy} uploaded ${file.name} v${file.version}`,
    );
    if (project)
      notify(
        clientUserIds(project.clientId),
        `A new file was shared on ${project.name}.`,
        projectId,
      );
  };

  const decideFile = (projectId, fileId, approval) => {
    let fileName = "a file";
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          files: project.files.map((file) => {
            if (file.id !== fileId) return file;
            fileName = file.name;
            return { ...file, approval };
          }),
        };
      }),
    );
    const client = clients.find((item) => item.id === user?.clientId);
    const verb = approval === "approved" ? "approved" : "declined";
    addActivity(
      projectId,
      `${client?.name ?? user?.name ?? "Client"} ${verb} ${fileName}`,
    );
    notify(
      managerIds(),
      `${client?.name ?? "A client"} ${verb} ${fileName}.`,
      projectId,
    );
  };

  const approveFile = (projectId, fileId) => decideFile(projectId, fileId, "approved");

  const decideInvoice = (invoiceId, status) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) return { ok: false, message: "That invoice could not be found." };
    const current = effectiveStatus(invoice);
    if (!["sent", "overdue", "pending"].includes(current)) {
      return { ok: false, message: "This invoice has already been decided." };
    }
    setInvoices((list) =>
      list.map((item) => (item.id === invoiceId ? { ...item, status } : item)),
    );
    const verb = status === "approved" ? "approved" : "declined";
    addActivity(invoice.projectId, `${user?.name ?? "Client"} ${verb} ${invoice.number}`);
    notify(managerIds(), `${user?.name ?? "A client"} ${verb} ${invoice.number}.`, invoice.projectId);
    return { ok: true };
  };

  const generateInvoice = ({
    clientId,
    projectId,
    issuedAt,
    dueAt,
    items,
    send = true,
  }) => {
    const highest = invoices.reduce(
      (max, item) =>
        Math.max(
          max,
          parseInt(String(item.number).replace(/\D/g, ""), 10) || 0,
        ),
      230,
    );
    const number = `INV${highest + 1}`;
    const issued = issuedAt || todayISO();
    const due = dueAt || addDaysISO(issued, 14);
    const invoice = {
      id: createId("invoice"),
      number,
      clientId,
      projectId,
      title: items[0]?.description || "Invoice",
      status: send ? "sent" : "draft",
      issuedAt: issued,
      dueAt: due,
      issuedLabel: dateLabel(issued),
      dueLabel: dateLabel(due),
      sentBy: user?.id ?? null,
      items: items.map((item) => ({
        ...item,
        id: createId("line"),
        qty: Number(item.qty) || 1,
        amount: Number(item.amount),
      })),
    };
    setInvoices((current) => [invoice, ...current]);
    if (send) {
      const client = clients.find((item) => item.id === clientId);
      addActivity(
        projectId,
        `Invoice ${number} was sent to ${client?.name ?? "the client"}`,
      );
      notify(
        clientUserIds(clientId),
        `Invoice ${number} is ready to view.`,
        projectId,
      );
    }
    return invoice;
  };

  // Only drafts can be edited. Pass send = true to save and send in one step.
  const updateInvoice = (invoiceId, patch, send = false) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice)
      return { ok: false, message: "That invoice could not be found." };
    if (invoice.status !== "draft")
      return { ok: false, message: "Only draft invoices can be edited." };
    const next = { ...patch };
    if (patch.items) {
      next.items = patch.items.map((item) => ({
        ...item,
        qty: Number(item.qty) || 1,
        amount: Number(item.amount),
      }));
    }
    if (patch.issuedAt) next.issuedLabel = dateLabel(patch.issuedAt);
    if (patch.dueAt) next.dueLabel = dateLabel(patch.dueAt);
    const merged = { ...invoice, ...next, ...(send ? { status: "sent" } : {}) };
    setInvoices((current) =>
      current.map((item) => (item.id === invoiceId ? merged : item)),
    );
    if (send) {
      const client = clients.find((item) => item.id === merged.clientId);
      addActivity(
        merged.projectId,
        `Invoice ${merged.number} was sent to ${client?.name ?? "the client"}`,
      );
      notify(
        clientUserIds(merged.clientId),
        `Invoice ${merged.number} is ready to view.`,
        merged.projectId,
      );
    }
    return { ok: true, invoice: merged };
  };

  const sendInvoice = (invoiceId) => updateInvoice(invoiceId, {}, true);

  const deleteInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || invoice.status !== "draft")
      return { ok: false, message: "Only draft invoices can be deleted." };
    setInvoices((current) => current.filter((item) => item.id !== invoiceId));
    return { ok: true };
  };

  const markInvoicePaid = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || !["sent", "overdue"].includes(effectiveStatus(invoice))) {
      return {
        ok: false,
        message: "Only sent invoices can be marked as paid.",
      };
    }
    const paidAt = todayISO();
    setInvoices((current) =>
      current.map((item) =>
        item.id === invoiceId ? { ...item, status: "paid", paidAt } : item,
      ),
    );
    addActivity(
      invoice.projectId,
      `Invoice ${invoice.number} was marked as paid`,
    );
    notify(
      [...clientUserIds(invoice.clientId), ...managerIds()],
      `Invoice ${invoice.number} was marked as paid.`,
      invoice.projectId,
    );
    return { ok: true };
  };

  const cancelInvoice = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || !["sent", "overdue"].includes(effectiveStatus(invoice))) {
      return { ok: false, message: "Only sent invoices can be cancelled." };
    }
    setInvoices((current) =>
      current.map((item) =>
        item.id === invoiceId ? { ...item, status: "cancelled" } : item,
      ),
    );
    addActivity(invoice.projectId, `Invoice ${invoice.number} was cancelled`);
    notify(
      clientUserIds(invoice.clientId),
      `Invoice ${invoice.number} was cancelled.`,
      invoice.projectId,
    );
    return { ok: true };
  };

  const remindInvoice = async (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || !["sent", "overdue"].includes(effectiveStatus(invoice))) {
      return { ok: false, message: "Only sent invoices can have a reminder." };
    }
    const client = clients.find((item) => item.id === invoice.clientId);
    const clientUser = users.find(
      (item) =>
        item.role === "client" &&
        item.clientId === invoice.clientId &&
        item.active !== false,
    );
    const email = client?.email || clientUser?.email;
    if (!email) {
      return { ok: false, message: "This client has no email address for a payment reminder." };
    }
    if (!session?.token) {
      return { ok: false, message: "Sign in again before sending a payment reminder." };
    }

    const project = projects.find((item) => item.id === invoice.projectId);
    const delivery = await emailPaymentReminder({
      token: session.token,
      email,
      name: client?.contact || clientUser?.name || client?.name || "",
      invoiceNumber: invoice.number,
      projectName: project?.name ?? "",
      amount: formatRand(invoiceTotal(invoice)),
      dueLabel: invoice.dueLabel,
      link: `${PORTAL_URL}/client/invoices`,
    });
    if (!delivery.sent) {
      return {
        ok: false,
        message: delivery.message || "The payment reminder could not be emailed.",
      };
    }

    setInvoices((current) =>
      current.map((item) =>
        item.id === invoiceId ? { ...item, reminded: true } : item,
      ),
    );
    addActivity(
      invoice.projectId,
      `Payment reminder emailed to ${client?.name ?? email} for ${invoice.number}`,
    );
    notify(
      clientUserIds(invoice.clientId),
      `Reminder: invoice ${invoice.number} is due ${invoice.dueLabel}.`,
      invoice.projectId,
    );
    return { ok: true, message: `A payment reminder was emailed to ${email}.` };
  };

  const addMilestone = (projectId, { name, targetLabel }) => {
    const errors = {};
    if (!name?.trim()) errors.name = "Enter a milestone name.";
    if (!targetLabel?.trim()) errors.targetLabel = "Enter a target date.";
    if (Object.keys(errors).length) return { ok: false, errors };
    const project = projects.find((item) => item.id === projectId);
    if (!project)
      return {
        ok: false,
        message: "Open a project before adding a milestone.",
      };
    const milestone = {
      id: createId("mile"),
      name: name.trim(),
      targetLabel: targetLabel.trim(),
      status: "planned",
    };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? { ...item, milestones: [...(item.milestones ?? []), milestone] }
          : item,
      ),
    );
    addActivity(projectId, `Milestone added: ${milestone.name}`);
    notify(
      clientUserIds(project.clientId),
      `${milestone.name} was added to the ${project.name} timeline.`,
      projectId,
    );
    return { ok: true };
  };

  const updateMilestone = (projectId, milestoneId, { name, targetLabel }) => {
    const errors = {};
    if (!name?.trim()) errors.name = "Enter a milestone name.";
    if (!targetLabel?.trim()) errors.targetLabel = "Enter a target date.";
    if (Object.keys(errors).length) return { ok: false, errors };
    const project = projects.find((item) => item.id === projectId);
    const existing = project?.milestones?.find(
      (item) => item.id === milestoneId,
    );
    if (!existing)
      return {
        ok: false,
        message: "That milestone is no longer on this project.",
      };
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              milestones: item.milestones.map((milestone) =>
                milestone.id === milestoneId
                  ? {
                      ...milestone,
                      name: name.trim(),
                      targetLabel: targetLabel.trim(),
                    }
                  : milestone,
              ),
            }
          : item,
      ),
    );
    addActivity(projectId, `Milestone updated: ${name.trim()}`);
    return { ok: true };
  };

  const completeMilestone = (projectId, milestoneId) => {
    let label = "Milestone";
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) return project;
        const milestones = (project.milestones ?? []).map((item) => {
          if (item.id !== milestoneId) return item;
          label = item.name;
          return { ...item, status: "complete" };
        });
        return { ...project, milestones };
      }),
    );
    addActivity(projectId, `${label} marked complete`);
  };

  const addRequirement = (projectId, text) => {
    const project = projects.find((item) => item.id === projectId);
    if (!text?.trim() || !project)
      return { ok: false, message: "Enter the requirement." };
    const requirement = {
      id: createId("req"),
      projectId,
      text: text.trim(),
      status: "recorded",
    };
    setRequirements((current) => [...current, requirement]);
    addActivity(projectId, `Requirement recorded: ${requirement.text}`);
    notify(
      clientUserIds(project.clientId),
      `A requirement on ${project.name} is ready for you to confirm.`,
      projectId,
    );
    return { ok: true };
  };

  const setRequirementStatus = (requirementId, status) => {
    const requirement = requirements.find((item) => item.id === requirementId);
    if (!requirement) return;
    setRequirements((current) =>
      current.map((item) =>
        item.id === requirementId ? { ...item, status } : item,
      ),
    );
    addActivity(
      requirement.projectId,
      `Requirement ${status}: ${requirement.text}`,
    );
    if (status === "disputed")
      notify(
        managerIds(),
        `A client disputed a requirement: ${requirement.text}`,
        requirement.projectId,
      );
  };

  const submitChangeRequest = (projectId, taskId, description, attachment = null) => {
    if (!description?.trim())
      return { ok: false, message: "Describe the change before submitting." };
    const project = projects.find((item) => item.id === projectId);
    const task = (project?.tasks ?? []).find((item) => item.id === taskId);
    if (!task)
      return { ok: false, message: "Choose the task this change belongs to." };
    if (task.status === "done")
      return { ok: false, message: "That task is already complete." };
    const file = attachment?.previewUrl
      ? {
          name: attachment.name,
          kind: attachment.kind,
          previewUrl: attachment.previewUrl,
        }
      : null;
    const request = {
      id: createId("change"),
      projectId,
      taskId: task.id,
      clientId: user?.clientId,
      description: description.trim(),
      attachment: file,
      status: "submitted",
      createdAt: new Date().toISOString(),
    };
    setChangeRequests((current) => [request, ...current]);
    addActivity(
      projectId,
      `Change request on “${task.title}”: ${request.description}`,
    );
    notify(
      managerIds(),
      `${user?.name ?? "A client"} requested a change on “${task.title}” in ${project?.name ?? "a project"}.`,
      projectId,
    );
    return { ok: true };
  };

  const decideChangeRequest = (requestId, status) => {
    const request = changeRequests.find((item) => item.id === requestId);
    if (!request) return;
    setChangeRequests((current) =>
      current.map((item) =>
        item.id === requestId ? { ...item, status } : item,
      ),
    );
    addActivity(
      request.projectId,
      `Change request marked ${status.replace("_", " ")}`,
    );
    notify(
      clientUserIds(request.clientId),
      `Your change request was updated: ${status.replace("_", " ")}.`,
      request.projectId,
    );
    addAudit({
      type: "change_decided",
      category: "changes",
      target: request.description,
      detail: [
        ["Status", request.status.replace("_", " "), status.replace("_", " ")],
      ],
    });
  };

  const saveAccount = async ({ id, name, email, role, phone, company }) => {
    const normalised = String(email ?? "")
      .trim()
      .toLowerCase();
    if (
      users.some(
        (item) => item.email.toLowerCase() === normalised && item.id !== id,
      )
    ) {
      return {
        ok: false,
        message: "An account with that email already exists.",
      };
    }
    if (!name?.trim() || !normalised || !role)
      return { ok: false, message: "Name, email, and role are required." };
    const cleanPhone = (phone ?? "").trim();

    if (id) {
      const before = users.find((item) => item.id === id);
      if (!before)
        return { ok: false, message: "That user could not be found." };
      const changes = [];
      if (before.name !== name.trim())
        changes.push(["Name", before.name, name.trim()]);
      if (before.email.toLowerCase() !== normalised)
        changes.push(["Email", before.email, normalised]);
      if (before.role !== role)
        changes.push(["Role", roleLabel(before.role), roleLabel(role)]);
      if ((before.phone ?? "") !== cleanPhone)
        changes.push(["Phone", before.phone || "none", cleanPhone || "none"]);

      setUsers((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                name: name.trim(),
                email: normalised,
                role,
                phone: cleanPhone,
                title: before.role === role ? item.title : roleLabel(role),
              }
            : item,
        ),
      );
      if (changes.length) {
        addAudit({
          type: "user_edited",
          category: "accounts",
          target: name.trim(),
          detail: changes,
        });
      }
      return { ok: true };
    }

    if (role === "client" && !company?.trim())
      return { ok: false, message: "A client account needs a company name." };

    const remote = await createPendingAccount(
      {
        name: name.trim(),
        email: normalised,
        role,
        phone: cleanPhone,
        company: company?.trim() ?? "",
        link: `${PORTAL_URL}/activate`,
      },
      session?.token,
    );

    if (!remote.ok) {
      return {
        ok: false,
        message: remote.message || "The account could not be created.",
      };
    }

    const next = {
      id: remote.user.id,
      name: remote.user.name || name.trim(),
      email: remote.user.email || normalised,
      password: "",
      role: remote.user.role || role,
      clientId: remote.user.clientId ?? null,
      memberId: remote.user.memberId ?? null,
      phone: remote.user.phone || cleanPhone,
      title:
        remote.user.title ||
        (role === "client" ? company.trim() : roleLabel(role)),
      active: true,
      activated: false,
      signInCodeExpires: Date.now() + 24 * 60 * 60 * 1000,
    };

    if (role === "client" && next.clientId) {
      setClients((current) => {
        if (current.some((item) => item.id === next.clientId)) return current;
        return [
          ...current,
          {
            id: next.clientId,
            name: company.trim(),
            contact: next.name,
            email: next.email,
          },
        ];
      });
    }

    setUsers((current) => [...current, next]);
    refreshPeople(session?.token);
    addAudit({
      type: "user_added",
      category: "accounts",
      target: next.name,
      detail: [
        ["Role", "", roleLabel(role)],
        ["Account", "", "Waiting for a password"],
      ],
    });
    return {
      ok: true,
      emailed: remote.emailed,
      previewCode: remote.previewCode,
      message: remote.emailed
        ? `An activation email was sent to ${normalised}.`
        : remote.message,
    };
  };

  const rememberActivatedUser = (ready) => {
    setUsers((current) => {
      const index = current.findIndex(
        (item) =>
          item.id === ready.id ||
          item.email.toLowerCase() === ready.email.toLowerCase(),
      );
      if (index === -1) return [...current, ready];
      return current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...ready } : item,
      );
    });
  };

  const activateAccount = async ({ email, code, password }) => {
    const normalised = String(email ?? "")
      .trim()
      .toLowerCase();
    const remote = await activateRemote({ email: normalised, code, password });
    if (remote.ok) {
      const ready = {
        id: remote.user.id,
        name: remote.user.name,
        email: remote.user.email,
        password,
        role: remote.user.role,
        clientId: remote.user.clientId ?? null,
        memberId: remote.user.memberId ?? null,
        phone: remote.user.phone || "",
        title: remote.user.title || roleLabel(remote.user.role),
        active: true,
        activated: true,
      };
      rememberActivatedUser(ready);
      addAudit({
        actor: ready.name,
        type: "account_ready",
        category: "accounts",
        target: ready.email,
      });
      persist(null);
      return {
        ok: true,
        user: publicUser(ready),
        message: "Account activated successfully. Please sign in.",
      };
    }
    if (!remote.offline && !remote.notFound)
      return { ok: false, message: remote.message };

    const match = users.find((item) => item.email.toLowerCase() === normalised);
    if (!match) {
      return {
        ok: false,
        message: remote.notFound
          ? remote.message
          : "The API is not running, so this email cannot be checked on the shared database.",
      };
    }
    if (match.active === false)
      return {
        ok: false,
        message: "This account has been deactivated. Contact an administrator.",
      };
    if (match.activated !== false)
      return {
        ok: false,
        message: "This account already has a password. Sign in instead.",
      };
    if (!password || password.length < 8)
      return {
        ok: false,
        message: "Use at least 8 characters for the password.",
      };

    const result = assessOtp(
      {
        code: match.signInCode,
        expiresAt: match.signInCodeExpires,
        attempts: match.activationAttempts ?? 0,
      },
      code,
    );
    if (!result.ok) {
      if (result.clear) {
        setUsers((current) =>
          current.map((item) =>
            item.id === match.id
              ? { ...item, signInCode: null, signInCodeExpires: null }
              : item,
          ),
        );
      } else if (result.attempts) {
        setUsers((current) =>
          current.map((item) =>
            item.id === match.id
              ? { ...item, activationAttempts: result.attempts }
              : item,
          ),
        );
      }
      return { ok: false, message: result.message };
    }

    const ready = {
      ...match,
      password,
      activated: true,
      signInCode: null,
      signInCodeExpires: null,
      activationAttempts: 0,
      failedAttempts: 0,
      locked: false,
    };
    setUsers((current) =>
      current.map((item) => (item.id === match.id ? ready : item)),
    );
    addAudit({
      actor: match.name,
      type: "account_ready",
      category: "accounts",
      target: match.email,
    });
    persist(ready);
    return { ok: true, user: publicUser(ready) };
  };

  const setAccountActive = async (userId, active) => {
    if (userId === user?.id)
      return {
        ok: false,
        message: "You cannot deactivate the account you are using.",
      };
    const remote = await setAccountStatus(userId, active, session?.token);
    if (!remote.ok) return remote;
    const account = users.find((item) => item.id === userId);
    setUsers((current) =>
      current.map((item) =>
        item.id === userId
          ? { ...item, active, locked: active ? item.locked : true }
          : item,
      ),
    );
    if (account) {
      addAudit({
        type: active ? "user_activated" : "user_deactivated",
        category: "accounts",
        target: account.name,
        detail: [
          [
            "Account",
            active ? "Deactivated" : "Active",
            active ? "Active" : "Deactivated",
          ],
        ],
      });
    }
    return { ok: true };
  };

  const markNotificationRead = (notificationId) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    );
  };

  const value = {
    user: publicUser(user),
    session,
    users,
    clients,
    projects,
    invoices,
    activities,
    changeRequests,
    requirements,
    notifications,
    auditLog,
    addAudit,
    members,
    login,
    logout,
    verifyOtp,
    resendOtp,
    cancelOtp,
    createProject,
    deleteProject,
    updateProject,
    moveTask,
    addTask,
    assignTask,
    nudgeClient,
    addComment,
    markProjectCommentsRead,
    addFile,
    approveFile,
    decideFile,
    decideInvoice,
    generateInvoice,
    updateInvoice,
    sendInvoice,
    deleteInvoice,
    markInvoicePaid,
    cancelInvoice,
    remindInvoice,
    addMilestone,
    updateMilestone,
    completeMilestone,
    addRequirement,
    setRequirementStatus,
    submitChangeRequest,
    decideChangeRequest,
    saveAccount,
    activateAccount,
    setAccountActive,
    markNotificationRead,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
