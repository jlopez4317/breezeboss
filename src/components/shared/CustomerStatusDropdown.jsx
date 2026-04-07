import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = ['Lead', 'Active', 'Inactive'];

const STATUS_COLORS = {
  Lead: 'bg-gray-100 text-gray-700 border-gray-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive: 'bg-red-50 text-red-600 border-red-200',
};

export default function CustomerStatusDropdown({ customerId, status }) {
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] = useState(status);

  const mutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Customer.update(customerId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      toast.success('Status updated ✓');
    },
    onError: () => {
      setOptimisticStatus(status); // revert on error
    },
  });

  const handleSelect = (newStatus) => {
    if (newStatus === optimisticStatus) return;
    setOptimisticStatus(newStatus);
    mutation.mutate(newStatus);
  };

  const current = optimisticStatus || status || 'Lead';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1',
              STATUS_COLORS[current] || STATUS_COLORS.Lead
            )}
          >
            {current}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleSelect(s)}
            className={cn('cursor-pointer text-xs', current === s && 'font-semibold')}
          >
            <span className={cn('inline-block w-2 h-2 rounded-full mr-2',
              s === 'Lead' && 'bg-gray-400',
              s === 'Active' && 'bg-emerald-500',
              s === 'Inactive' && 'bg-red-400',
            )} />
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}