import { Check } from 'lucide-react';

interface Step {
  label: string;
  sublabel: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
}

export default function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className="flex flex-col items-center z-10 flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-success border-success text-white'
                    : isActive
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white border-border text-text-muted'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-xs font-semibold ${isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-text-muted'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-text-muted">{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Mobile label */}
      <p className="mt-3 text-center text-sm font-semibold text-primary sm:hidden">
        Step {currentStep + 1}: {steps[currentStep]?.label}
      </p>
    </div>
  );
}
