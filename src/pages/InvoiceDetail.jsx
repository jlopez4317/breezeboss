import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';

export default function InvoiceDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showVoidDialog, setShowVoidDialog] = useState(false);
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

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => base44.entities.Invoice.get(id),
    enabled: !!id,
  });

  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: jobMaterials = [] } = useQuery({
    queryKey: ['jobMaterials', invoice?.jobId],
    queryFn: () => base44.entities.JobMaterial.filter({ jobId: invoice.jobId }),
    enabled: !!invoice?.jobId,
  });

  const settingsData = settings[0] || {};
  const customer = customers.find(c => c.id === invoice?.customerId);
  const job = jobs.find(j => j.id === invoice?.jobId);

  // Live pricing: recalculate invoice totals from fresh job materials
  const liveMaterialSubtotal = jobMaterials.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unitCost || 0)), 0);
  const liveTaxAmount = (liveMaterialSubtotal + (invoice?.laborCost || 0)) * ((invoice?.taxRate || 0) / 100);
  const liveTotalAmount = liveMaterialSubtotal + (invoice?.laborCost || 0) + liveTaxAmount;
  const materialsChanged = invoice && Math.abs(liveMaterialSubtotal - (invoice.materialSubtotal || 0)) > 0.01;

  const liveInvoice = invoice ? {
    ...invoice,
    materialSubtotal: liveMaterialSubtotal,
    taxAmount: liveTaxAmount,
    totalAmount: liveTotalAmount,
  } : null;

  const handleStatusUpdate = async (invoiceId, data) => {
    await base44.entities.Invoice.update(invoiceId, data);
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Invoice not found.</p>
        <Link to="/invoices"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Invoices</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </Button>
        </Link>
      </div>

      {invoice?.status === 'Void' && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <span>⚠️</span>
          <div>
            <p className="font-semibold">VOIDED INVOICE</p>
            <p>Reason: {invoice.voidReason}</p>
            {invoice.voidNotes && <p>Notes: {invoice.voidNotes}</p>}
            {invoice.voidedAt && <p className="text-xs">Voided on: {formatDate(invoice.voidedAt)}</p>}
          </div>
        </div>
      )}

      {materialsChanged && (
        <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <span>📋</span>
          <span>This invoice reflects the current materials list for this job.</span>
        </div>
      )}

      <InvoiceViewer
        open={true}
        onClose={() => window.history.back()}
        invoice={liveInvoice}
        job={job}
        customer={customer}
        settings={settingsData}
        jobMaterials={jobMaterials}
        onStatusUpdate={handleStatusUpdate}
        inline={true}
      />

      <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
        {invoice?.status !== 'Void' && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowVoidDialog(true)}
            className="text-amber-600 hover:text-amber-600 gap-1.5"
          >
            Void Invoice
          </Button>
        )}
        {invoice?.status === 'Void' && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              base44.entities.Invoice.update(invoice.id, { status: 'Draft' });
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              toast.success('Invoice restored');
            }}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            Restore Invoice
          </Button>
        )}
        </div>

        <AlertDialog open={showVoidDialog} onOpenChange={(open) => {
        if (!open) { setShowVoidDialog(false); setVoidReason(''); setVoidNotes(''); }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice {invoice?.invoiceNumber}</AlertDialogTitle>
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
              onClick={async () => {
                try {
                  await base44.entities.Invoice.update(invoice.id, {
                    status: 'Void',
                    voidReason,
                    voidNotes,
                    voidedAt: new Date().toISOString(),
                    voidedBy: 'User'
                  });
                  queryClient.invalidateQueries({ queryKey: ['invoices'] });
                  queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
                  toast.success(`Invoice ${invoice.invoiceNumber} voided ✓`);
                  setShowVoidDialog(false);
                  setVoidReason('');
                  setVoidNotes('');
                } catch (err) {
                  toast.error('Failed to void invoice');
                }
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