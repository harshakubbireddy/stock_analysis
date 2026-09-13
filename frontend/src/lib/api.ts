import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/** Clear the backend SQLite response cache. Returns true on success. */
export async function clearCache(): Promise<boolean> {
  try {
    await api.post("/api/cache/clear");
    return true;
  } catch {
    return false;
  }
}
