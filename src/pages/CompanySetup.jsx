import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wind, Building2, ShieldCheck, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Company Identity', icon: Building2 },
  { id: 2, label: 'Licensing & Defaults', icon: ShieldCheck },
  { id: 3, label: 'All Set!', icon: CheckCircle2 },
];

export default function CompanySetup({ existingSettings, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    companyName: existingSettings?.companyName || '',
    companyPhone: existingSettings?.companyPhone || '',
    companyEmail: existingSettings?.companyEmail || '',
    companyWebsite: existingSettings?.companyWebsite || '',
    companyAddress: existingSettings?.companyAddress || '',
    companyCity: existingSettings?.companyCity || '',
    companyState: existingSettings?.companyState || '',
    companyZip: existingSettings?.companyZip || '',
    logoUrl: existingSettings?.logoUrl || '',
    licenseNumber: existingSettings?.licenseNumber || '',
    defaultTaxRate: existingSettings?.defaultTaxRate ?? 7,
    defaultMarkup: existingSettings?.defaultMarkup ?? 35,
    defaultHourlyLaborRate: existingSettings?.defaultHourlyLaborRate ?? 95,
    laborWarranty: existingSettings?.laborWarranty || '1 Year',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logoUrl', file_url);
    setUploading(false);
    toast.success('Logo uploaded!');
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSettings?.id) return base44.entities.Settings.update(existingSettings.id, data);
      return base44.entities.Settings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleFinish = async () => {
    await saveMutation.mutateAsync({ ...form, onboardingComplete: true });
    onComplete();
  };

  const handleNext = async () => {
    if (step === 1 && !form.companyName) { toast.error('Company name is required.'); return; }
    if (step === 2) {
      await saveMutation.mutateAsync({ ...form });
    }
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">BreezeBoss</span>
          </div>
          <h2 className="text-xl font-semibold">Welcome! Let's set up your company.</h2>
          <p className="text-sm text-muted-foreground mt-1">This only takes a minute and helps personalize your bids, invoices, and emails.</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= s.id ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-sm hidden sm:block ${step === s.id ? 'font-semibold' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 max-w-12 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Card */}
        <div className="bg-card rounded-2xl border shadow-sm p-6 md:p-8 space-y-5">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h3 className="text-lg font-semibold">Company Identity</h3>
              <div>
                <Label>Company Name *</Label>
                <Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g., Arctic Air HVAC LLC" />
              </div>
              <div>
                <Label>Company Logo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-12 w-12 object-contain rounded border" />}
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary border border-secondary/40 rounded-md px-3 py-2 hover:bg-secondary/5 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <span className="text-xs text-muted-foreground">PNG, JPG, or SVG</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Business Phone</Label><Input value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} placeholder="(555) 555-5555" /></div>
                <div><Label>Business Email</Label><Input type="email" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} placeholder="info@yourcompany.com" /></div>
                <div className="md:col-span-2"><Label>Website (optional)</Label><Input value={form.companyWebsite} onChange={e => set('companyWebsite', e.target.value)} placeholder="https://yourcompany.com" /></div>
                <div className="md:col-span-2"><Label>Street Address</Label><Input value={form.companyAddress} onChange={e => set('companyAddress', e.target.value)} placeholder="123 Main St" /></div>
                <div><Label>City</Label><Input value={form.companyCity} onChange={e => set('companyCity', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>State</Label><Input value={form.companyState} onChange={e => set('companyState', e.target.value)} placeholder="FL" /></div>
                  <div><Label>ZIP</Label><Input value={form.companyZip} onChange={e => set('companyZip', e.target.value)} /></div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h3 className="text-lg font-semibold">Licensing & Defaults</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Contractor License Number</Label><Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="CAC1234567" /></div>
                <div><Label>Default Tax Rate (%)</Label><Input type="number" step="0.01" value={form.defaultTaxRate} onChange={e => set('defaultTaxRate', parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Default Materials Markup (%)</Label><Input type="number" step="0.01" value={form.defaultMarkup} onChange={e => set('defaultMarkup', parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Default Hourly Labor Rate ($)</Label><Input type="number" step="0.01" value={form.defaultHourlyLaborRate} onChange={e => set('defaultHourlyLaborRate', parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Labor Warranty Offered</Label><Input value={form.laborWarranty} onChange={e => set('laborWarranty', e.target.value)} placeholder="e.g., 1 Year" /></div>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">You're all set!</h3>
              <p className="text-muted-foreground">Your company profile is configured. Your branding will appear on all bids, invoices, and emails.</p>
              {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-16 object-contain mx-auto rounded" />}
              <p className="text-lg font-semibold">{form.companyName}</p>
              <Button onClick={handleFinish} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8" size="lg">
                Go to Dashboard →
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
              ) : <div />}
              <Button onClick={handleNext} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {step === 2 ? 'Save & Continue' : 'Next →'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}