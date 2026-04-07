import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Package, FileText, Receipt, Plus, ScanLine, Mail, Pencil, Copy, FileSearch } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import EditableMaterialRow from '@/components/jobs/EditableMaterialRow';
import EditableLaborCard from '@/components/jobs/EditableLaborCard';
import EmailSupplierModal from '@/components/jobs/EmailSupplierModal';
import BidPackageViewer from '@/components/bids/BidPackageViewer';
import { formatDate, formatCurrency, getPriorityColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const JOB_STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Paid', 'Cancelled'];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [emailSupplierOpen, setEmailSupplierOpen] = useState(false);
  const [previewBid, setPreviewBid] = useState(null);
  const [voidInvoice, setVoidInvoice] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidNotes, setVoidNotes] = useState('');

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

  const { data: job } = useQuery({ queryKey: ['job', id], queryFn: () => base44.entities.Job.list().then(all => all.find(j => j.id === id)) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const { data: jobMaterials = [] } = useQuery({ queryKey: ['jobMaterials', id], queryFn: () => base44.entities.JobMaterial.filter({ jobId: id }, '-created_date', 200) });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => base44.entities.Material.list('-name', 500) });
  const { data: bids = [] } = useQuery({ queryKey: ['bids'], queryFn: () => base44.entities.Bid.list('-created_date', 100) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 100) });

  const updateJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job', id] }); queryClient.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job updated'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: invoiceId, data }) => base44.entities.Invoice.update(invoiceId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const addMaterialMutation = useMutation({
    mutationFn: (mat) => base44.entities.JobMaterial.create({
      jobId: id, materialId: mat.id, materialName: mat.name, category: mat.category,
      quantity: 1, unit: mat.unit, unitCost: mat.defaultCost, totalCost: mat.defaultCost, markup: 0, addedBy: 'Manual'
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobMaterials', id] }); setAddMaterialOpen(false); toast.success('Material added'); recalcTotals(); },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (matId) => base44.entities.JobMaterial.delete(matId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobMaterials', id] }); recalcTotals(); },
  });

  const updateBidStatusMutation = useMutation({
    mutationFn: async ({ bidId, newStatus, jobId }) => {
      await base44.entities.Bid.update(bidId, { status: newStatus });
      if (newStatus === 'Accepted') {
        await base44.entities.Job.update(jobId, { status: 'In Progress' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Bid status updated!');
    },
    onError: () => toast.error('Failed to update bid status'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (bid) => {
      // Create a simple sequential number since we can't easily import generateNumber here
      const allBids = await base44.entities.Bid.list('-created_date', 1000);
      const numbers = allBids.map(b => parseInt(b.bidNumber?.split('-')[2] || '0')).sort((a, b) => b - a);
      const nextNum = (numbers[0] || 0) + 1;
      const currentYear = new Date().getFullYear();
      const bidNumber = `BID-${currentYear}-${String(nextNum).padStart(4, '0')}`;
      const { id: bidId, bidDate, ...dataWithoutId } = bid;
      return base44.entities.Bid.create({ ...dataWithoutId, bidNumber, bidDate: new Date().toISOString().split('T')[0], status: 'Draft' });
    },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ['bids'] }); toast.success(`Bid duplicated as ${result.bidNumber} ✓`); },
  });

  const recalcTotals = async () => {
    const mats = await base44.entities.JobMaterial.filter({ jobId: id });
    const totalMaterialCost = mats.reduce((s, m) => s + (m.totalCost || 0), 0);
    const totalPrice = totalMaterialCost + (job?.laborCost || 0);
    updateJobMutation.mutate({ totalMaterialCost, totalPrice });
  };

  const handleLaborCostChange = async (newLaborCost) => {
    // Update job
    const mats = await base44.entities.JobMaterial.filter({ jobId: id });
    const totalMaterialCost = mats.reduce((s, m) => s + (m.totalCost || 0), 0);
    const totalPrice = totalMaterialCost + newLaborCost;
    updateJobMutation.mutate({ laborCost: newLaborCost, totalPrice });

    // Update open bids (Draft or Sent status)
    const openBids = jobBids.filter(b => ['Draft', 'Sent'].includes(b.status));
    for (const bid of openBids) {
      const matSub = parseFloat(bid.materialSubtotal || 0);
      const taxRate = parseFloat(bid.taxRate || 0);
      const taxAmount = taxRate === 0 ? 0 : matSub * (taxRate / 100);
      const totalAmount = matSub + newLaborCost + taxAmount;
      await base44.entities.Bid.update(bid.id, { laborCost: newLaborCost, taxAmount, totalAmount });
    }

    // Update Draft or Sent invoices
    const openInvoices = jobInvoices.filter(i => ['Draft', 'Sent'].includes(i.status));
    for (const inv of openInvoices) {
      const matSub = parseFloat(inv.materialSubtotal || 0);
      const taxRate = parseFloat(inv.taxRate || 0);
      const taxAmount = taxRate === 0 ? 0 : matSub * (taxRate / 100);
      const totalAmount = matSub + newLaborCost + taxAmount;
      const balanceDue = totalAmount - (inv.amountPaid || 0);
      await base44.entities.Invoice.update(inv.id, { laborCost: newLaborCost, taxAmount, totalAmount, balanceDue });
    }

    queryClient.invalidateQueries({ queryKey: ['bids'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  if (!job) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>;

  const customer = customers.find(c => c.id === job.customerId);
  const settingsData = settings[0] || {};

  const openBidPreview = async (bid) => {
    const mats = await base44.entities.JobMaterial.filter({ jobId: bid.jobId });
    setPreviewBid({ ...bid, _jobMaterials: mats });
  };
  const jobBids = bids.filter(b => b.jobId === id);
  const jobInvoices = invoices.filter(i => i.jobId === id);
  const filteredMaterials = materials.filter(m => m.isActive !== false && (!materialSearch || m.name.toLowerCase().includes(materialSearch.toLowerCase())));
  const materialTotal = jobMaterials.reduce((s, m) => s + (m.totalCost || 0), 0);

  // Compute live bid total using current job materials (same logic as bid preview)
  const liveBidTotal = (bid) => {
    const matSub = materialTotal;
    const tax = matSub * ((bid.taxRate || 0) / 100);
    return matSub + (bid.laborCost || 0) + tax;
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="mb-4 gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">{job.jobNumber}</span>
            <h1 className="text-2xl font-bold">{job.jobName}</h1>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
              <div className="priority-badge">
                <Badge className={`${getPriorityColor(customer?.priority || 'Normal')}`}>{customer?.priority || 'Normal'}</Badge>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Job Type</span>
              <span className="text-sm font-medium">{job.jobType}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={job.status} onValueChange={async (newJobStatus) => {
              updateJobMutation.mutate({ status: newJobStatus });
              if (jobBids && jobBids.length > 0) {
                if (newJobStatus === 'Cancelled') {
                  for (const bid of jobBids) {
                    if (bid.status !== 'Declined' && bid.status !== 'Cancelled') {
                      await base44.entities.Bid.update(bid.id, { status: 'Cancelled' });
                    }
                  }
                  queryClient.invalidateQueries({ queryKey: ['bids'] });
                  toast.info('All active bids marked as Cancelled.');
                } else if (newJobStatus === 'In Progress') {
                  for (const bid of jobBids) {
                    if (['Draft', 'Sent', 'Viewed'].includes(bid.status)) {
                      await base44.entities.Bid.update(bid.id, { status: 'Accepted' });
                    }
                  }
                  queryClient.invalidateQueries({ queryKey: ['bids'] });
                } else if (newJobStatus === 'Lead') {
                  for (const bid of jobBids) {
                    if (bid.status === 'Cancelled') {
                      await base44.entities.Bid.update(bid.id, { status: 'Draft' });
                    }
                  }
                  queryClient.invalidateQueries({ queryKey: ['bids'] });
                }
              }
            }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Customer</p>
          {customer ? (
            <Link to={`/customers/${customer.id}`} className="text-sm font-medium hover:text-secondary">{customer.firstName} {customer.lastName}</Link>
          ) : <p className="text-sm">—</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="text-sm font-medium">{formatDate(job.scheduledDate)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Assigned Tech</p>
          <p className="text-sm font-medium">{job.assignedTech || '—'}</p>
        </Card>
        <Card className="border rounded-lg">
          <EditableLaborCard
            laborCost={job.laborCost}
            jobStatus={job.status}
            onSave={handleLaborCostChange}
          />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-lg font-bold text-secondary">{formatCurrency(job.totalPrice)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="materials">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="materials" className="gap-1"><Package className="w-3.5 h-3.5" /> Materials</TabsTrigger>
          <TabsTrigger value="bids" className="gap-1"><FileText className="w-3.5 h-3.5" /> Bids ({jobBids.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1"><Receipt className="w-3.5 h-3.5" /> Invoices ({jobInvoices.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Materials List</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEmailSupplierOpen(true)} className="gap-1.5" disabled={jobMaterials.length === 0}>
                    <Mail className="w-3.5 h-3.5" /> Email to Supplier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/blueprint-scanner')} className="gap-1.5">
                    <ScanLine className="w-3.5 h-3.5" /> From Blueprint
                  </Button>
                  <Button size="sm" onClick={() => setAddMaterialOpen(true)} className="gap-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {jobMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No materials added yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobMaterials.map(jm => (
                          <EditableMaterialRow
                            key={jm.id}
                            jm={jm}
                            jobId={id}
                            onDelete={(matId) => deleteMaterialMutation.mutate(matId)}
                            onSaved={recalcTotals}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end mt-4 text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Materials: {formatCurrency(materialTotal)}</p>
                      <p className="text-sm text-muted-foreground">Labor: {formatCurrency(job.laborCost)}</p>
                      <p className="text-lg font-bold mt-1">Total: {formatCurrency(materialTotal + (job.laborCost || 0))}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids">
          <Card className="p-6">
            {jobBids.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No bids created for this job.</p>
                <Button onClick={() => navigate(`/bids?new=true&jobId=${id}`)} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
                  <Plus className="w-4 h-4" /> Create Bid
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobBids.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div onClick={() => openBidPreview(b)} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{b.bidNumber}</span>
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">{b.documentType || 'Bid'}</span>
                      </div>
                      <p className="text-sm font-medium">{formatDate(b.bidDate)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-2 flex-wrap">
                      <span className="font-semibold text-right">{formatCurrency(liveBidTotal(b))}</span>
                      <Select value={b.status} onValueChange={(newStatus) => updateBidStatusMutation.mutate({ bidId: b.id, newStatus, jobId: id })}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Cancelled', 'Expired'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {b.status === 'Accepted' && (
                        <span className="text-green-600 text-xs font-semibold">✓ Accepted</span>
                      )}
                      {(b.status !== 'Accepted' && b.status !== 'Declined' && b.status !== 'Expired') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateBidStatusMutation.mutate({ bidId: b.id, newStatus: 'Accepted', jobId: id })}
                            className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                            title="Mark as Accepted"
                          >
                            ✓ Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBidStatusMutation.mutate({ bidId: b.id, newStatus: 'Declined', jobId: id })}
                            className="gap-1 text-xs border-red-400 text-red-600 hover:bg-red-50"
                            title="Mark as Declined"
                          >
                            ✗ Decline
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openBidPreview(b)} className="gap-1 text-xs" title="Preview Bid">
                        <FileSearch className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/bids?edit=${b.id}`)} className="gap-1 text-xs" title="Edit Bid">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openBidPreview(b)} className="gap-1 text-xs" title="Send Bid">
                        Send
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="p-6">
            {jobInvoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No invoices created for this job.</p>
                <Button onClick={() => navigate(`/invoices?new=true&jobId=${id}`)} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
                  <Plus className="w-4 h-4" /> Create Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors shadow-sm">
                    <Link to={`/invoices/${inv.id}`} className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                        <p className="text-sm font-medium">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(inv.totalAmount)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </Link>
                    {inv.status !== 'Void' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); setVoidInvoice(inv); }}
                        className="text-amber-600 hover:text-amber-600 hover:bg-amber-100 ml-1 text-xs"
                      >
                        Void
                      </Button>
                    )}
                    {inv.status === 'Void' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); updateMutation.mutate({ id: inv.id, data: { status: 'Draft' } }); }}
                          className="text-muted-foreground hover:text-foreground ml-1 text-xs"
                        >
                          Restore
                        </Button>
                        {inv.voidReason && (
                          <span className="text-xs text-muted-foreground ml-2">({inv.voidReason})</span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <p className="text-sm whitespace-pre-wrap">{job.description || job.notes || 'No notes.'}</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Material Dialog */}
      <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <Input placeholder="Search materials..." value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} className="mb-3" />
          <div className="overflow-y-auto max-h-[400px] space-y-1">
            {filteredMaterials.map(m => (
              <button key={m.id} onClick={() => addMaterialMutation.mutate(m)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.category} · {m.unit}</p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(m.defaultCost)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <EmailSupplierModal
        open={emailSupplierOpen}
        onClose={() => setEmailSupplierOpen(false)}
        job={job}
        jobMaterials={jobMaterials}
      />

      {previewBid && (
        <BidPackageViewer
          open={!!previewBid}
          onClose={() => setPreviewBid(null)}
          bid={previewBid}
          job={job}
          customer={customer}
          settings={settingsData}
          jobMaterials={previewBid._jobMaterials || []}
          onEdit={(bid) => { setPreviewBid(null); navigate(`/bids?edit=${bid.id}`); }}
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
                setVoidInvoice(null);
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