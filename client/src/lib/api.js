const DEFAULT_API_URL = import.meta.env.DEV
  ? "http://localhost:3001"
  : window.location.origin;

const API_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(
  /\/$/,
  "",
);

export function buildApiUrl(path) {
  return `${API_URL}${path}`;
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const hasJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    typeof options.body !== "string" &&
    !(options.body instanceof FormData);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: "include",
    headers,
    body: hasJsonBody ? JSON.stringify(options.body) : options.body,
  });

  const text = await response.text();
  const data = text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Request failed.");
  }

  return data;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
