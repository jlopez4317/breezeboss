import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsContext';

const defaultDueDate = (days = 5) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function InvoiceCreateForm({ open, onClose, onSubmit, jobs, jobMap, settings, presetJobId }) {
  const { defaultTaxRate, hourlyLaborRate } = useSettings();
  const [selectedJobId, setSelectedJobId] = useState(presetJobId || '');
  const [matSubtotal, setMatSubtotal] = useState('0');
  const [laborCost, setLaborCost] = useState('0');
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate ?? 0));
  const [dueDate, setDueDate] = useState(defaultDueDate(5));
  const [notes, setNotes] = useState('');
  const [matNote, setMatNote] = useState('');
  const [laborNote, setLaborNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Pull current tax rate from settings when form opens
  useEffect(() => {
    if (open) {
      setTaxRate(String(defaultTaxRate ?? 0));
      console.log('Invoice tax rate auto-filled from settings:', defaultTaxRate);
    }
  }, [open, defaultTaxRate]);

  // Auto-fill when job is selected
  useEffect(() => {
    if (!selectedJobId) { resetFields(); return; }
    setLoading(true);
    const job = jobMap[selectedJobId];

    // Fetch job materials
    base44.entities.JobMaterial.filter({ jobId: selectedJobId }).then(mats => {
      const validMats = mats.filter(m => (m.totalCost || 0) > 0);
      if (validMats.length > 0) {
        const total = validMats.reduce((s, m) => s + (m.totalCost || 0), 0);
        setMatSubtotal(total.toFixed(2));
        setMatNote('Auto-filled from job materials list');
      } else {
        setMatSubtotal('0');
        setMatNote('No materials found — enter subtotal manually');
      }
    });

    // Labor auto-fill priority: accepted bid → job labor → settings default → zero
    base44.entities.Bid.filter({ jobId: selectedJobId }).then(bids => {
      const accepted = bids.find(b => b.status === 'Accepted');
      
      if (accepted && (accepted.laborCost ?? 0) > 0) {
        // Priority 1: Accepted bid labor
        setLaborCost(String(accepted.laborCost));
        setLaborNote(`Auto-filled from accepted bid ${accepted.bidNumber}`);
        console.log('Labor from accepted bid:', accepted.laborCost);
      } else if (job && (job.laborCost ?? 0) > 0) {
        // Priority 2: Job labor cost
        setLaborCost(String(job.laborCost));
        setLaborNote('Auto-filled from job labor cost');
        console.log('Labor from job:', job.laborCost);
      } else if ((hourlyLaborRate ?? 0) > 0) {
        // Priority 3: Settings default hourly rate
        setLaborCost(String(hourlyLaborRate));
        setLaborNote('Pre-filled from default labor rate — please verify');
        console.log('Labor from settings default:', hourlyLaborRate);
      } else {
        // Priority 4: Zero
        setLaborCost('0');
        setLaborNote('');
        console.log('No labor source found, defaulting to 0');
      }
      setLoading(false);
    });
  }, [selectedJobId, hourlyLaborRate, jobMap]);

  const resetFields = () => {
    setMatSubtotal('0'); setLaborCost('0');
    setMatNote(''); setLaborNote('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const matSub = parseFloat(matSubtotal) || 0;
    const labor = parseFloat(laborCost) || 0;
    const tax = parseFloat(taxRate) || 0;
    const taxAmount = matSub * (tax / 100);
    const totalAmount = matSub + labor + taxAmount;
    const job = jobMap[selectedJobId];
    onSubmit({
      jobId: selectedJobId,
      customerId: job?.customerId || '',
      materialSubtotal: matSub,
      laborCost: labor,
      taxRate: tax,
      taxAmount,
      totalAmount,
      balanceDue: totalAmount,
      amountPaid: 0,
      dueDate,
      notes,
    });
  };

  const matSub = parseFloat(matSubtotal) || 0;
  const labor = parseFloat(laborCost) || 0;
  const tax = parseFloat(taxRate) || 0;
  const taxAmt = matSub * (tax / 100);
  const total = matSub + labor + taxAmt;

  // Ensure tax is formatted as a proper number for display
  const displayTax = tax === 0 ? '0.00' : tax.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Job *</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId} required>
              <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
              <SelectContent>{jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.jobNumber} — {j.jobName}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading && <p className="text-xs text-muted-foreground">Loading job data...</p>}

          <div>
             <Label>Materials ($)</Label>
             <Input type="number" step="1" min="0" value={matSubtotal} onChange={e => { setMatSubtotal(e.target.value); setMatNote(''); }} />
             {matNote && <p className="text-xs text-muted-foreground mt-1">{matNote}</p>}
           </div>

           <div>
             <Label>Labor ($)</Label>
             <Input type="number" step="1" min="0" value={laborCost} onChange={e => { setLaborCost(e.target.value); setLaborNote(''); }} />
             {laborNote && <p className="text-xs text-muted-foreground mt-1">{laborNote}</p>}
           </div>

           <div className="grid grid-cols-2 gap-4">
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
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Live preview totals */}
          {selectedJobId && (
            <div className="bg-muted/30 rounded p-3 text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Materials:</span><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(matSub)}</span></div>
              <div className="flex justify-between"><span>Labor:</span><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(labor)}</span></div>
              <div className="flex justify-between"><span>Tax ({displayTax}%):</span><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxAmt)}</span></div>
              <div className="flex justify-between font-bold text-foreground text-sm border-t pt-1 mt-1"><span>Total:</span><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}</span></div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!selectedJobId} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Create Invoice</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}