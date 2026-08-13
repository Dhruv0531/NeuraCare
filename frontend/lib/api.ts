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

// ── Auth & Endpoints ──────────────────────────────────────────────────
export const api = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // ── Assessment ──────────────────────────────────────────────────────
  submitAssessment: async (formData: Record<string, unknown>): Promise<Assessment> => {
    try {
      return await request<Assessment>('/api/assessment/submit', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    } catch (expressErr) {
      console.warn('Express backend (5000) unreachable, trying direct FastAPI (8000)...', expressErr);
      try {
        const res = await fetch('http://127.0.0.1:8000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: formData,
            sleep_answers: formData.sleep_answers || [],
            text: formData.text || '',
          }),
        });

        if (!res.ok) throw new Error('FastAPI error');
        const data = await res.json();

        return {
          _id: data.record_id || 'fastapi_' + Date.now(),
          createdAt: new Date().toISOString(),
          overallScore: 50,
          depression: data.depression,
          anxiety: data.anxiety,
          stress: data.stress,
          insomnia: data.sleep
            ? { label: data.sleep.level, score: data.sleep.score, probabilities: { low: 0, moderate: 0, high: 0 } }
            : { label: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
          sleep: data.sleep,
          emotion: data.emotion,
          shapValues: {
            depression: data.depression?.shap_explanation || [],
            anxiety: data.anxiety?.shap_explanation || [],
            stress: data.stress?.shap_explanation || [],
            insomnia: [],
          },
          recommendations: data.recommendations || [],
        } as Assessment;
      } catch (fastApiErr) {
        throw new Error('Backend connection failed. Please ensure FastAPI (port 8000) or Express (port 5000) is running.');
      }
    }
  },

  getHistory: async (): Promise<Assessment[]> => {
    try {
      return await request<Assessment[]>('/api/assessment/history');
    } catch {
      try {
        const res = await fetch('http://127.0.0.1:8000/history');
        if (!res.ok) return [];
        const rawDocs = await res.json();
        return rawDocs.map((item: any) => {
          const preds = item.predictions || {};
          return {
            _id: item._id || 'hist_' + Date.now(),
            createdAt: item.created_at || new Date().toISOString(),
            overallScore: 50,
            depression: preds.depression || { label: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
            anxiety: preds.anxiety || { label: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
            stress: preds.stress || { label: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
            insomnia: preds.sleep
              ? { label: preds.sleep.level, score: preds.sleep.score, probabilities: { low: 0, moderate: 0, high: 0 } }
              : { label: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
            sleep: preds.sleep,
            emotion: preds.emotion,
            shapValues: {
              depression: preds.depression?.shap_explanation || [],
              anxiety: preds.anxiety?.shap_explanation || [],
              stress: preds.stress?.shap_explanation || [],
              insomnia: [],
            },
            recommendations: preds.recommendations || [],
          } as Assessment;
        });
      } catch {
        return [];
      }
    }
  },

  getAssessment: (id: string) =>
    request<Assessment>(`/api/assessment/${id}`),

  // ── Clinician ───────────────────────────────────────────────────────
  getCohort: () =>
    request<Patient[]>('/api/clinician/cohort'),

  getClinicianSummary: async (): Promise<ClinicianSummary> => {
    try {
      return await request<ClinicianSummary>('/api/clinician/summary');
    } catch {
      try {
        const res = await fetch('http://127.0.0.1:8000/clinician/summary');
        if (!res.ok) throw new Error('FastAPI error');
        return await res.json();
      } catch {
        return {
          total_patients: 0,
          high_risk_cases: 0,
          risk_distribution: { Low: 0, Moderate: 0, High: 0 },
          recent_activity: [],
        };
      }
    }
  },

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
  shap_explanation?: ShapExplanation[];
}

export interface ShapExplanation {
  feature: string;
  description: string;
  value: number;
  impact: number;
}

export interface ShapFeature {
  feature: string;
  value: number;
}

export interface EmotionItem {
  label: string;
  score: number;
}

export interface EmotionData {
  status: string;
  emotions: EmotionItem[];
  message?: string;
}

export interface SleepData {
  level: 'Low' | 'Moderate' | 'High';
  score: number;
  max_score?: number;
  category?: string;
}

export interface Assessment {
  _id: string;
  createdAt: string;
  overallScore: number;
  depression: RiskResult;
  anxiety: RiskResult;
  stress: RiskResult;
  insomnia: RiskResult;
  sleep?: SleepData;
  emotion?: EmotionData;
  shapValues: {
    depression: { feature: string; value: number }[];
    anxiety: { feature: string; value: number }[];
    stress: { feature: string; value: number }[];
    insomnia: { feature: string; value: number }[];
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
  top_emotions?: string[];
}

export interface ClinicianSummary {
  total_patients: number;
  high_risk_cases: number;
  risk_distribution: { Low: number; Moderate: number; High: number };
  recent_activity: {
    patient_id: string;
    created_at: string;
    overall_risk: string;
    depression_level: string;
    anxiety_level: string;
    stress_level: string;
    top_emotions?: string[];
  }[];
}
