import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function StatusBadge({ status, className }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", getStatusColor(status), className)}>
      {status}
    </Badge>
  );
}