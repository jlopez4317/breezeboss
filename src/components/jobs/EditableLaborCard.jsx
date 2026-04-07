import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditableLaborCard({ laborCost, jobStatus, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(laborCost || 0));

  const isLocked = ['Completed', 'Invoiced', 'Paid', 'Cancelled'].includes(jobStatus);
  const isEditable = !isLocked;

  const handleSave = () => {
    const newCost = parseFloat(inputValue) || 0;
    if (newCost < 0) {
      toast.error('Labor cost cannot be negative');
      return;
    }
    onSave(newCost);
    setIsEditing(false);
    toast.success('Labor updated ✓');
  };

  const handleCancel = () => {
    setInputValue(String(laborCost || 0));
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="1"
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-9"
        />
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0 text-emerald-600">
          <Check className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0 text-destructive">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="p-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          Labor Cost
          {isLocked && <Lock className="w-3 h-3" />}
        </p>
        <p className="text-lg font-bold text-secondary flex items-center gap-2">
          {formatCurrency(laborCost)}
          {isEditable && (
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
              title="Edit labor cost"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </p>
      </div>
      {isLocked && (
        <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
          Labor cannot be edited after job is completed
        </div>
      )}
    </div>
  );
}