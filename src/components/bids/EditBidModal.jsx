import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Star, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ── Equipment tier card ────────────────────────────────────────────────────────
function TierCard({ label, recommended, equipment, allEquipment, onSelect, laborCost, taxRate }) {
  const [open, setOpen] = useState(false);

  const equipPrice = equipment?.defaultCost ?? 0;
  const labor = parseFloat(laborCost) || 0;
  const tax = parseFloat(taxRate) || 0;
  const taxAmount = (equipPrice + labor) * (tax / 100);
  const total = equipPrice + labor + taxAmount;

  return (
    <div
      className={`rounded-xl border-2 p-4 space-y-3 ${
        recommended ? 'border-amber-400 bg-amber-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm uppercase tracking-wide text-[#071a35]">{label}</span>
        {recommended && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Recommended
          </span>
        )}
      </div>

      {/* Dropdown trigger + list */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
        >
          <span className={equipment ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {equipment ? equipment.name : 'Select equipment...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto max-h-64">
              {/* Clear option — only shown when something is selected */}
              {equipment && (
                <button
                  type="button"
                  onClick={() => { onSelect(null); setOpen(false); }}
                  className="w-full flex items-center px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 border-b border-gray-100 transition-colors"
                >
                  — Clear selection —
                </button>
              )}
              {allEquipment.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No equipment found</div>
              )}
              {allEquipment.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-sky-50 transition-colors text-left ${
                    equipment?.id === item.id ? 'bg-sky-50 font-semibold' : ''
                  }`}
                >
                  <span className="text-gray-900 pr-4">{item.name}</span>
                  <span className="text-gray-600 whitespace-nowrap font-medium">{formatCurrency(item.defaultCost)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Auto-calculated breakdown — only shown after selection */}
      {equipment && (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Equipment</span>
            <span>{formatCurrency(equipPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Labor</span>
            <span>{formatCurrency(labor)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax ({tax}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-[#071a35] border-t border-gray-200 pt-1.5 mt-1">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EditBidModal ──────────────────────────────────────────────────────────
export default function EditBidModal({ isOpen, onClose, bid, jobMaterials, onSaveSuccess, defaultSettings }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Top-level toggles
  const [estimateType, setEstimateType] = useState('standard');
  const [documentType, setDocumentType] = useState('Estimate');

  // Shared pricing
  const [laborCost, setLaborCost] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [validUntil, setValidUntil] = useState('');

  // Tier equipment — always an object with all three keys so state is never undefined
  const [tierEquipment, setTierEquipment] = useState({ good: null, better: null, best: null });

  // Scope of work
  const [projectDescription, setProjectDescription] = useState('');
  const [workIncluded, setWorkIncluded] = useState('');
  const [workExclusions, setWorkExclusions] = useState('');
  const [permitNotes, setPermitNotes] = useState('');
  const [equipmentWarranty, setEquipmentWarranty] = useState('');
  const [laborWarranty, setLaborWarranty] = useState('');

  // Payment schedule
  const [depositPercent, setDepositPercent] = useState('30');
  const [progressPercent, setProgressPercent] = useState('40');
  const [balancePercent, setBalancePercent] = useState('30');
  const [progressMilestone, setProgressMilestone] = useState('');

  // Change order rates
  const [standardRate, setStandardRate] = useState('');
  const [afterHoursRate, setAfterHoursRate] = useState('');
  const [minServiceCall, setMinServiceCall] = useState('');

  // Financing
  const [financingEnabled, setFinancingEnabled] = useState(false);
  const [financingProvider, setFinancingProvider] = useState('');
  const [financingFeePercent, setFinancingFeePercent] = useState('');

  // Equipment list — fetched once when modal opens
  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment-materials'],
    queryFn: async () => {
      const items = await base44.entities.Material.filter({ category: 'Equipment' });
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Finance vendors
  const { data: financeVendors = [] } = useQuery({
    queryKey: ['financeVendors'],
    queryFn: () => base44.entities.FinanceVendor.list('name', 100),
  });

  // Pre-populate all scalar fields when the modal opens
  useEffect(() => {
    if (!isOpen || !bid) return;
    setEstimateType(bid.estimateType || 'standard');
    setDocumentType(bid.documentType || 'Estimate');
    setLaborCost(String(bid.laborCost ?? 0));
    setTaxRate(String(bid.taxRate ?? 0));
    setValidUntil(bid.validUntil || '');
    setProjectDescription(bid.projectDescription || '');
    setWorkIncluded(bid.workIncluded || '');
    setWorkExclusions(bid.workExcluded || '');
    setPermitNotes(bid.permitNotes || '');
    setEquipmentWarranty(bid.equipmentWarranty || '');
    setLaborWarranty(bid.laborWarranty || '');
    setDepositPercent(String(bid.depositPercent ?? 30));
    setProgressPercent(String(bid.progressPercent ?? 40));
    setBalancePercent(String(bid.balancePercent ?? 30));
    setProgressMilestone(bid.progressMilestone || '');
    setStandardRate(String(bid.changeOrderHourlyRate || ''));
    setAfterHoursRate(String(bid.changeOrderAfterHoursRate || ''));
    setMinServiceCall(String(bid.changeOrderMinServiceCall || ''));
    setFinancingEnabled(bid.financingEnabled || false);
    setFinancingProvider(bid.financingProvider || '');
    setFinancingFeePercent(String(bid.financingFeePercent || ''));
    setSaveError(null);
  }, [isOpen, bid]);

  // Pre-select tier equipment once allEquipment is loaded
  useEffect(() => {
    if (!isOpen || !bid || allEquipment.length === 0) return;
    const saved = bid.tiers || {};
    setTierEquipment({
      good:   allEquipment.find(e => e.id === saved?.good?.equipmentId)   ?? null,
      better: allEquipment.find(e => e.id === saved?.better?.equipmentId) ?? null,
      best:   allEquipment.find(e => e.id === saved?.best?.equipmentId)   ?? null,
    });
  }, [isOpen, bid, allEquipment]);

  const setTierItem = (tier, item) => {
    // Always write back a full object — never delete a key
    setTierEquipment(prev => ({ ...prev, [tier]: item ?? null }));
  };

  const buildTierData = (key) => {
    const item = tierEquipment[key];
    if (!item) return null;
    const labor = parseFloat(laborCost) || 0;
    const tax = parseFloat(taxRate) || 0;
    const taxAmt = (item.defaultCost + labor) * (tax / 100);
    return {
      equipmentId:    item.id,
      equipmentName:  item.name,
      equipmentPrice: item.defaultCost,
      subtotal:       item.defaultCost,
      labor,
      tax:            taxAmt,
      total:          item.defaultCost + labor + taxAmt,
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const labor = parseFloat(laborCost) || 0;
      const tax   = parseFloat(taxRate)   || 0;

      // Standard mode uses job materials; tiered mode doesn't aggregate a single subtotal
      const materialSub = estimateType === 'standard'
        ? (jobMaterials || []).reduce((sum, m) => sum + (m.totalCost || 0), 0)
        : 0;

      const taxAmount  = materialSub * (tax / 100);
      const preTaxBase = materialSub + labor;
      const finFeeAmt  = financingEnabled && parseFloat(financingFeePercent) > 0
        ? preTaxBase * (parseFloat(financingFeePercent) / 100)
        : 0;
      const totalAmount = materialSub + labor + taxAmount + finFeeAmt;

      const tiersData = estimateType === 'tiered'
        ? { good: buildTierData('good'), better: buildTierData('better'), best: buildTierData('best') }
        : null;

      await base44.entities.Bid.update(bid.id, {
        documentType,
        estimateType,
        tiers:            tiersData,
        materialSubtotal: materialSub,
        laborCost:        labor,
        taxRate:          tax,
        taxAmount,
        totalAmount,
        validUntil:       validUntil || null,
        projectDescription:   projectDescription  || '',
        workIncluded:         workIncluded        || '',
        workExcluded:         workExclusions      || '',
        permitNotes:          permitNotes         || '',
        equipmentWarranty:    equipmentWarranty   || '',
        laborWarranty:        laborWarranty       || '',
        depositPercent:       parseFloat(depositPercent)  || 0,
        progressPercent:      parseFloat(progressPercent) || 0,
        balancePercent:       parseFloat(balancePercent)  || 0,
        progressMilestone:    progressMilestone   || '',
        changeOrderHourlyRate:      parseFloat(standardRate)    || 0,
        changeOrderAfterHoursRate:  parseFloat(afterHoursRate)  || 0,
        changeOrderMinServiceCall:  parseFloat(minServiceCall)  || 0,
        financingEnabled,
        financingProvider:    financingEnabled ? financingProvider  : '',
        financingFeePercent:  financingEnabled ? (parseFloat(financingFeePercent) || 0) : 0,
        financingFeeAmount:   finFeeAmt,
      });

      toast.success(`${documentType} ${bid.bidNumber} updated ✓`);
      onSaveSuccess();
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(`Save failed: ${err.message}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const percentTotal = (parseFloat(depositPercent) || 0)
    + (parseFloat(progressPercent) || 0)
    + (parseFloat(balancePercent)  || 0);

  // Display number: swap BID- → EST- prefix for Estimates (display only)
  const displayNumber = bid?.bidNumber
    ? (documentType === 'Estimate' ? bid.bidNumber.replace(/^BID-/, 'EST-') : bid.bidNumber)
    : '';

  const modalTitle = bid
    ? `Edit ${documentType === 'Estimate' ? 'Estimate' : 'Bid'} — ${displayNumber}`
    : 'Edit Estimate';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={o => { if (!o) { setSaveError(null); setIsSaving(false); onClose(); } }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Document Type */}
          <div>
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Estimate">Estimate — for homeowners</SelectItem>
                <SelectItem value="Bid">Bid — for GCs, builders, commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimate Type toggle */}
          <div>
            <Label>Estimate Type</Label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mt-1">
              <button
                type="button"
                onClick={() => setEstimateType('standard')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  estimateType === 'standard'
                    ? 'bg-[#071a35] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setEstimateType('tiered')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  estimateType === 'tiered'
                    ? 'bg-[#071a35] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Good / Better / Best
              </button>
            </div>
          </div>

          {/* Shared pricing */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Labor Cost ($)</Label>
                <Input type="number" step="1" min="0" value={laborCost}
                  onChange={e => setLaborCost(e.target.value)} />
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input type="number" step="0.1" min="0" value={taxRate}
                  onChange={e => setTaxRate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          {/* Good / Better / Best tier cards */}
          {estimateType === 'tiered' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment Options</p>
              <TierCard
                label="Good"
                equipment={tierEquipment.good}
                allEquipment={allEquipment}
                onSelect={item => setTierItem('good', item)}
                laborCost={laborCost}
                taxRate={taxRate}
              />
              <TierCard
                label="Better"
                recommended
                equipment={tierEquipment.better}
                allEquipment={allEquipment}
                onSelect={item => setTierItem('better', item)}
                laborCost={laborCost}
                taxRate={taxRate}
              />
              <TierCard
                label="Best"
                equipment={tierEquipment.best}
                allEquipment={allEquipment}
                onSelect={item => setTierItem('best', item)}
                laborCost={laborCost}
                taxRate={taxRate}
              />
            </div>
          )}

          {/* Financing */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="editFinancingEnabled"
                checked={financingEnabled}
                onChange={e => {
                  setFinancingEnabled(e.target.checked);
                  if (!e.target.checked) { setFinancingProvider(''); setFinancingFeePercent(''); }
                }}
                className="w-4 h-4 accent-[#2E9CCA]"
              />
              <label htmlFor="editFinancingEnabled" className="text-sm font-semibold text-[#1E3A5F] cursor-pointer">
                Customer is using financing
              </label>
            </div>
            {financingEnabled && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs">Financing Vendor</Label>
                {financeVendors.length > 0 ? (
                  <Select
                    value={financingProvider}
                    onValueChange={val => {
                      setFinancingProvider(val);
                      const v = financeVendors.find(f => f.name === val);
                      if (v) setFinancingFeePercent(String(v.feePercent));
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
                {financingFeePercent && parseFloat(financingFeePercent) > 0 && (
                  <p className="text-xs text-[#2E9CCA] font-medium">
                    {financingFeePercent}% financing fee will be added to the total (pre-tax)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Scope of Work */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope of Work</p>
            <div>
              <Label>Project Description</Label>
              <Textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)}
                rows={3} placeholder="Describe the project..." />
            </div>
            <div>
              <Label>Work Included</Label>
              <Textarea value={workIncluded} onChange={e => setWorkIncluded(e.target.value)}
                rows={3} placeholder="List what is included..." />
            </div>
            <div>
              <Label>Work NOT Included / Exclusions</Label>
              <Textarea value={workExclusions} onChange={e => setWorkExclusions(e.target.value)}
                rows={2} placeholder="List exclusions..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Permit Notes</Label>
                <Input value={permitNotes} onChange={e => setPermitNotes(e.target.value)}
                  placeholder="e.g., Permit by contractor" />
              </div>
              <div>
                <Label>Equipment Warranty</Label>
                <Input value={equipmentWarranty} onChange={e => setEquipmentWarranty(e.target.value)}
                  placeholder="e.g., 10 Yr Parts & Compressor" />
              </div>
            </div>
            <div>
              <Label>Labor Warranty</Label>
              <Input value={laborWarranty} onChange={e => setLaborWarranty(e.target.value)}
                placeholder="e.g., 1 Year" />
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Deposit (%)</Label>
                <Input type="number" step="1" min="0" max="100" value={depositPercent}
                  onChange={e => setDepositPercent(e.target.value)} />
              </div>
              <div>
                <Label>Progress (%)</Label>
                <Input type="number" step="1" min="0" max="100" value={progressPercent}
                  onChange={e => setProgressPercent(e.target.value)} />
              </div>
              <div>
                <Label>Balance (%)</Label>
                <Input type="number" step="1" min="0" max="100" value={balancePercent}
                  onChange={e => setBalancePercent(e.target.value)} />
              </div>
            </div>
            <div className={`text-sm font-medium ${percentTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Total: {percentTotal}% {percentTotal === 100 ? '✓' : '— must equal 100%'}
            </div>
            <div>
              <Label>Progress Milestone</Label>
              <Input value={progressMilestone} onChange={e => setProgressMilestone(e.target.value)}
                placeholder="e.g., equipment delivery" />
            </div>
          </div>

          {/* Change Order Rates */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change Order Rates</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Standard Hourly ($)</Label>
                <Input type="number" step="1" min="0" value={standardRate}
                  onChange={e => setStandardRate(e.target.value)} />
              </div>
              <div>
                <Label>After-Hours ($)</Label>
                <Input type="number" step="1" min="0" value={afterHoursRate}
                  onChange={e => setAfterHoursRate(e.target.value)} />
              </div>
              <div>
                <Label>Min. Service Call ($)</Label>
                <Input type="number" step="1" min="0" value={minServiceCall}
                  onChange={e => setMinServiceCall(e.target.value)} />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                : 'Save Changes'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
