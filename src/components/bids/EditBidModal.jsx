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
import { Loader2 } from 'lucide-react';

export default function EditBidModal({ isOpen, onClose, bid, jobMaterials, onSaveSuccess, defaultSettings }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Form fields
  const [laborCost, setLaborCost] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workIncluded, setWorkIncluded] = useState('');
  const [workExclusions, setWorkExclusions] = useState('');
  const [permitNotes, setPermitNotes] = useState('');
  const [equipmentWarranty, setEquipmentWarranty] = useState('');
  const [laborWarranty, setLaborWarranty] = useState('');
  const [depositPercent, setDepositPercent] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [balancePercent, setBalancePercent] = useState('');
  const [progressMilestone, setProgressMilestone] = useState('');
  const [standardRate, setStandardRate] = useState('');
  const [afterHoursRate, setAfterHoursRate] = useState('');
  const [minServiceCall, setMinServiceCall] = useState('');
  const [financingEnabled, setFinancingEnabled] = useState(false);
  const [financingProvider, setFinancingProvider] = useState('');
  const [financingFeePercent, setFinancingFeePercent] = useState('');

  const { data: financeVendors = [] } = useQuery({
    queryKey: ['financeVendors'],
    queryFn: () => base44.entities.FinanceVendor.list('name', 100),
  });

  const loadBidData = (b) => {
    setLaborCost(String(b.laborCost || '0'));
    setTaxRate(String(b.taxRate || '0'));
    setValidUntil(b.validUntil || '');
    setProjectDescription(b.projectDescription || '');
    setWorkIncluded(b.workIncluded || '');
    setWorkExclusions(b.workExclusions || '');
    setPermitNotes(b.permitNotes || '');
    setEquipmentWarranty(b.equipmentWarranty || '');
    setLaborWarranty(b.laborWarranty || '');
    setDepositPercent(String(b.depositPercent || '50'));
    setProgressPercent(String(b.progressPercent || '0'));
    setBalancePercent(String(b.balancePercent || '50'));
    setProgressMilestone(b.progressMilestone || '');
    setStandardRate(String(b.changeOrderHourlyRate || ''));
    setAfterHoursRate(String(b.changeOrderAfterHoursRate || ''));
    setMinServiceCall(String(b.changeOrderMinServiceCall || ''));
    setFinancingEnabled(b.financingEnabled || false);
    setFinancingProvider(b.financingProvider || '');
    setFinancingFeePercent(String(b.financingFeePercent || ''));
    setSaveError(null);
  };

  useEffect(() => {
    if (isOpen && bid) {
      loadBidData(bid);
    }
  }, [isOpen, bid]);

  const handleOpenChange = (open) => {
    if (!open) {
      setSaveError(null);
      setIsSaving(false);
    }
    onClose();
  };

  const handleSaveBid = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const materialSub = (jobMaterials || []).reduce((sum, m) => sum + (m.totalCost || 0), 0);
      const labor = parseFloat(laborCost) || 0;
      const tax = parseFloat(taxRate) || 0;
      const taxAmount = materialSub * (tax / 100);
      const preTaxBase = materialSub + labor;
      const finFeeAmt = financingEnabled && parseFloat(financingFeePercent) > 0
        ? preTaxBase * (parseFloat(financingFeePercent) / 100)
        : 0;
      const totalAmount = materialSub + labor + taxAmount + finFeeAmt;

      const dep = parseFloat(depositPercent) || 0;
      const prog = parseFloat(progressPercent) || 0;
      const bal = parseFloat(balancePercent) || 0;

      const updateData = {
        materialSubtotal: materialSub,
        laborCost: labor,
        taxRate: tax,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        validUntil: validUntil || null,
        projectDescription: projectDescription || '',
        workIncluded: workIncluded || '',
        workExcluded: workExclusions || '',
        permitNotes: permitNotes || '',
        equipmentWarranty: equipmentWarranty || '',
        laborWarranty: laborWarranty || '',
        depositPercent: dep,
        progressPercent: prog,
        balancePercent: bal,
        progressMilestone: progressMilestone || '',
        changeOrderHourlyRate: parseFloat(standardRate) || 0,
        changeOrderAfterHoursRate: parseFloat(afterHoursRate) || 0,
        changeOrderMinServiceCall: parseFloat(minServiceCall) || 0,
        financingEnabled: financingEnabled,
        financingProvider: financingEnabled ? financingProvider : '',
        financingFeePercent: financingEnabled ? (parseFloat(financingFeePercent) || 0) : 0,
        financingFeeAmount: finFeeAmt,
      };

      await base44.entities.Bid.update(bid.id, updateData);

      setIsSaving(false);
      toast.success(`Bid ${bid.bidNumber} updated ✓`);
      onSaveSuccess();
    } catch (error) {
      console.error('Save error:', error);
      setSaveError(`Save failed: ${error.message}. Please try again.`);
      setIsSaving(false);
    }
  };

  const percentTotal = (parseFloat(depositPercent) || 0) + (parseFloat(progressPercent) || 0) + (parseFloat(balancePercent) || 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bid ? `Edit Bid — ${bid.bidNumber}` : 'Edit Bid'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Pricing */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Labor Cost ($)</Label>
                <Input type="number" step="1" min="0" value={laborCost} onChange={(e) => { setLaborCost(e.target.value); setSaveError(null); }} />
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input type="number" step="0.1" min="0" value={taxRate} onChange={(e) => { setTaxRate(e.target.value); setSaveError(null); }} />
              </div>
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input type="date" value={validUntil} onChange={(e) => { setValidUntil(e.target.value); setSaveError(null); }} />
            </div>
          </div>

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

          {/* Scope of Work */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope of Work</p>
            <div><Label>Project Description</Label><Textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} rows={3} placeholder="Describe the project..." /></div>
            <div><Label>Work Included</Label><Textarea value={workIncluded} onChange={(e) => setWorkIncluded(e.target.value)} rows={3} placeholder="List what is included..." /></div>
            <div><Label>Work NOT Included / Exclusions</Label><Textarea value={workExclusions} onChange={(e) => setWorkExclusions(e.target.value)} rows={2} placeholder="List exclusions..." /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Permit Notes</Label><Input value={permitNotes} onChange={(e) => setPermitNotes(e.target.value)} placeholder="e.g., Permit by contractor" /></div>
              <div><Label>Equipment Warranty</Label><Input value={equipmentWarranty} onChange={(e) => setEquipmentWarranty(e.target.value)} placeholder="e.g., 10 Yr Parts & Compressor" /></div>
            </div>
            <div><Label>Labor Warranty</Label><Input value={laborWarranty} onChange={(e) => setLaborWarranty(e.target.value)} placeholder="e.g., 1 Year" /></div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Deposit (%)</Label><Input type="number" step="1" min="0" max="100" value={depositPercent} onChange={(e) => { setDepositPercent(e.target.value); setSaveError(null); }} /></div>
              <div><Label>Progress (%)</Label><Input type="number" step="1" min="0" max="100" value={progressPercent} onChange={(e) => { setProgressPercent(e.target.value); setSaveError(null); }} /></div>
              <div><Label>Balance (%)</Label><Input type="number" step="1" min="0" max="100" value={balancePercent} onChange={(e) => { setBalancePercent(e.target.value); setSaveError(null); }} /></div>
            </div>
            <div className={`text-sm font-medium ${percentTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Total: {percentTotal}% {percentTotal === 100 ? '✓' : '— ideally 100%'}
            </div>
            <div><Label>Progress Milestone (e.g., "equipment delivery")</Label><Input value={progressMilestone} onChange={(e) => setProgressMilestone(e.target.value)} placeholder="e.g., equipment delivery" /></div>
          </div>

          {/* Change Order Rates */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change Order Rates</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Standard Hourly ($)</Label><Input type="number" step="1" min="0" value={standardRate} onChange={(e) => setStandardRate(e.target.value)} /></div>
              <div><Label>After-Hours ($)</Label><Input type="number" step="1" min="0" value={afterHoursRate} onChange={(e) => setAfterHoursRate(e.target.value)} /></div>
              <div><Label>Min. Service Call ($)</Label><Input type="number" step="1" min="0" value={minServiceCall} onChange={(e) => setMinServiceCall(e.target.value)} /></div>
            </div>
          </div>

          {saveError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveBid} disabled={isSaving} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}