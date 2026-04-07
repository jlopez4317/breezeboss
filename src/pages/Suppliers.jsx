import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Factory, Pencil, Trash2, Mail } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

const EMPTY_FORM = { supplierName: '', brandLine: '', contactName: '', phone: '', extension: '', email: '', address: '', city: '', state: '', zip: '', notes: '' };

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeForm(); toast.success('Supplier added'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeForm(); toast.success('Supplier updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier deleted'); },
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ supplierName: s.supplierName || '', brandLine: s.brandLine || '', contactName: s.contactName || '', phone: s.phone || '', extension: s.extension || '', email: s.email || '', address: s.address || '', city: s.city || '', state: s.state || '', zip: s.zip || '', notes: s.notes || '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    return `${s.supplierName} ${s.contactName} ${s.email}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`} actionLabel="Add Supplier" onAction={openAdd} icon={Factory} />

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Factory} title="No suppliers yet" description="Add your first supplier to get started." actionLabel="Add Supplier" onAction={openAdd} />
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead className="hidden md:table-cell">Brand / Line</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden xl:table-cell">Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{s.supplierName}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{s.brandLine || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{s.contactName || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {s.phone ? `${s.phone}${s.extension ? ` x${s.extension}` : ''}` : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className="text-secondary hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" />{s.email}
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                    {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Supplier Name *</Label>
                <Input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g., Wittichen Supply" required />
              </div>
              <div className="col-span-2">
                <Label>Brand / Equipment Line</Label>
                <Input value={form.brandLine} onChange={e => setForm(f => ({ ...f, brandLine: e.target.value }))} placeholder="e.g., Goodman, Daikin" />
              </div>
              <div className="col-span-2">
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="e.g., John Smith" />
              </div>
              <div>
                <Label>Phone</Label>
                <PhoneInput value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Extension</Label>
                <Input value={form.extension} onChange={e => setForm(f => ({ ...f, extension: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="col-span-2">
                <Label>Email Address</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@supplier.com" />
              </div>
              <div className="col-span-2">
                <Label>Street Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
              </div>
              <div className="col-span-2 grid grid-cols-5 gap-2">
                <div className="col-span-3">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
                </div>
                <div className="col-span-1">
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="FL" maxLength={2} />
                </div>
                <div className="col-span-1">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="12345" />
                </div>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any notes about this supplier..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {editing ? 'Save Changes' : 'Add Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}