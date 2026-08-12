interface RiskBadgeProps {
  label: 'Low' | 'Moderate' | 'High';
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({ label, size = 'md' }: RiskBadgeProps) {
  const colors = {
    Low: 'bg-success-light text-success border-success/20',
    Moderate: 'bg-warning-light text-warning border-warning/20',
    High: 'bg-danger-light text-danger border-danger/20',
  };
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5 font-bold',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${colors[label]} ${sizes[size]}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
        label === 'Low' ? 'bg-success' : label === 'Moderate' ? 'bg-warning' : 'bg-danger'
      }`} />
      {label}
    </span>
  );
}
