import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';

export default function LaborRatesPanel({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [ratesData, setRatesData] = useState(null);

  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const location = [settings[0]?.companyAddress, settings[0]?.companyEmail].filter(Boolean).join(', ') || 'your area';
  const companyCity = settings[0]?.companyAddress || 'your area';

  const fetchRates = async () => {
    setLoading(true);
    setRatesData(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an HVAC industry compensation expert. Provide current residential HVAC labor rates for technicians working in or near: ${companyCity}. Include: average hourly rate range, and typical total labor cost ranges for common job types (New Install, Replacement, Repair, Maintenance). Also include the data source and approximate date. Be specific and realistic for that region.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          hourlyRateMin: { type: 'number' },
          hourlyRateMax: { type: 'number' },
          jobTypes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                jobType: { type: 'string' },
                laborMin: { type: 'number' },
                laborMax: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          },
          source: { type: 'string' },
          dataDate: { type: 'string' }
        }
      }
    });
    setRatesData(res);
    setLoading(false);
  };

  const handleOpen = () => {
    if (open && !ratesData && !loading) fetchRates();
  };

  useEffect(() => { if (open) fetchRates(); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-secondary" /> Market Labor Rates</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground">Fetching current rates for your area...</p>
          </div>
        )}

        {ratesData && !loading && (
          <div className="space-y-4">
            <div className="bg-secondary/10 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Region</p>
              <p className="font-semibold">{ratesData.region}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Hourly Rate (HVAC Tech)</p>
              <p className="text-2xl font-bold text-secondary">${ratesData.hourlyRateMin}–${ratesData.hourlyRateMax}<span className="text-sm font-normal text-muted-foreground">/hr</span></p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Typical Labor by Job Type</p>
              <div className="space-y-2">
                {(ratesData.jobTypes || []).map((jt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{jt.jobType}</p>
                      {jt.notes && <p className="text-xs text-muted-foreground">{jt.notes}</p>}
                    </div>
                    <span className="text-sm font-semibold text-secondary">${jt.laborMin?.toLocaleString()}–${jt.laborMax?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Source: {ratesData.source} · {ratesData.dataDate}
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">ℹ️ This is for reference only — it does not auto-fill any fields.</p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Dismiss</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}