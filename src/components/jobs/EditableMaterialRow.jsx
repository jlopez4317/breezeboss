import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['Equipment', 'Refrigerant', 'Copper & Fittings', 'Electrical', 'Ductwork', 'Insulation', 'Controls & Thermostats', 'Filters', 'Drain & PVC', 'Hardware & Fasteners', 'Tools & Consumables', 'Safety', 'Miscellaneous'];

export default function EditableMaterialRow({ jm, jobId, onDelete, onSaved }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(jm.category || '');
  const [quantity, setQuantity] = useState(jm.quantity ?? 1);
  const [unitCost, setUnitCost] = useState(jm.unitCost ?? 0);
  const [savedFlash, setSavedFlash] = useState(false);

  const totalCost = (parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0);

  const save = async (updates) => {
    const patch = { ...updates };
    const qty = parseFloat(updates.quantity ?? quantity) || 0;
    const uc = parseFloat(updates.unitCost ?? unitCost) || 0;
    patch.totalCost = qty * uc;
    await base44.entities.JobMaterial.update(jm.id, patch);
    queryClient.invalidateQueries({ queryKey: ['jobMaterials', jobId] });
    onSaved && onSaved();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{jm.materialName}</TableCell>
      <TableCell>
        <Select value={category} onValueChange={(v) => { setCategory(v); save({ category: v }); }}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="1"
          min="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          onBlur={() => save({ quantity: Math.max(1, Math.round(parseFloat(quantity) || 1)) })}
          className="h-8 w-20 text-sm text-right"
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{jm.unit}</TableCell>
      <TableCell>
        <Input
          type="number"
          step="1"
          min="0"
          value={unitCost}
          onChange={e => setUnitCost(e.target.value)}
          onBlur={() => save({ unitCost: parseFloat(unitCost) || 0 })}
          className="h-8 w-28 text-sm text-right"
        />
      </TableCell>
      <TableCell className="text-right font-semibold text-sm">
        <div className="flex items-center justify-end gap-1.5">
          {formatCurrency(totalCost)}
          {savedFlash && <span className="text-xs text-emerald-500 flex items-center gap-0.5 font-normal"><Check className="w-3 h-3" />Saved</span>}
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(jm.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}