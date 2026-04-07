import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Search, Eye } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate, formatCurrency, generateNumber } from '@/lib/utils';
import { toast } from 'sonner';

const JOB_TYPES = ['New Install', 'Replacement', 'Repair', 'Maintenance', 'Inspection', 'Bid Only', 'Labor Only'];
const JOB_STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Paid', 'Cancelled'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Emergency'];

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === 'true');
  const presetCustomerId = searchParams.get('customerId') || '';

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const jobNumber = await generateNumber('BB', base44.entities.Job, 'jobNumber');
      return base44.entities.Job.create({ ...data, jobNumber });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setFormOpen(false); toast.success('Job created'); },
  });

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  const filtered = jobs.filter(j => {
    const cust = customerMap[j.customerId];
    const custName = cust ? `${cust.firstName} ${cust.lastName}` : '';
    const matchSearch = !search || `${j.jobName} ${j.jobNumber} ${custName} ${j.jobType}`.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === '' && typeFilter === '' && !search) return false;
    const matchStatus = statusFilter === '' || statusFilter === 'all' || j.status === statusFilter;
    const matchType = typeFilter === '' || typeFilter === 'all' || j.jobType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.totalMaterialCost = 0;
    data.laborCost = parseFloat(data.laborCost) || 0;
    data.totalPrice = data.laborCost;
    createMutation.mutate(data);
  };

  return (
    <div>
      <PageHeader title="Jobs" subtitle={`${jobs.length} total`} actionLabel="Add Job" onAction={() => setFormOpen(true)} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { const v = val === 'reset-status' ? '' : val; setStatusFilter(v); }}>
          <SelectTrigger className="w-36">
            {statusFilter === '' ? <span className="text-muted-foreground">Status</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset-status">— Status —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(val) => { const v = val === 'reset-type' ? '' : val; setTypeFilter(v); }}>
          <SelectTrigger className="w-36">
            {typeFilter === '' ? <span className="text-muted-foreground">All Types</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset-type">— All Types —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && statusFilter === '' && typeFilter === '' && !search ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Use the search bar or select a Status / Type filter to view jobs.
        </div>
      ) : filtered.length === 0 && !isLoading ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No jobs match your search.</p>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(j => {
                const cust = customerMap[j.customerId];
                return (
                  <TableRow key={j.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">{j.jobNumber}</TableCell>
                    <TableCell>
                      <Link to={`/jobs/${j.id}`} className="font-medium hover:text-secondary transition-colors">{j.jobName}</Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {cust ? `${cust.firstName} ${cust.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{j.jobType}</TableCell>
                    <TableCell><StatusBadge status={j.status} /></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(j.scheduledDate)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(j.totalPrice)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${j.id}`)} className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Job</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Job Name *</Label><Input name="jobName" required /></div>
            <div>
              <Label>Customer *</Label>
              <Select name="customerId" defaultValue={presetCustomerId} required>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type *</Label>
                <Select name="jobType" defaultValue="Repair">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue="Normal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Scheduled Date</Label><Input name="scheduledDate" type="date" /></div>
              <div><Label>Assigned Tech</Label><Input name="assignedTech" /></div>
            </div>
            <div><Label>PO Number</Label><Input name="poNumber" /></div>
            <div><Label>Labor Cost ($)</Label><Input name="laborCost" type="number" step="0.01" defaultValue="0" /></div>
            <div><Label>Description</Label><Textarea name="description" rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Create Job</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}