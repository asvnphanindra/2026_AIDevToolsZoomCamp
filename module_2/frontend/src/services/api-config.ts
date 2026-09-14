/** API base URL for the FastAPI backend. */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  return (fromEnv?.replace(/\/$/, "") || "http://127.0.0.1:8000");
}
