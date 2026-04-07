import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Package, Search, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useMaterialsInit } from '@/hooks/useMaterialsInit';

const CATEGORIES = ['Equipment', 'Refrigerant', 'Copper & Fittings', 'Electrical', 'Ductwork', 'Insulation', 'Controls & Thermostats', 'Filters', 'Drain & PVC', 'Hardware & Fasteners', 'Tools & Consumables', 'Safety', 'Miscellaneous'];
const UNITS = ['Each', 'Foot', 'Pound', 'Box', 'Roll', 'Bag', 'Set'];

export default function Materials() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [pricingStatus, setPricingStatus] = useState(null); // 'updating' | 'done' | null

  useMaterialsInit(
    () => setPricingStatus('updating'),
    (success) => {
      if (success) {
        setPricingStatus('done');
        setTimeout(() => setPricingStatus(null), 5000);
      } else {
        setPricingStatus(null);
      }
    }
  );

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list('name', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Material.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setFormOpen(false); setEditing(null); toast.success('Material saved'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Material.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setFormOpen(false); setEditing(null); toast.success('Material updated'); },
  });

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || m.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.defaultCost = parseFloat(data.defaultCost) || 0;
    data.isActive = data.isActive === 'on';
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      data.lastPriceUpdate = new Date().toISOString().split('T')[0];
      createMutation.mutate(data);
    }
  };

  const handleUpdatePricing = async () => {
    setUpdating(true);
    setPricingStatus('updating');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an HVAC materials pricing expert. For each material below, provide an updated current US wholesale market price (2024-2025 pricing). Return a JSON object with material IDs as keys and updated prices as values (numbers only).

Materials to price:
${materials.slice(0, 50).map(m => `ID: ${m.id} - "${m.name}" (${m.category}, ${m.unit}) - Current: $${m.defaultCost}`).join('\n')}`,
        response_json_schema: {
          type: 'object',
          properties: { prices: { type: 'object', additionalProperties: { type: 'number' } } }
        },
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });

      if (res.prices) {
        const today = new Date().toISOString().split('T')[0];
        const updates = Object.entries(res.prices);
        for (const [matId, price] of updates) {
          if (price > 0) {
            await base44.entities.Material.update(matId, { defaultCost: price, lastPriceUpdate: today });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['materials'] });
        toast.success(`Updated pricing for ${updates.length} materials`);
        setPricingStatus('done');
        setTimeout(() => setPricingStatus(null), 5000);
      }
    } catch (err) {
      toast.error('Pricing update failed. Try again later.');
      setPricingStatus(null);
    }
    setUpdating(false);
  };

  return (
    <div>
      <PageHeader title="Materials" subtitle={`${materials.length} items in database`} actionLabel="Add Material" onAction={() => { setEditing(null); setFormOpen(true); }}>
        {pricingStatus === 'updating' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Updating market pricing...
          </span>
        )}
        {pricingStatus === 'done' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Pricing updated today
          </span>
        )}
        <Button variant="outline" size="sm" onClick={handleUpdatePricing} disabled={updating || pricingStatus === 'updating'} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Updating...' : 'Update Pricing'}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Package} title="No materials found" description="Add materials to your database." actionLabel="Add Material" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setEditing(m); setFormOpen(true); }}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{m.category}</TableCell>
                  <TableCell className="text-muted-foreground">{m.unit}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(m.defaultCost)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(m.lastPriceUpdate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Material' : 'New Material'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Name *</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select name="category" defaultValue={editing?.category || 'Equipment'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit *</Label>
                <Select name="unit" defaultValue={editing?.unit || 'Each'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Default Cost ($) *</Label><Input name="defaultCost" type="number" step="0.01" defaultValue={editing?.defaultCost} required /></div>
              <div><Label>SKU</Label><Input name="sku" defaultValue={editing?.sku} /></div>
            </div>
            <div><Label>Manufacturer</Label><Input name="manufacturer" defaultValue={editing?.manufacturer} /></div>
            <div><Label>Description</Label><Textarea name="description" defaultValue={editing?.description} rows={2} /></div>
            <div className="flex items-center gap-2">
              <Switch name="isActive" defaultChecked={editing?.isActive !== false} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">{editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}