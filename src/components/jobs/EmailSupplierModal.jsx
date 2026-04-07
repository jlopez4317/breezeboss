import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function EmailSupplierModal({ open, onClose, job, jobMaterials }) {
  const [supplierId, setSupplierId] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 200) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const s = settings[0] || {};

  const buildHtmlBody = (supplier) => {
    const contactName = supplier?.contactName || 'Team';
    const companyName = s.companyName || '';
    const phone = s.companyPhone || '';
    const email = s.companyEmail || '';
    const website = s.companyWebsite || '';
    const license = s.licenseNumber || '';
    const logoUrl = s.logoUrl || '';
    const userName = user?.full_name || '';
    const userEmail = user?.email || '';

    // Group materials by category
    const grouped = {};
    jobMaterials.forEach(m => {
      const cat = m.category || 'Miscellaneous';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(m);
    });

    let rowNum = 1;
    let tableRows = '';
    Object.entries(grouped).forEach(([category, items]) => {
      tableRows += `
        <tr class="category-row" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td colspan="5" style="background:#E8EEF5;color:#1A1A1A!important;font-weight:700;font-size:11px;padding:5px 10px;letter-spacing:0.05em;border-bottom:1px solid #bfdbfe;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
            <font color="#1A1A1A"><strong>— ${category.toUpperCase()} —</strong></font>
          </td>
        </tr>`;
      items.forEach((m, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        tableRows += `
        <tr style="background:${bg};">
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#1A1A1A!important;font-size:12px;font-weight:700;text-align:center;"><font color="#1A1A1A">${rowNum++}</font></td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1A1A1A!important;font-weight:500;"><font color="#1A1A1A">${m.materialName}</font></td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#333333!important;font-weight:400;"><font color="#333333">${m.category || ''}</font></td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;color:#1A1A1A!important;font-weight:700;"><font color="#1A1A1A">${m.quantity}</font></td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#333333!important;font-weight:400;"><font color="#333333">${m.unit || ''}</font></td>
        </tr>`;
      });
    });

    return `<!DOCTYPE html>
<html>
<head>
<style>
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { color: #1A1A1A !important; }
    h1, h2, h3 { color: #1A1A1A !important; }
    p, td, th, span { color: #1A1A1A !important; }
    th { background-color: #1E3A5F !important; color: #FFFFFF !important; font-weight: 700 !important; }
    .category-row td { background-color: #E8EEF5 !important; color: #1A1A1A !important; font-weight: 700 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;">
<div style="max-width:680px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:#1e3a5f;padding:24px 32px;text-align:center;">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:60px;max-width:200px;object-fit:contain;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
    <h1 style="color:#000000!important;font-size:22px!important;font-weight:900!important;margin:8px 0!important;font-family:Arial,Helvetica,sans-serif!important;text-align:center;-webkit-text-fill-color:#000000;"><font color="#000000"><strong>${companyName}</strong></font></h1>
    ${phone ? `<p style="color:#333333!important;margin:2px 0;font-size:13px;text-align:center;"><font color="#333333">${phone}</font></p>` : ''}
    ${email ? `<p style="color:#333333!important;margin:2px 0;font-size:13px;text-align:center;"><font color="#333333">${email}</font></p>` : ''}
    ${license ? `<p style="color:#333333!important;margin:2px 0;font-size:11px;text-align:center;"><font color="#333333">License #${license}</font></p>` : ''}
  </div>

  <div style="padding:28px 32px;">

    <!-- GREETING -->
    <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;font-weight:400;">Hi ${contactName},</p>

    <!-- SENDER BLOCK -->
    <div style="background:#f8fafc;border-left:4px solid #1e3a5f;border-radius:4px;padding:12px 16px;margin-bottom:20px;">
      <div style="font-size:12px;color:#1A1A1A;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Materials Request Submitted By</div>
      ${userName ? `<div style="font-size:14px;font-weight:700;color:#1A1A1A;">${userName}</div>` : ''}
      <div style="font-size:13px;color:#333333;font-weight:400;">${companyName}</div>
      ${phone ? `<div style="font-size:13px;color:#333333;font-weight:400;">${phone}</div>` : ''}
      ${userEmail ? `<div style="font-size:13px;color:#333333;font-weight:400;">${userEmail}</div>` : ''}
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#1A1A1A;font-weight:400;">
      Please see the materials list below for <strong>${job?.jobName || 'the referenced job'}</strong>${job?.jobNumber ? ` (Job #${job.jobNumber})` : ''}. 
      Kindly review and provide pricing and availability at your earliest convenience.
    </p>

    <!-- MATERIALS TABLE -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;">
      <thead>
        <tr style="border-bottom: 2px solid #000000;">
          <th style="color: #000000 !important; font-weight: 900 !important; font-size: 12px; padding: 8px 6px; text-align: left; font-family: Arial, sans-serif; background-color: #ffffff;"><font color="#000000"><b>#</b></font></th>
          <th style="color: #000000 !important; font-weight: 900 !important; font-size: 12px; padding: 8px 6px; text-align: left; font-family: Arial, sans-serif; background-color: #ffffff;"><font color="#000000"><b>Description</b></font></th>
          <th style="color: #000000 !important; font-weight: 900 !important; font-size: 12px; padding: 8px 6px; text-align: left; font-family: Arial, sans-serif; background-color: #ffffff;"><font color="#000000"><b>Category</b></font></th>
          <th style="color: #000000 !important; font-weight: 900 !important; font-size: 12px; padding: 8px 6px; text-align: center; font-family: Arial, sans-serif; background-color: #ffffff;"><font color="#000000"><b>Qty</b></font></th>
          <th style="color: #000000 !important; font-weight: 900 !important; font-size: 12px; padding: 8px 6px; text-align: left; font-family: Arial, sans-serif; background-color: #ffffff;"><font color="#000000"><b>Unit</b></font></th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <!-- FOOTER CTA -->
    <div style="background:#f8fafc;border-radius:6px;padding:16px 20px;margin-bottom:20px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 10px;font-size:14px;color:#1A1A1A;font-weight:400;">
        Please review the above materials list and provide pricing and availability at your earliest convenience.
      </p>
      <p style="margin:0 0 4px;font-size:13px;color:#1A1A1A;font-weight:700;">For questions, please contact:</p>
      ${userName ? `<p style="margin:0;font-size:13px;color:#1A1A1A;font-weight:700;">${userName}</p>` : ''}
      <p style="margin:0;font-size:13px;color:#333333;font-weight:400;">${companyName}</p>
      ${phone ? `<p style="margin:0;font-size:13px;color:#333333;font-weight:400;">${phone}</p>` : ''}
      ${userEmail ? `<p style="margin:0;font-size:13px;color:#333333;font-weight:400;">${userEmail}</p>` : ''}
    </div>

    <p style="margin:0;font-size:14px;color:#1A1A1A!important;font-weight:400;"><font color="#1A1A1A">Thank you for your business,<br/><strong>${companyName}</strong></font></p>
  </div>

  <!-- BOTTOM BAR -->
  <div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:12px;color:#333333!important;font-weight:400;margin:0;">
      <font color="#333333">${[companyName, phone, email, website].filter(Boolean).join(' | ')}</font>
    </p>
  </div>
</div>
</body>
</html>`;
  };

  const handleSupplierChange = (id) => {
    setSupplierId(id);
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      setTo(supplier.email || '');
      setSubject(`Materials Request — ${job?.jobName || ''} / ${job?.jobNumber || ''}`);
      setHtmlBody(buildHtmlBody(supplier));
    }
  };

  const handleSend = async () => {
    if (!to) { toast.error('Please enter a recipient email.'); return; }
    setSending(true);
    await base44.integrations.Core.SendEmail({ to, subject, body: htmlBody });
    await base44.entities.SentEmail.create({
      jobId: job?.id,
      to, subject, body: htmlBody,
      sentAt: new Date().toISOString(),
      status: 'Sent',
    });
    toast.success('Email sent to supplier!');
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Email Materials List to Supplier</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Supplier</Label>
            <Select value={supplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger><SelectValue placeholder="Choose a supplier..." /></SelectTrigger>
              <SelectContent>
                {suppliers.map(sup => (
                  <SelectItem key={sup.id} value={sup.id}>{sup.supplierName}{sup.contactName ? ` — ${sup.contactName}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To</Label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="supplier@email.com" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          {htmlBody && (
            <div>
              <Label>Message Preview</Label>
              <div className="border rounded-md overflow-hidden mt-1" style={{ height: '380px', overflowY: 'auto' }}>
                <iframe
                  srcDoc={htmlBody}
                  title="Email Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">This is a preview of the email the supplier will receive.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
              <Send className="w-4 h-4" />{sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}