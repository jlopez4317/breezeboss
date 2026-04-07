import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScanLine, Upload, Loader2, Trash2, Plus, Save } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function BlueprintScanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const settingsData = settings[0] || {};

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setFileUrl(file_url);
  };

  const handleAnalyze = async () => {
    if (!fileUrl && !scopeOfWork) {
      toast.error('Please upload a blueprint or describe the scope of work.');
      return;
    }
    setAnalyzing(true);
    setStep(2);

    const prompt = `You are an expert HVAC estimator with 20+ years of residential installation experience. Analyze the provided blueprint image and/or scope of work description. Generate a detailed, comprehensive materials list for this HVAC residential installation.

${scopeOfWork ? `Scope of Work: ${scopeOfWork}` : ''}

For each item include: material name, category (Equipment/Refrigerant/Copper & Fittings/Electrical/Ductwork/Insulation/Controls & Thermostats/Filters/Drain & PVC/Hardware & Fasteners/Miscellaneous), quantity needed, unit (Each/Foot/Pound/Box/Roll/Bag/Set), estimated unit cost (USD), and any notes.

Be thorough — include all fittings, fasteners, electrical components, drain lines, and accessories a professional HVAC tech would need.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          materials: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                unitCost: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          }
        }
      }
    });

    setMaterials((res.materials || []).map((m, i) => ({
      ...m,
      id: `ai-${i}`,
      quantity: Math.max(1, Math.round(m.quantity || 1)),
      markup: settingsData.defaultMarkup ?? 0,
      totalCost: (m.quantity || 1) * (m.unitCost || 0),
      source: 'AI'
    })));
    setAnalyzing(false);
    setStep(3);
  };

  const updateMaterial = (idx, field, value) => {
    setMaterials(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'unitCost') {
        updated[idx].totalCost = (updated[idx].quantity || 0) * (updated[idx].unitCost || 0);
      }
      return updated;
    });
  };

  const removeMaterial = (idx) => setMaterials(prev => prev.filter((_, i) => i !== idx));

  const addRow = () => setMaterials(prev => [...prev, { id: `manual-${Date.now()}`, name: '', category: 'Miscellaneous', quantity: 1, unit: 'Each', unitCost: 0, markup: settingsData.defaultMarkup ?? 0, totalCost: 0, notes: '', source: 'Manual' }]);

  const totalCost = materials.reduce((s, m) => s + (m.totalCost || 0), 0);

  const handleSaveToJob = async () => {
    if (!selectedJobId) { toast.error('Select a job first.'); return; }
    for (const mat of materials) {
      await base44.entities.JobMaterial.create({
        jobId: selectedJobId,
        materialName: mat.name,
        category: mat.category,
        quantity: mat.quantity,
        unit: mat.unit,
        unitCost: mat.unitCost,
        totalCost: mat.totalCost,
        notes: mat.notes,
        addedBy: mat.source === 'AI' ? 'AI' : 'Manual',
      });
    }
    const totalMaterialCost = materials.reduce((s, m) => s + (m.totalCost || 0), 0);
    const job = jobs.find(j => j.id === selectedJobId);
    await base44.entities.Job.update(selectedJobId, { totalMaterialCost, totalPrice: totalMaterialCost + (job?.laborCost || 0) });
    queryClient.invalidateQueries({ queryKey: ['jobMaterials'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    toast.success('Materials saved to job!');
    navigate(`/jobs/${selectedJobId}`);
  };

  return (
    <div>
      <PageHeader title="Blueprint Scanner" subtitle="AI-powered materials estimation" icon={ScanLine} />

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Upload Blueprint or Describe Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-secondary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Drag & drop a blueprint image, or click to browse</p>
              <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="max-w-xs mx-auto" />
              {file && <p className="text-sm text-secondary mt-2">{file.name}</p>}
            </div>

            <div className="text-center text-sm text-muted-foreground">— or —</div>

            <div>
              <Label>Describe the scope of work</Label>
              <Textarea
                value={scopeOfWork}
                onChange={e => setScopeOfWork(e.target.value)}
                placeholder="e.g., 3-ton split system replacement for 1,800 sq ft ranch home. Existing ductwork in good condition. Need new condenser, air handler, thermostat, and all connections..."
                rows={5}
              />
            </div>

            <Button onClick={handleAnalyze} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2" size="lg">
              <ScanLine className="w-5 h-5" /> Analyze & Generate Materials List
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Processing */}
      {step === 2 && analyzing && (
        <Card className="max-w-md mx-auto text-center p-12">
          <Loader2 className="w-12 h-12 text-secondary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Analyzing Blueprint...</h3>
          <p className="text-sm text-muted-foreground">BreezeBoss AI is generating your materials list. This may take a moment.</p>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Generated Materials List</h2>
              <p className="text-sm text-muted-foreground">{materials.length} items · Total: {formatCurrency(totalCost)}</p>
            </div>
            <Button variant="outline" onClick={addRow} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Row</Button>
          </div>

          <div className="bg-card rounded-lg border overflow-x-auto">
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
                {materials.map((m, i) => (
                  <TableRow key={m.id}>
                    <TableCell><Input value={m.name} onChange={e => updateMaterial(i, 'name', e.target.value)} className="h-8 text-sm" /></TableCell>
                    <TableCell>
                     <Select value={m.category} onValueChange={v => updateMaterial(i, 'category', v)}>
                       <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         {['Equipment','Refrigerant','Copper & Fittings','Electrical','Ductwork','Insulation','Controls & Thermostats','Filters','Drain & PVC','Hardware & Fasteners','Tools & Consumables','Safety','Miscellaneous'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                       </SelectContent>
                     </Select>
                    </TableCell>
                    <TableCell><Input type="number" step="1" min="1" value={m.quantity} onChange={e => updateMaterial(i, 'quantity', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))} onBlur={e => updateMaterial(i, 'quantity', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))} className="h-8 w-20 text-sm text-right" /></TableCell>
                    <TableCell className="text-sm">{m.unit}</TableCell>
                    <TableCell><Input type="number" step="0.01" value={m.unitCost} onChange={e => updateMaterial(i, 'unitCost', parseFloat(e.target.value) || 0)} className="h-8 w-24 text-sm text-right" /></TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(m.totalCost)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeMaterial(i)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <p className="text-xl font-bold">Total: {formatCurrency(totalCost)}</p>
          </div>

          {/* Save to Job */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Save to Job</h3>
            <div className="flex gap-3">
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a job" /></SelectTrigger>
                <SelectContent>{jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.jobNumber} — {j.jobName}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleSaveToJob} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
                <Save className="w-4 h-4" /> Save Materials
              </Button>
            </div>
          </Card>

          <Button variant="outline" onClick={() => { setStep(1); setMaterials([]); setFile(null); setFileUrl(''); setScopeOfWork(''); }}>
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}