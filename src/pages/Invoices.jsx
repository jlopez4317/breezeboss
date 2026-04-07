import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import InvoiceCreateForm from '@/components/invoices/InvoiceCreateForm';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { formatDate, formatCurrency, generateNumber } from '@/lib/utils';
import { toast } from 'sonner';

const STATUSES = ['Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Void'];

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const setSearch = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('q', val); else n.delete('q'); return n; }, { replace: true });
  const setStatusFilter = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('status', val); else n.delete('status'); return n; }, { replace: true });
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === 'true');
  const [viewerInvoice, setViewerInvoice] = useState(null);
  const [viewerMaterials, setViewerMaterials] = useState([]);
  const [voidInvoice, setVoidInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidNotes, setVoidNotes] = useState('');
  const presetJobId = searchParams.get('jobId') || '';

  const VOID_REASONS = [
    'Duplicate Invoice',
    'Created in Error',
    'Pricing Error',
    'Job Cancelled',
    'Customer Request',
    'Replaced by New Invoice',
    'Billing Dispute',
    'Work Not Completed',
    'Other'
  ];

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });

  const settingsData = settings[0] || {};
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  // Auto-mark overdue invoices on load
  useEffect(() => {
    if (!invoices.length) return;
    const today = new Date().toISOString().split('T')[0];
    const toMark = invoices.filter(i =>
      i.dueDate && i.dueDate < today &&
      !['Paid', 'Void', 'Overdue'].includes(i.status)
    );
    toMark.forEach(i => {
      base44.entities.Invoice.update(i.id, { status: 'Overdue' });
    });
    if (toMark.length > 0) queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }, [invoices.length]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const invoiceNumber = await generateNumber('INV', base44.entities.Invoice, 'invoiceNumber');
      return base44.entities.Invoice.create({ ...data, invoiceNumber, invoiceDate: new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setFormOpen(false); toast.success('Invoice created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const handleStatusUpdate = async (id, data) => {
    await base44.entities.Invoice.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    // Refresh viewer if open
    if (viewerInvoice?.id === id) setViewerInvoice(prev => ({ ...prev, ...data }));
  };



  // Sort: overdue first, then by created date
  const filtered = invoices
    .filter(i => {
      const cust = customerMap[i.customerId];
      const matchSearch = !search || `${i.invoiceNumber} ${cust?.firstName} ${cust?.lastName}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' ? true : statusFilter === '' ? false : i.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
      if (b.status === 'Overdue' && a.status !== 'Overdue') return 1;
      return 0;
    });

  const outstanding = invoices.filter(i => !['Paid', 'Void'].includes(i.status)).reduce((s, i) => s + (i.balanceDue || 0), 0);
  const paidThisMonth = invoices.filter(i => i.status === 'Paid' && i.paymentDate?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, i) => s + (i.totalAmount || 0), 0);

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} total`} actionLabel="Create Invoice" onAction={() => setFormOpen(true)} />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(outstanding)}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Paid This Month</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(paidThisMonth)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => { setStatusFilter(val === 'reset' ? '' : val); }}
        >
          <SelectTrigger className="w-36">
            {statusFilter === ''
              ? <span className="text-muted-foreground">Status</span>
              : <SelectValue />
            }
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset">— Status —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        statusFilter === '' ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Select a status above to view invoices.
          </div>
        ) : (
          <EmptyState icon={Receipt} title="No invoices found" description="Create your first invoice." actionLabel="Create Invoice" onAction={() => setFormOpen(true)} />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(inv => {
            const cust = customerMap[inv.customerId];
            const isOverdue = inv.status === 'Overdue';
            return (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className={`bg-card rounded-lg border shadow-sm px-4 py-3 cursor-pointer hover:shadow-md hover:border-secondary/50 transition-all flex items-center justify-between gap-4 ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}
              >
                {/* Left: Invoice # + Customer */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</p>
                  <p className="font-semibold text-sm text-foreground truncate">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invoice: {formatDate(inv.invoiceDate)}
                    {inv.dueDate && <span className={`ml-3 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>Due: {formatDate(inv.dueDate)}</span>}
                  </p>
                  {inv.status === 'Void' && inv.voidReason && (
                    <p className="text-xs text-muted-foreground mt-1">Voided: {inv.voidReason}</p>
                  )}
                </div>

                {/* Right: Amount + Balance + Status + Actions */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-base">{formatCurrency(inv.totalAmount)}</p>
                    {inv.balanceDue > 0 && <p className="text-xs text-muted-foreground">Bal: {formatCurrency(inv.balanceDue)}</p>}
                  </div>
                  <StatusBadge status={inv.status} />
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>

                    {inv.status !== 'Paid' && inv.status !== 'Void' && (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({
                        id: inv.id,
                        data: { status: 'Paid', amountPaid: inv.totalAmount, balanceDue: 0, paymentDate: new Date().toISOString().split('T')[0] }
                      })}>Paid</Button>
                    )}
                    {inv.status === 'Void' && (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({
                        id: inv.id,
                        data: { status: 'Draft' }
                      })} className="text-muted-foreground">Restore</Button>
                    )}
                    {inv.status !== 'Void' && (
                      <Button size="sm" variant="outline" onClick={() => setVoidInvoice(inv)} className="text-amber-600 hover:text-amber-600">Void</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InvoiceCreateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        jobs={jobs}
        jobMap={jobMap}
        settings={settingsData}
        presetJobId={presetJobId}
      />

      {viewerInvoice && (
        <InvoiceViewer
          open={!!viewerInvoice}
          onClose={() => setViewerInvoice(null)}
          invoice={viewerInvoice}
          job={jobMap[viewerInvoice.jobId]}
          customer={customerMap[viewerInvoice.customerId]}
          settings={settingsData}
          jobMaterials={viewerMaterials}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      <AlertDialog open={!!voidInvoice} onOpenChange={(open) => {
        if (!open) { setVoidInvoice(null); setVoidReason(''); setVoidNotes(''); }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice {voidInvoice?.invoiceNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              This invoice will be excluded from all financial calculations but kept on record. A reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Void Reason *</label>
              <Select value={voidReason} onValueChange={setVoidReason}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  {VOID_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {voidReason && (
              <div>
                <label className="text-sm font-medium">Additional Notes {voidReason === 'Other' && '*'}</label>
                <textarea
                  value={voidNotes}
                  onChange={(e) => setVoidNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="mt-1.5 w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!voidReason || (voidReason === 'Other' && !voidNotes)}
              onClick={() => {
                updateMutation.mutate({
                  id: voidInvoice.id,
                  data: {
                    status: 'Void',
                    voidReason,
                    voidNotes,
                    voidedAt: new Date().toISOString(),
                    voidedBy: 'User'
                  }
                });
                setVoidReason('');
                setVoidNotes('');
              }}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Void Invoice
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}