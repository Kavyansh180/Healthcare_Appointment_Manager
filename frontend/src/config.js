let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Clean trailing slashes
rawUrl = rawUrl.trim().replace(/\/+$/, "");

// Automatically append /api/v1 if not present
if (!rawUrl.endsWith("/api/v1")) {
  rawUrl = `${rawUrl}/api/v1`;
}

export const API_URL = rawUrl;
