import { API_BASE } from "./api";
import { dateLabel } from "./invoiceDates";

function mapRows(value, mapItem) {
  return Array.isArray(value) ? value.map(mapItem).filter((item) => item.id) : [];
}

function field(raw, camel, pascal, fallback = "") {
  if (!raw) return fallback;
  const value = raw[camel] ?? raw[pascal];
  return value ?? fallback;
}

export function mapProject(raw) {
  const tasks = raw?.tasks ?? raw?.Tasks ?? [];
  const members = raw?.memberIds ?? raw?.MemberIds ?? [];
  return {
    id: field(raw, "id", "Id"),
    clientId: field(raw, "clientId", "ClientId"),
    name: field(raw, "name", "Name"),
    service: field(raw, "service", "Service"),
    description: field(raw, "description", "Description"),
    status: field(raw, "status", "Status", "in_progress"),
    stage: field(raw, "stage", "Stage", "discovery"),
    startedLabel: field(raw, "startedLabel", "StartedLabel"),
    dueLabel: field(raw, "dueLabel", "DueLabel"),
    dueThisWeek: Boolean(field(raw, "dueThisWeek", "DueThisWeek", false)),
    progress: Number(field(raw, "progress", "Progress", 0)) || 0,
    memberIds: Array.isArray(members) ? members.map((item) => String(item)) : [],
    milestones: mapRows(raw?.milestones ?? raw?.Milestones, (item) => ({
      id: field(item, "id", "Id"),
      name: field(item, "name", "Name"),
      targetLabel: field(item, "targetLabel", "TargetLabel"),
      status: field(item, "status", "Status", "planned"),
    })),
    files: mapRows(raw?.files ?? raw?.Files, (item) => ({
      id: field(item, "id", "Id"),
      name: field(item, "name", "Name"),
      kind: field(item, "kind", "Kind", "File"),
      description: field(item, "description", "Description"),
      previewUrl: field(item, "previewUrl", "PreviewUrl"),
      uploadedBy: field(item, "uploadedBy", "UploadedBy"),
      createdAt: field(item, "createdAt", "CreatedAt"),
      approval: field(item, "approval", "Approval", "pending"),
      version: Number(field(item, "version", "Version", 1)) || 1,
    })),
    comments: mapRows(raw?.comments ?? raw?.Comments, (item) => ({
      id: field(item, "id", "Id"),
      authorName: field(item, "authorName", "AuthorName"),
      initials: field(item, "initials", "Initials"),
      role: field(item, "role", "Role"),
      body: field(item, "body", "Body"),
      replyToId: field(item, "replyToId", "ReplyToId", null),
      createdAt: field(item, "createdAt", "CreatedAt"),
      read: true,
    })),
    requirements: mapRows(raw?.requirements ?? raw?.Requirements, (item) => ({
      id: field(item, "id", "Id"),
      projectId: field(item, "projectId", "ProjectId") || field(raw, "id", "Id"),
      text: field(item, "text", "Text"),
      status: field(item, "status", "Status", "recorded"),
    })),
    changeRequests: mapRows(raw?.changeRequests ?? raw?.ChangeRequests, (item) => {
      const name = field(item, "attachmentName", "AttachmentName");
      return {
        id: field(item, "id", "Id"),
        projectId: field(item, "projectId", "ProjectId") || field(raw, "id", "Id"),
        clientId: field(item, "clientId", "ClientId", null),
        taskId: field(item, "taskId", "TaskId", null),
        description: field(item, "description", "Description"),
        status: field(item, "status", "Status", "submitted"),
        createdAt: field(item, "createdAt", "CreatedAt"),
        attachment: name
          ? {
              name,
              kind: field(item, "attachmentKind", "AttachmentKind"),
              previewUrl: field(item, "attachmentPreviewUrl", "AttachmentPreviewUrl"),
            }
          : null,
      };
    }),
    tasks: Array.isArray(tasks)
      ? tasks.map((task) => ({
          id: field(task, "id", "Id"),
          title: field(task, "title", "Title"),
          description: field(task, "description", "Description"),
          type: field(task, "type", "Type", "dev"),
          status: field(task, "status", "Status", "backlog"),
          assigneeId: field(task, "assigneeId", "AssigneeId", null),
          dueLabel: field(task, "dueLabel", "DueLabel", "No date"),
        }))
      : [],
  };
}

async function send(path, token, body, method) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function listProjects(token) {
  try {
    const { response, payload } = await send("/api/projects", token);
    if (!response.ok || !Array.isArray(payload)) return { ok: false, projects: [] };
    return { ok: true, projects: payload.map(mapProject).filter((item) => item.id) };
  } catch {
    return { ok: false, projects: [] };
  }
}

export async function createRemoteProject(project, token) {
  try {
    const { response, payload } = await send("/api/projects", token, project);
    if (!response.ok) {
      return { ok: false, message: payload?.message || "The project could not be saved." };
    }
    return { ok: true, project: mapProject(payload) };
  } catch {
    return { ok: false, message: "The server could not be reached. The project was not saved." };
  }
}

export async function createRemoteTask(projectId, task, token) {
  try {
    const { response, payload } = await send(`/api/projects/${projectId}/tasks`, token, task);
    if (!response.ok) {
      return { ok: false, message: payload?.message || "The task could not be saved." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "The server could not be reached. The task was not saved." };
  }
}

function displayDate(value) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? dateLabel(text) : text;
}

export function mapInvoice(raw) {
  const items = raw?.items ?? raw?.Items ?? [];
  const dueRaw = String(field(raw, "dueLabel", "DueLabel"));
  const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : "";
  return {
    id: field(raw, "id", "Id"),
    number: field(raw, "number", "Number"),
    clientId: field(raw, "clientId", "ClientId"),
    projectId: field(raw, "projectId", "ProjectId"),
    title: field(raw, "title", "Title"),
    status: field(raw, "status", "Status", "pending"),
    issuedLabel: displayDate(field(raw, "issuedLabel", "IssuedLabel")),
    dueAt,
    dueLabel: displayDate(dueRaw),
    items: Array.isArray(items)
      ? items.map((item) => ({
          id: field(item, "id", "Id"),
          description: field(item, "description", "Description"),
          qty: Number(field(item, "qty", "Qty", 1)) || 1,
          amount: Number(field(item, "amount", "Amount", 0)) || 0,
        }))
      : [],
  };
}

export async function listInvoices(token) {
  try {
    const { response, payload } = await send("/api/invoices", token);
    if (!response.ok || !Array.isArray(payload)) return { ok: false, invoices: [] };
    return { ok: true, invoices: payload.map(mapInvoice).filter((item) => item.id) };
  } catch {
    return { ok: false, invoices: [] };
  }
}

export async function postProjectAction(path, token, body, method) {
  try {
    const { response, payload } = await send(path, token, body, method);
    if (!response.ok) return { ok: false, message: payload?.message || "The update could not be saved." };
    return { ok: true, payload };
  } catch {
    return { ok: false, message: "The server could not be reached. The update was not saved." };
  }
}

export async function assignRemoteTask(projectId, taskId, assigneeId, token) {
  try {
    const { response, payload } = await send(
      `/api/projects/${projectId}/tasks/${taskId}/assign`,
      token,
      { assigneeId },
    );
    if (!response.ok) {
      return { ok: false, message: payload?.message || "The task could not be assigned." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "The server could not be reached. The task was not assigned." };
  }
}
