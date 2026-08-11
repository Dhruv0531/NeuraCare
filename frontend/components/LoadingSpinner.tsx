export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeMap[size]} animate-spin rounded-full border-2 border-border border-t-primary`} />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card space-y-4">
      <div className="skeleton h-4 w-1/3 rounded-full" />
      <div className="skeleton h-8 w-2/3 rounded-full" />
      <div className="skeleton h-4 w-full rounded-full" />
      <div className="skeleton h-4 w-4/5 rounded-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 items-center py-3">
      <div className="skeleton h-4 w-1/4 rounded-full" />
      <div className="skeleton h-4 w-1/4 rounded-full" />
      <div className="skeleton h-4 w-1/4 rounded-full" />
      <div className="skeleton h-4 w-1/4 rounded-full" />
    </div>
  );
}
