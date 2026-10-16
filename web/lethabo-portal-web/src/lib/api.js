export const API_BASE =
  import.meta.env.VITE_API_URL ??
  "https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net";

export const PORTAL_URL = (
  import.meta.env.VITE_PORTAL_URL ??
  "https://client-project-portal-a28c.onrender.com"
).replace(/\/$/, "");
