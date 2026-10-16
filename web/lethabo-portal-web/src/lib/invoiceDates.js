const pad = (n) => String(n).padStart(2, "0");

export const toISODate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const addDaysISO = (iso, days) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

export const dateLabel = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
      })
    : "";

/*draft | sent | overdue | approved | declined | paid | cancelled
Old "pending" invoices count as sent. A sent invoice past its due date is overdue.*/
export const effectiveStatus = (invoice) => {
  const status = invoice.status === "pending" ? "sent" : invoice.status;
  if (
    status === "approved" ||
    status === "declined" ||
    status === "paid" ||
    status === "cancelled" ||
    status === "draft"
  )
    return status;
  return status === "sent" && invoice.dueAt && invoice.dueAt < todayISO()
    ? "overdue"
    : status;
};

export const invoiceTotal = (invoice) =>
  (invoice.items ?? []).reduce(
    (total, item) => total + Number(item.qty ?? 1) * Number(item.amount || 0),
    0,
  );
