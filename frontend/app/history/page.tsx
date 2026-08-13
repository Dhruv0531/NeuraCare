'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Brain, Activity, Sparkles, Clock, ArrowRight } from 'lucide-react';
import RiskBadge from '@/components/RiskBadge';
import { api, Assessment } from '@/lib/api';

export default function HistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main mb-1">Assessment History</h1>
          <p className="text-sm text-text-muted">Longitudinal Score History (Fetched Live from MongoDB Atlas)</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary mx-auto mb-4" />
            Loading assessment history from MongoDB...
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center text-text-muted space-y-4">
            <Clock className="h-12 w-12 text-text-muted mx-auto" />
            <h3 className="font-bold text-text-main text-lg">No History Records Found</h3>
            <p className="text-sm max-w-sm mx-auto">You have not completed any mental health risk assessments yet.</p>
            <button
              onClick={() => router.push('/assessment')}
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-3 rounded-xl hover:bg-primary-dark transition-all duration-200"
            >
              Take Assessment <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => {
              const depLevel = item.depression?.label || 'Low';
              const anxLevel = item.anxiety?.label || 'Low';
              const strLevel = item.stress?.label || 'Low';
              const sleepLevel = item.sleep?.level || item.insomnia?.label || 'Low';

              const levels = [depLevel, anxLevel, strLevel];
              const overallRisk = levels.includes('High') ? 'High' : (levels.includes('Moderate') ? 'Moderate' : 'Low');

              const emotions = item.emotion?.emotions || [];

              return (
                <div key={index} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4 hover:border-primary/30 transition-all">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.createdAt)}
                    </div>
                    <RiskBadge label={overallRisk} size="md" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-y border-border/60 py-3">
                    <div>
                      <span className="text-text-muted block mb-1">Depression</span>
                      <strong className="text-sm text-text-main">{depLevel}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Anxiety</span>
                      <strong className="text-sm text-text-main">{anxLevel}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Stress</span>
                      <strong className="text-sm text-text-main">{strLevel}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Sleep Quality</span>
                      <strong className="text-sm text-text-main">{sleepLevel}</strong>
                    </div>
                  </div>

                  {emotions.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                      <Sparkles className="h-3.5 w-3.5 text-secondary flex-shrink-0" />
                      <span className="text-text-muted">GoEmotions:</span>
                      {emotions.map((e, idx) => (
                        <span key={idx} className="bg-purple-50 text-purple-700 font-medium px-2.5 py-1 rounded-lg">
                          {e.label}: {Math.round(e.score * 100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
