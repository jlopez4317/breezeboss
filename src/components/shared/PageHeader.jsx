import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function PageHeader({ title, subtitle, actionLabel, onAction, icon: Icon, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && (
          <Button onClick={onAction} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
            {Icon ? <Icon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}