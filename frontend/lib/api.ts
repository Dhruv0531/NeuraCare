const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('neuracare_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('neuracare_token');
    localStorage.removeItem('neuracare_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────
export const api = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // ── Assessment ──────────────────────────────────────────────────────
  submitAssessment: (formData: Record<string, unknown>) =>
    request('/api/assessment/submit', { method: 'POST', body: JSON.stringify(formData) }),

  getHistory: () =>
    request<Assessment[]>('/api/assessment/history'),

  getAssessment: (id: string) =>
    request<Assessment>(`/api/assessment/${id}`),

  // ── Clinician ───────────────────────────────────────────────────────
  getCohort: () =>
    request<Patient[]>('/api/clinician/cohort'),

  // ── User ────────────────────────────────────────────────────────────
  updateProfile: (body: { name: string }) =>
    request('/api/user/profile', { method: 'PUT', body: JSON.stringify(body) }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request('/api/user/password', { method: 'PUT', body: JSON.stringify(body) }),

  deleteAccount: () =>
    request('/api/user', { method: 'DELETE' }),
};

// ── Types ─────────────────────────────────────────────────────────────
export interface RiskResult {
  label: 'Low' | 'Moderate' | 'High';
  score: number;
  probabilities: { low: number; moderate: number; high: number };
}

export interface ShapFeature {
  feature: string;
  value: number;
}

export interface Assessment {
  _id: string;
  createdAt: string;
  overallScore: number;
  depression: RiskResult;
  anxiety: RiskResult;
  stress: RiskResult;
  insomnia: RiskResult;
  shapValues: {
    depression: ShapFeature[];
    anxiety: ShapFeature[];
    stress: ShapFeature[];
    insomnia: ShapFeature[];
  };
  recommendations: string[];
  formData?: Record<string, unknown>;
}

export interface Patient {
  _id: string;
  patientId: string;
  ageGroup: string;
  lastAssessment: string;
  depression: RiskResult;
  anxiety: RiskResult;
  stress: RiskResult;
  insomnia: RiskResult;
  overallScore: number;
}
