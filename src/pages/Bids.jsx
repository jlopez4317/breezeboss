import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Search, TrendingUp, FileSearch, Copy, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LaborRatesPanel from '@/components/bids/LaborRatesPanel';
import BidPackageViewer from '@/components/bids/BidPackageViewer';
import EditBidModal from '@/components/bids/EditBidModal';
import { formatDate, formatCurrency, generateNumber } from '@/lib/utils';
import { useLiveBid } from '@/hooks/useLiveBid';
import { toast } from 'sonner';

const BID_STATUSES = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Cancelled', 'Expired'];

const defaultDate = (days = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function Bids() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { defaultTaxRate, defaultMarkup } = useSettings();
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const typeDocFilter = searchParams.get('doctype') || '';
  const setSearch = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('q', val); else n.delete('q'); return n; }, { replace: true });
  const setStatusFilter = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('status', val); else n.delete('status'); return n; }, { replace: true });
  const setTypeDocFilter = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('doctype', val); else n.delete('doctype'); return n; }, { replace: true });
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === 'true');
  const [laborRatesOpen, setLaborRatesOpen] = useState(false);
  const [previewBid, setPreviewBid] = useState(null);
  const presetJobId = searchParams.get('jobId') || '';

  // Edit bid modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [editBidMaterials, setEditBidMaterials] = useState([]);
  const [acceptedWarningOpen, setAcceptedWarningOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(presetJobId);
  const [materialSubtotal, setMaterialSubtotal] = useState('0');
  const [materialAutoFilled, setMaterialAutoFilled] = useState(false);
  const [materialOverridden, setMaterialOverridden] = useState(false);
  const [autoFilledJobName, setAutoFilledJobName] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate ?? 0));
  const [validUntil, setValidUntil] = useState(defaultDate(30));
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workIncluded, setWorkIncluded] = useState('');
  const [workExcluded, setWorkExcluded] = useState('');
  const [permitNotes, setPermitNotes] = useState('');
  const [equipmentWarranty, setEquipmentWarranty] = useState('');
  const [laborWarranty, setLaborWarranty] = useState('');
  const [depositPercent, setDepositPercent] = useState('30');
  const [progressPercent, setProgressPercent] = useState('0');
  const [balancePercent, setBalancePercent] = useState('30');
  const [progressMilestone, setProgressMilestone] = useState('');
  const [changeOrderHourly, setChangeOrderHourly] = useState('');
  const [changeOrderAfterHours, setChangeOrderAfterHours] = useState('');
  const [changeOrderMinCall, setChangeOrderMinCall] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [financingEnabled, setFinancingEnabled] = useState(false);
  const [financingProvider, setFinancingProvider] = useState('');
  const [financingFeePercent, setFinancingFeePercent] = useState('');

  const { data: bids = [], isLoading } = useQuery({ queryKey: ['bids'], queryFn: () => base44.entities.Bid.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const { data: financeVendors = [] } = useQuery({ queryKey: ['financeVendors'], queryFn: () => base44.entities.FinanceVendor.list('name', 100) });
  const { data: allJobMaterials = [] } = useQuery({ queryKey: ['jobMaterials'], queryFn: () => base44.entities.JobMaterial.list('-created_date', 2000) });
  const settingsData = settings[0] || {};

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  // Group all job materials by jobId for live total calculation
  const materialsByJob = useMemo(() => {
    const map = {};
    allJobMaterials.forEach(m => {
      if (!map[m.jobId]) map[m.jobId] = [];
      map[m.jobId].push(m);
    });
    return map;
  }, [allJobMaterials]);

  const getLiveTotal = (bid) => {
    const mats = materialsByJob[bid.jobId] || [];
    const liveSub = mats.reduce((sum, m) => sum + (m.totalCost || m.quantity * m.unitCost || 0), 0);
    const labor = bid.laborCost || 0;
    const taxAmount = liveSub * ((bid.taxRate || 0) / 100);
    const finFee = bid.financingFeeAmount || 0;
    return liveSub + labor + taxAmount + finFee;
  };

  // Auto-fill from settings when form opens
  useEffect(() => {
    if (formOpen) {
      setTaxRate(String(defaultTaxRate ?? 0));
      console.log('Tax rate auto-filled from settings:', defaultTaxRate);
      setLaborWarranty(settingsData.laborWarranty || '');
      setChangeOrderHourly(String(settingsData.defaultHourlyLaborRate || ''));
    }
  }, [formOpen, defaultTaxRate, settingsData]);



  // Auto-fill materials subtotal from selected job
  useEffect(() => {
    if (!selectedJobId) return;
    const job = jobMap[selectedJobId];
    base44.entities.JobMaterial.filter({ jobId: selectedJobId }).then(mats => {
      const validMats = mats.filter(m => (m.unitCost || 0) > 0);
      if (validMats.length > 0) {
        const rawTotal = validMats.reduce((s, m) => s + (m.totalCost || 0), 0);
        const markupMultiplier = 1 + ((defaultMarkup || 0) / 100);
        const markedUpTotal = rawTotal * markupMultiplier;
        setMaterialSubtotal(markedUpTotal.toFixed(2));
        setMaterialAutoFilled(true);
        setMaterialOverridden(false);
        setAutoFilledJobName(job?.jobName || '');
      } else {
        setMaterialSubtotal('0');
        setMaterialAutoFilled(false);
        setMaterialOverridden(false);
        setAutoFilledJobName('');
      }
    });
  }, [selectedJobId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const bidNumber = await generateNumber('BID', base44.entities.Bid, 'bidNumber');
      return base44.entities.Bid.create({ ...data, bidNumber, documentType, bidDate: new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bids'] }); setFormOpen(false); resetForm(); toast.success('Bid created'); },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Bid.update(id, data);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['bids'] }); 
      setPreviewBid(null); 
      setFormOpen(false); 
      resetForm(); 
      setEditingBid(null); 
      toast.success(`Bid ${editingBid?.bidNumber} updated ✓`); 
    },
  });

  const deleteBidMutation = useMutation({
    mutationFn: (id) => base44.entities.Bid.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast.success('Bid deleted.');
    },
    onError: () => toast.error('Failed to delete bid.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (bid) => {
      const bidNumber = await generateNumber('BID', base44.entities.Bid, 'bidNumber');
      const { id, bidDate, ...dataWithoutId } = bid;
      return base44.entities.Bid.create({ ...dataWithoutId, bidNumber, bidDate: new Date().toISOString().split('T')[0], status: 'Draft' });
    },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ['bids'] }); toast.success(`Bid duplicated as ${result.bidNumber} ✓`); },
  });

  const handleBidStatusChange = async (bid, newStatus) => {
    await base44.entities.Bid.update(bid.id, { status: newStatus });
    if (bid.jobId) {
      if (newStatus === 'Accepted') {
        await base44.entities.Job.update(bid.jobId, { status: 'In Progress' });
      } else if (newStatus === 'Declined' || newStatus === 'Cancelled') {
        await base44.entities.Job.update(bid.jobId, { status: 'Cancelled' });
      } else if (newStatus === 'Draft' || newStatus === 'Sent') {
        await base44.entities.Job.update(bid.jobId, { status: 'Lead' });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['bids'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    toast.success(`Bid updated to ${newStatus}`);
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, jobId }) => {
      await base44.entities.Bid.update(id, data);
      if (data.status === 'Accepted' && jobId) {
        await base44.entities.Job.update(jobId, { status: 'In Progress' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Bid updated');
    },
  });

  const resetForm = () => {
    setSelectedJobId(''); setMaterialSubtotal('0'); setMaterialAutoFilled(false); setMaterialOverridden(false); setAutoFilledJobName('');
    setLaborCost('0'); setTaxRate(String(defaultTaxRate ?? 0)); setValidUntil(defaultDate(30));
    setNotes(''); setTermsAndConditions(''); setProjectDescription(''); setWorkIncluded(''); setWorkExcluded('');
    setPermitNotes(''); setEquipmentWarranty(''); setLaborWarranty(settingsData.laborWarranty || '');
    setDepositPercent('30'); setProgressPercent('40'); setBalancePercent('30'); setProgressMilestone('');
    setChangeOrderHourly(String(settingsData.defaultHourlyLaborRate || '')); setChangeOrderAfterHours(''); setChangeOrderMinCall('');
    setDocumentType('');
    setFinancingProvider(''); setFinancingFeePercent('');
  };

  const openEditBid = async (bid) => {
    try {
      // Fetch the COMPLETE bid record with all fields (not just the summary from the list)
      const fullBid = await base44.entities.Bid.get(bid.id);
      const mats = await base44.entities.JobMaterial.filter({ jobId: fullBid.jobId });
      
      setEditBidMaterials(mats);
      setEditingBid(fullBid);
      
      if (fullBid.status === 'Accepted') {
        setAcceptedWarningOpen(true);
      } else {
        setEditModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to load bid:', error);
      toast.error('Could not load bid');
    }
  };

  const handleEditBidSaveSuccess = () => {
    setEditModalOpen(false);
    setEditingBid(null);
    setEditBidMaterials([]);
    queryClient.invalidateQueries({ queryKey: ['bids'] });
    if (previewBid && previewBid.id === editingBid.id) {
      queryClient.invalidateQueries({ queryKey: ['bidPreview'] });
      setPreviewBid(null);
    }
  };

  const filtered = bids.filter(b => {
    const cust = customerMap[b.customerId];
    const job = jobMap[b.jobId];
    const matchSearch = !search || `${b.bidNumber} ${cust?.firstName} ${cust?.lastName} ${job?.jobName}`.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === '' && typeDocFilter === '' && !search) return false;
    const matchStatus = statusFilter === '' || statusFilter === 'all' || b.status === statusFilter;
    const matchDocType = typeDocFilter === '' || typeDocFilter === 'all' || (b.documentType || 'Bid') === typeDocFilter;
    return matchSearch && matchStatus && matchDocType;
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate payment schedule percentages
    const deposit = parseFloat(depositPercent) || 0;
    const progress = parseFloat(progressPercent) || 0;
    const balance = parseFloat(balancePercent) || 0;
    const total = deposit + progress + balance;

    if (total !== 100) {
      alert(`Payment percentages must add up to 100%. Current total: ${total}%`);
      return;
    }

    const matSub = parseFloat(materialSubtotal) || 0;
    const labor = parseFloat(laborCost) || 0;
    const tax = parseFloat(taxRate) || 0;
    const taxAmount = matSub * (tax / 100);
    const preTaxBase = matSub + labor;
    const finFeeAmt = financingEnabled && parseFloat(financingFeePercent) > 0
      ? preTaxBase * (parseFloat(financingFeePercent) / 100)
      : 0;
    const totalAmount = matSub + labor + taxAmount + finFeeAmt;
    const job = jobMap[selectedJobId];
    const data = {
      jobId: selectedJobId, customerId: job?.customerId || '',
      materialSubtotal: matSub, laborCost: labor, taxRate: tax, taxAmount, totalAmount,
      markupPercent: defaultMarkup || 0,
      financingEnabled: financingEnabled,
      financingProvider: financingEnabled ? financingProvider : '',
      financingFeePercent: financingEnabled ? (parseFloat(financingFeePercent) || 0) : 0,
      financingFeeAmount: finFeeAmt,
      validUntil, notes, termsAndConditions,
      projectDescription, workIncluded, workExcluded, permitNotes, equipmentWarranty, laborWarranty,
      depositPercent: deposit, progressPercent: progress,
      balancePercent: balance, progressMilestone,
      changeOrderHourlyRate: parseFloat(changeOrderHourly) || 0,
      changeOrderAfterHoursRate: parseFloat(changeOrderAfterHours) || 0,
      changeOrderMinServiceCall: parseFloat(changeOrderMinCall) || 0,
    };

    createMutation.mutate(data);
  };

  const openPreview = async (bid) => {
    const mats = await base44.entities.JobMaterial.filter({ jobId: bid.jobId });
    setPreviewBid({ ...bid, _jobMaterials: mats });
  };

  // Handle ?edit=bidId URL param — navigated here from BidPackageViewer
  useEffect(() => {
    const editBidId = searchParams.get('edit');
    if (!editBidId || bids.length === 0) return;
    const bid = bids.find(b => b.id === editBidId);
    if (bid) {
      openEditBid(bid);
    }
  }, [searchParams, bids]);

  const handleSend = async (bid) => {
    await openPreview(bid);
    setTimeout(() => {
      setPreviewBid(prev => prev ? { ...prev, openEmailComposer: true } : null);
    }, 100);
  };

  return (
    <div>
      <PageHeader title="Bids" subtitle={`${bids.length} total`} actionLabel="Create Bid" onAction={() => { resetForm(); setFormOpen(true); }} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search bids..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === 'reset-status' ? '' : val); }}>
          <SelectTrigger className="w-36">
            {statusFilter === '' ? <span className="text-muted-foreground">Status</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset-status">— Status —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {BID_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeDocFilter} onValueChange={(val) => { setTypeDocFilter(val === 'reset' ? '' : val); }}>
          <SelectTrigger className="w-32">
            {typeDocFilter === '' ? <span className="text-muted-foreground">Type</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset">— Type —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Bid">Bid</SelectItem>
            <SelectItem value="Estimate">Estimate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && statusFilter === '' && typeDocFilter === '' && !search ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Use the search bar or select a Status filter to view bids.
        </p>
      ) : filtered.length === 0 && !isLoading ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No bids match your search.</p>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bid #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Job</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => {
                const cust = customerMap[b.customerId];
                const job = jobMap[b.jobId];
                return (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{b.bidNumber}</TableCell>
                    <TableCell>
                      {cust ? (
                        <button onClick={() => navigate(`/customers/${b.customerId}`)} className="text-secondary hover:underline font-medium text-left">
                          {cust.firstName} {cust.lastName}
                        </button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {job ? (
                        <button onClick={() => navigate(`/jobs/${b.jobId}`)} className="text-secondary hover:underline font-medium text-left">
                          {job.jobName}
                        </button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(b.bidDate)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(getLiveTotal(b))}</TableCell>
                    <TableCell>
                      <Select value={b.status} onValueChange={(newStatus) => handleBidStatusChange(b, newStatus)}>
                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BID_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{b.documentType || 'Bid'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openPreview(b)} className="gap-1 text-xs">
                          <FileSearch className="w-3 h-3" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditBid(b)} className="gap-1 text-xs">
                          ✏️ Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSend(b)} className="gap-1 text-xs">
                          Send
                        </Button>
                        {(b.status !== 'Accepted' && b.status !== 'Declined' && b.status !== 'Expired') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: b.id, data: { status: 'Accepted' }, jobId: b.jobId })}
                              className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                              title="Mark as Accepted"
                            >
                              ✓ Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMutation.mutate({ id: b.id, data: { status: 'Declined' }, jobId: b.jobId })}
                              className="gap-1 text-xs border-red-400 text-red-600 hover:bg-red-50"
                              title="Mark as Declined"
                            >
                              ✗ Decline
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                          title="Delete bid"
                          onClick={() => {
                            if (window.confirm(`Delete ${b.bidNumber}? This cannot be undone.`)) {
                              deleteBidMutation.mutate(b.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Accepted Bid Warning Dialog */}
      <Dialog open={acceptedWarningOpen} onOpenChange={setAcceptedWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>⚠️ Editing Accepted Bid</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This bid has been accepted. Editing it will change the terms the customer agreed to.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setAcceptedWarningOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              setAcceptedWarningOpen(false);
              const mats = await base44.entities.JobMaterial.filter({ jobId: editingBid.jobId });
              setEditBidMaterials(mats);
              setEditModalOpen(true);
            }} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Continue Editing</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Bid Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{documentType === 'Estimate' ? 'Create Estimate' : 'Create Bid'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <Label>Bid Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bid">Bid — for GCs, builders, commercial</SelectItem>
                  <SelectItem value="Estimate">Estimate — for homeowners</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Job *</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} required>
                <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent>{jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.jobNumber} — {j.jobName}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Pricing */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing</p>
              <div>
                 <Label>Materials Subtotal ($)</Label>
                 <Input type="number" step="1" min="0" value={materialSubtotal} onChange={e => { setMaterialSubtotal(e.target.value); if (materialAutoFilled) setMaterialOverridden(true); }} />
                 {materialAutoFilled && !materialOverridden && <p className="text-xs text-muted-foreground mt-1">Auto-filled from <span className="font-medium">{autoFilledJobName}</span> materials list</p>}
                 {(defaultMarkup > 0) && (
                   <p className="text-xs text-muted-foreground mt-1">
                     Includes {defaultMarkup}% markup on materials (set in Settings)
                   </p>
                 )}
                 {!materialAutoFilled && selectedJobId && <p className="text-xs text-amber-600 mt-1">No materials list found for this job — enter subtotal manually</p>}
                 {materialOverridden && <p className="text-xs text-amber-600 mt-1">⚠ You are overriding the auto-calculated materials subtotal.</p>}
               </div>
               <div>
                 <Label>Labor Cost ($)</Label>
                 <div className="flex gap-2">
                   <Input type="number" step="1" min="0" value={laborCost} onChange={e => setLaborCost(e.target.value)} className="flex-1" disabled={false} />
                   <Button type="button" variant="outline" size="sm" className="gap-1.5 whitespace-nowrap" onClick={() => setLaborRatesOpen(true)}>
                     <TrendingUp className="w-3.5 h-3.5" /> Market Rates
                   </Button>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3 items-end">
                 <div>
                   <div className="flex items-center justify-between">
                     <Label>Tax Rate (%)</Label>
                     <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-secondary hover:text-secondary/90" onClick={() => setTaxRate(String(defaultTaxRate ?? 0))}>
                       Use default
                     </Button>
                   </div>
                   <Input type="number" step="1" min="0" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                 </div>
                 <div>
                   <Label>Valid Until</Label>
                   <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                 </div>
               </div>
            </div>

            {/* Scope of Work */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope of Work</p>
              <div><Label>Project Description / Overview</Label><Textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)} rows={3} placeholder="Describe the project..." /></div>
              <div><Label>Work Included</Label><Textarea value={workIncluded} onChange={e => setWorkIncluded(e.target.value)} rows={3} placeholder="List what is included..." /></div>
              <div><Label>Work NOT Included / Exclusions</Label><Textarea value={workExcluded} onChange={e => setWorkExcluded(e.target.value)} rows={2} placeholder="List exclusions..." /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Permit Notes</Label><Input value={permitNotes} onChange={e => setPermitNotes(e.target.value)} placeholder="e.g., Permit by contractor" /></div>
                <div><Label>Equipment Warranty</Label><Input value={equipmentWarranty} onChange={e => setEquipmentWarranty(e.target.value)} placeholder="e.g., 10 Yr Parts & Compressor" /></div>
                <div className="md:col-span-2"><Label>Labor Warranty</Label><Input value={laborWarranty} onChange={e => setLaborWarranty(e.target.value)} placeholder="e.g., 1 Year" /></div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Deposit (%)</Label><Input type="number" step="1" min="0" value={depositPercent} onChange={e => setDepositPercent(e.target.value)} /></div>
                <div><Label>Progress (%)</Label><Input type="number" step="1" min="0" value={progressPercent} onChange={e => setProgressPercent(e.target.value)} /></div>
                <div><Label>Balance (%)</Label><Input type="number" step="1" min="0" value={balancePercent} onChange={e => setBalancePercent(e.target.value)} /></div>
              </div>
              <div className={`text-sm font-medium ${(() => { const t = (parseFloat(depositPercent) || 0) + (parseFloat(progressPercent) || 0) + (parseFloat(balancePercent) || 0); return t === 100 ? 'text-emerald-600' : 'text-amber-600'; })()}`}>
                Total: {(parseFloat(depositPercent) || 0) + (parseFloat(progressPercent) || 0) + (parseFloat(balancePercent) || 0)}% {((parseFloat(depositPercent) || 0) + (parseFloat(progressPercent) || 0) + (parseFloat(balancePercent) || 0)) === 100 ? '✓' : '— must equal 100%'}
              </div>
              <div><Label>Progress Milestone (e.g., "equipment delivery")</Label><Input value={progressMilestone} onChange={e => setProgressMilestone(e.target.value)} /></div>
            </div>

            {/* Change Order Rates */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change Order Rates</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Standard Hourly ($)</Label><Input type="number" step="1" min="0" value={changeOrderHourly} onChange={e => setChangeOrderHourly(e.target.value)} /></div>
                <div><Label>After-Hours ($)</Label><Input type="number" step="1" min="0" value={changeOrderAfterHours} onChange={e => setChangeOrderAfterHours(e.target.value)} /></div>
                <div><Label>Min. Service Call ($)</Label><Input type="number" step="1" min="0" value={changeOrderMinCall} onChange={e => setChangeOrderMinCall(e.target.value)} /></div>
              </div>
            </div>

            {/* Financing Option */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="financingEnabled"
                  checked={financingEnabled}
                  onChange={e => {
                    setFinancingEnabled(e.target.checked);
                    if (!e.target.checked) { setFinancingProvider(''); setFinancingFeePercent(''); }
                  }}
                  className="w-4 h-4 accent-[#2E9CCA]"
                />
                <label htmlFor="financingEnabled" className="text-sm font-semibold text-[#1E3A5F] cursor-pointer">
                  Customer is using financing
                </label>
              </div>
              {financingEnabled && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label className="text-xs">Financing Vendor</Label>
                    {financeVendors.length > 0 ? (
                      <Select
                        value={financingProvider}
                        onValueChange={(val) => {
                          setFinancingProvider(val);
                          const vendor = financeVendors.find(v => v.name === val);
                          if (vendor) setFinancingFeePercent(String(vendor.feePercent));
                        }}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select financing vendor..." /></SelectTrigger>
                        <SelectContent>
                          {financeVendors.map((v, i) => (
                            <SelectItem key={i} value={v.name}>{v.name} ({v.feePercent}% fee)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                        No finance vendors saved. Go to Settings → Company to add your financing providers.
                      </div>
                    )}
                  </div>
                  {financingFeePercent && parseFloat(financingFeePercent) > 0 && (
                    <p className="text-xs text-[#2E9CCA] font-medium">
                      {financingFeePercent}% financing fee will be added to the total (pre-tax)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <div><Label>Terms & Conditions</Label><Textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} rows={2} /></div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : documentType === 'Estimate' ? 'Create Estimate' : 'Create Bid'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <LaborRatesPanel open={laborRatesOpen} onClose={() => setLaborRatesOpen(false)} />

      {editingBid && (
        <EditBidModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          bid={editingBid}
          jobMaterials={editBidMaterials}
          onSaveSuccess={handleEditBidSaveSuccess}
          defaultSettings={settingsData}
        />
      )}

      {previewBid && (
        <BidPackageViewer
          open={!!previewBid}
          onClose={() => setPreviewBid(null)}
          bid={previewBid}
          job={jobMap[previewBid.jobId]}
          customer={customerMap[previewBid.customerId]}
          settings={settingsData}
          jobMaterials={previewBid._jobMaterials || []}
          onEdit={openEditBid}
        />
      )}
    </div>
  );
}