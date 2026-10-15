/**
 * PaperPilot API client.
 *
 * Talks to the FastAPI backend with the signed-in user's Firebase ID token.
 * Failures are thrown as ApiError so the UI can show them; this client never
 * substitutes mock or demo data for a user's own library.
 */

import { auth } from './firebase';
import { Paper, UploadResult, LibraryStats } from '../types';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (isLocalhost ? 'http://127.0.0.1:8000/api/v1' : null);

/** Per-file upload limit enforced client-side; the server enforces its own (PAPERPILOT_MAX_UPLOAD_MB). */
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 25;

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function baseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError('PaperPilot API is not configured (VITE_API_URL is not set).');
  }
  return API_BASE_URL;
}

async function getAuthHeaders(forceRefresh = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken(forceRefresh);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }
  return headers;
}

/** fetch with Bearer token, one forced-refresh retry on 401, and network errors turned into ApiError. */
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${baseUrl()}${path}`;
  const send = async (forceRefresh: boolean) =>
    fetch(url, {
      ...options,
      headers: { ...(await getAuthHeaders(forceRefresh)), ...(options.headers || {}) },
    });

  try {
    let res = await send(false);
    if (res.status === 401 && auth.currentUser) res = await send(true);
    return res;
  } catch {
    throw new ApiError('Could not reach the PaperPilot server. Check your connection and try again.');
  }
}

async function errorFrom(res: Response, fallback: string): Promise<ApiError> {
  let detail = '';
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') detail = body.detail;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401) return new ApiError('Your session has expired. Please sign in again.', 401);
  return new ApiError(detail || `${fallback} (HTTP ${res.status}).`, res.status);
}

export const api = {
  /** The signed-in user's own papers, or (includeDemo) their papers plus the demo library. */
  async getPapers(includeDemo = false): Promise<Paper[]> {
    const res = await authFetch(`/papers${includeDemo ? '?include_demo=true' : ''}`);
    if (!res.ok) throw await errorFrom(res, 'Could not load papers');
    const data = await res.json();
    if (!Array.isArray(data)) throw new ApiError('The server returned an unexpected response.');
    return data;
  },

  /** Public benchmark papers only. */
  async getDemoPapers(): Promise<Paper[]> {
    const all = await api.getPapers(true);
    return all.filter((p) => p.is_demo);
  },

  async getPaperById(id: string): Promise<Paper | undefined> {
    const res = await authFetch(`/papers/${encodeURIComponent(id)}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw await errorFrom(res, 'Could not load paper');
    return res.json();
  },

  /** Stores PDFs for the signed-in user. Resolves with per-file results; rejects only if the request itself failed. */
  async uploadPapers(files: File[]): Promise<{ items: UploadResult[]; papers: Paper[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await authFetch('/papers/upload', { method: 'POST', body: formData });
    if (!res.ok) throw await errorFrom(res, 'Upload failed');
    const data = await res.json();
    if (!Array.isArray(data?.items)) throw new ApiError('The server returned an unexpected response.');
    return { items: data.items, papers: Array.isArray(data.papers) ? data.papers : [] };
  },

  async deletePaper(paperId: string): Promise<void> {
    const res = await authFetch(`/papers/${encodeURIComponent(paperId)}`, { method: 'DELETE' });
    if (!res.ok) throw await errorFrom(res, 'Could not delete paper');
  },

  /** Real counts from the database: personal papers vs. demo library. */
  async getLibraryStats(): Promise<LibraryStats> {
    const res = await authFetch('/stats');
    if (!res.ok) throw await errorFrom(res, 'Could not load library stats');
    return res.json();
  },
};
