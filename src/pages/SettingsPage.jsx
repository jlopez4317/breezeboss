import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Star, Upload, ImageOff, Mail } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import CompanySetup from '@/pages/CompanySetup';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSettings } from '@/lib/SettingsContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { settings, saveSettings, refreshSettings } = useSettings();
  const queryClient = useQueryClient();
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({});
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorFee, setNewVendorFee] = useState('');

  const { data: financeVendors = [] } = useQuery({
    queryKey: ['financeVendors'],
    queryFn: () => base44.entities.FinanceVendor.list('name', 100),
  });

  const addVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.FinanceVendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeVendors'] });
      setNewVendorName('');
      setNewVendorFee('');
      toast.success('Finance vendor added ✓');
    },
    onError: () => toast.error('Failed to add vendor.'),
  });

  const removeVendorMutation = useMutation({
    mutationFn: (id) => base44.entities.FinanceVendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeVendors'] });
      toast.success('Vendor removed ✓');
    },
    onError: () => toast.error('Failed to remove vendor.'),
  });

  const addFinanceVendor = () => {
    if (!newVendorName.trim()) return;
    addVendorMutation.mutate({
      name: newVendorName.trim(),
      feePercent: parseFloat(newVendorFee) || 0,
    });
  };

  useEffect(() => { 
    if (settings.id) {
      setForm(settings);
    }
  }, [settings.id]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  
  const handleSave = async () => {
    if (!form.companyName || form.companyName.trim() === '') {
      toast.error('Company name is required');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('Saving settings:', form);
      console.log('defaultTaxRate being saved:', form.defaultTaxRate);
      await saveSettings(form);
      console.log('Settings saved successfully');
      toast.success('Settings saved ✓');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange('logoUrl', file_url);
    setUploading(false);
    toast.success('Logo uploaded!');
  };

  const handleRemoveLogo = async () => {
    handleChange('logoUrl', '');
    setConfirmRemoveLogo(false);
    await saveSettings({ ...form, logoUrl: '' });
    toast.success('Logo removed');
  };

  if (showSetupWizard) {
    return <CompanySetup existingSettings={settings} onComplete={() => { setShowSetupWizard(false); refreshSettings(); }} />;
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your BreezeBoss account">
        <Button variant="outline" size="sm" onClick={() => setShowSetupWizard(true)}>Company Setup Wizard</Button>
      </PageHeader>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="company" className="gap-1"><Building2 className="w-3.5 h-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="payment" className="gap-1"><CreditCard className="w-3.5 h-3.5" /> Payment Links</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1"><Star className="w-3.5 h-3.5" /> Review Links</TabsTrigger>
          <TabsTrigger value="email" className="gap-1"><Mail className="w-3.5 h-3.5" /> Email Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div>
                <Label>Company Logo</Label>
                {!form.logoUrl ? (
                  <label className="mt-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/30 transition-colors text-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload your company logo</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, or SVG</span>
                    <span className="text-xs text-muted-foreground">Your logo will appear on bids, invoices, and emails sent to your customers.</span>
                    {uploading && <span className="text-xs text-secondary">Uploading...</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="border rounded-lg p-4 bg-muted/20 flex items-center justify-center" style={{ minHeight: 100 }}>
                      <img src={form.logoUrl} alt="Company logo" className="max-h-20 object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-sm border border-input rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Uploading...' : 'Change Logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <Button type="button" variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5" onClick={() => setConfirmRemoveLogo(true)}>
                        <ImageOff className="w-3.5 h-3.5" /> Remove Logo
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">This logo appears on your customer-facing bids, invoices, and emails — not inside the BreezeBoss app.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Company Name</Label><Input value={form.companyName || ''} onChange={e => handleChange('companyName', e.target.value)} /></div>
                <div><Label>Phone</Label><PhoneInput value={form.companyPhone || ''} onChange={e => handleChange('companyPhone', e.target.value)} /></div>
                <div><Label>Email</Label><Input value={form.companyEmail || ''} onChange={e => handleChange('companyEmail', e.target.value)} /></div>
                <div><Label>Website</Label><Input value={form.companyWebsite || ''} onChange={e => handleChange('companyWebsite', e.target.value)} /></div>
              </div>
              <div><Label>Street Address</Label><Input value={form.companyAddress || ''} onChange={e => handleChange('companyAddress', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City</Label><Input value={form.companyCity || ''} onChange={e => handleChange('companyCity', e.target.value)} /></div>
                <div><Label>State</Label><Input value={form.companyState || ''} onChange={e => handleChange('companyState', e.target.value)} /></div>
                <div><Label>ZIP</Label><Input value={form.companyZip || ''} onChange={e => handleChange('companyZip', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>License Number</Label><Input value={form.licenseNumber || ''} onChange={e => handleChange('licenseNumber', e.target.value)} /></div>
                <div><Label>Insurance Info</Label><Input value={form.insuranceInfo || ''} onChange={e => handleChange('insuranceInfo', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label>Default Tax Rate (%)</Label><Input type="number" step="1" min="0" value={form.defaultTaxRate ?? ''} onChange={e => handleChange('defaultTaxRate', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} /></div>
                <div><Label>Default Markup (%)</Label><Input type="number" step="1" min="0" value={form.defaultMarkup ?? ''} onChange={e => handleChange('defaultMarkup', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} /></div>
                <div><Label>Change Order Hourly Rate ($)</Label><Input type="number" step="1" min="0" value={form.defaultHourlyLaborRate ?? ''} onChange={e => handleChange('defaultHourlyLaborRate', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} /><p className="text-xs text-muted-foreground mt-1">Used for change order billing on active jobs</p></div>
                <div>
                  <Label>Labor Only Rate ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={form.laborOnlyRate ?? ''}
                    onChange={e => handleChange('laborOnlyRate', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                    placeholder="e.g., 150"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Auto-fills labor cost for Labor Only jobs</p>
                </div>
                <div><Label>Labor Warranty</Label><Input value={form.laborWarranty || ''} onChange={e => handleChange('laborWarranty', e.target.value)} placeholder="e.g., 1 Year" /></div>
              </div>
              {/* Finance Vendors */}
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Finance Vendors</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Add financing companies you offer customers. These appear as a dropdown when creating bids.</p>
                </div>
                {financeVendors.length > 0 && (
                  <div className="space-y-2">
                    {financeVendors.map((v) => (
                      <div key={v.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                        <span className="text-sm font-medium">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{v.feePercent}% fee</span>
                          <button
                            type="button"
                            onClick={() => removeVendorMutation.mutate(v.id)}
                            className="text-xs text-destructive hover:text-destructive/80 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Vendor Name</Label>
                    <Input
                      value={newVendorName}
                      onChange={e => setNewVendorName(e.target.value)}
                      placeholder="e.g. Synchrony Finance, GreenSky, Foundation Finance"
                      className="mt-1"
                      onKeyDown={e => e.key === 'Enter' && addFinanceVendor()}
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Fee %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newVendorFee}
                      onChange={e => setNewVendorFee(e.target.value)}
                      placeholder="e.g. 6.5"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFinanceVendor}
                    disabled={!newVendorName.trim() || addVendorMutation.isPending}
                    className="shrink-0"
                  >
                    {addVendorMutation.isPending ? 'Adding...' : '+ Add'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Vendors save instantly — no need to click Save Company Info.</p>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Company Info'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Stripe Payment Link</Label><Input value={form.stripeLink || ''} onChange={e => handleChange('stripeLink', e.target.value)} placeholder="https://..." /></div>
              <div><Label>Square Payment Link</Label><Input value={form.squareLink || ''} onChange={e => handleChange('squareLink', e.target.value)} placeholder="https://..." /></div>
              <div><Label>Zelle Phone/Email</Label><Input value={form.zelleInfo || ''} onChange={e => handleChange('zelleInfo', e.target.value)} /></div>
              <div><Label>Venmo Handle</Label><Input value={form.venmoHandle || ''} onChange={e => handleChange('venmoHandle', e.target.value)} placeholder="@your-handle" /></div>
              <div><Label>PayPal Link</Label><Input value={form.paypalLink || ''} onChange={e => handleChange('paypalLink', e.target.value)} placeholder="https://..." /></div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Payment Links'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader><CardTitle className="text-base">Review Platform Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Google Business Review URL</Label><Input value={form.googleReviewUrl || ''} onChange={e => handleChange('googleReviewUrl', e.target.value)} /></div>
              <div><Label>Facebook Page Review URL</Label><Input value={form.facebookReviewUrl || ''} onChange={e => handleChange('facebookReviewUrl', e.target.value)} /></div>
              <div><Label>Yelp Business URL</Label><Input value={form.yelpUrl || ''} onChange={e => handleChange('yelpUrl', e.target.value)} /></div>
              <div><Label>Nextdoor Business URL</Label><Input value={form.nextdoorUrl || ''} onChange={e => handleChange('nextdoorUrl', e.target.value)} /></div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Review Links'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Delivery (PDF Attachments)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Required for sending proposal PDFs as real email attachments</p>
                <p>Create a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com</a> to get your API key. The free tier supports up to 100 emails/day. Your API key is stored securely in your settings.</p>
              </div>
              <div>
                <Label>Resend API Key</Label>
                <Input
                  type="password"
                  value={form.resendApiKey || ''}
                  onChange={e => handleChange('resendApiKey', e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground mt-1">Found in your Resend dashboard under API Keys.</p>
              </div>
              <div>
                <Label>Sender Email Address</Label>
                <Input
                  type="email"
                  value={form.resendFromEmail || ''}
                  onChange={e => handleChange('resendFromEmail', e.target.value)}
                  placeholder="proposals@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be a verified domain in Resend. For testing, use <span className="font-mono">onboarding@resend.dev</span> (sends only to your own email).</p>
              </div>
              <div>
                <Label>Sender Name</Label>
                <Input
                  value={form.resendFromName || form.companyName || ''}
                  onChange={e => handleChange('resendFromName', e.target.value)}
                  placeholder={form.companyName || 'Your Company Name'}
                />
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Email Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmRemoveLogo} onOpenChange={setConfirmRemoveLogo}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Company Logo?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to remove your company logo? It will no longer appear on your bids, invoices, and emails.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRemoveLogo(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveLogo}>Remove Logo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}