import { AlertTriangle, Info } from 'lucide-react';

interface DisclaimerProps {
  variant?: 'info' | 'warning';
  className?: string;
}

export default function Disclaimer({ variant = 'info', className = '' }: DisclaimerProps) {
  if (variant === 'warning') {
    return (
      <div className={`border border-orange-200 bg-orange-50 rounded-2xl p-4 ${className}`}>
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800 text-sm">Important Disclaimer</p>
            <p className="text-orange-700 text-sm mt-1 leading-relaxed">
              This assessment is a <strong>screening tool only</strong>. It is NOT a medical diagnosis.
              Please consult a qualified mental health professional for clinical evaluation and treatment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-blue-200 bg-blue-50 rounded-2xl p-4 ${className}`}>
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          This questionnaire is for <strong>screening purposes only</strong>. 
          Your responses are private and will not be shared.
        </p>
      </div>
    </div>
  );
}
