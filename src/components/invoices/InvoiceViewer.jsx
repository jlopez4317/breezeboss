import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Download, Mail, Printer, Loader2, Send } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// ─── Logo helper ─────────────────────────────────────────────────────────────
async function fetchLogoBase64(logoUrl) {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    return await new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Build invoice HTML string (for print only) ────────────────────────────────
function buildInvoiceHtml({ invoice, job, customer, settings, jobMaterials, logoBase64 }) {
  const s = settings || {};
  const c = customer || {};
  const j = job || {};
  const mats = jobMaterials || [];

  const fc = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fd = (d) => { if (!d) return '—'; try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; } };

  const companyAddr = [s.companyAddress, s.companyCity && s.companyState && s.companyZip ? `${s.companyCity}, ${s.companyState} ${s.companyZip}` : null].filter(Boolean).join(' ') || [s.companyAddress, s.companyCity, s.companyState, s.companyZip].filter(Boolean).join(', ');
  const customerAddr = [c.address, c.city, c.state, c.zip].filter(Boolean).join(', ');

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="height:60px;max-width:200px;object-fit:contain;display:block;margin-bottom:8px;" />`
    : '';

  const matRows = mats.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
      <td style="padding:8px;color:#555;font-size:12px;">${i + 1}</td>
      <td style="padding:8px;font-weight:500;">${m.materialName || ''}</td>
      <td style="padding:8px;text-align:center;">${m.quantity || 0}</td>
      <td style="padding:8px;text-align:center;color:#555;font-size:12px;">${m.unit || ''}</td>
      <td style="padding:8px;text-align:right;">${fc(m.unitCost)}</td>
      <td style="padding:8px;text-align:right;font-weight:600;">${fc(m.totalCost)}</td>
    </tr>`).join('') || `<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">No materials listed</td></tr>`;

  const payParts = [
    s.stripeLink && `Credit Card (Stripe): <a href="${s.stripeLink}" style="color:#1a6fa8;">${s.stripeLink}</a>`,
    s.squareLink && `Square: <a href="${s.squareLink}" style="color:#1a6fa8;">${s.squareLink}</a>`,
    s.zelleInfo && `Zelle: ${s.zelleInfo}`,
    s.venmoHandle && `Venmo: ${s.venmoHandle}`,
    s.paypalLink && `PayPal: <a href="${s.paypalLink}" style="color:#1a6fa8;">${s.paypalLink}</a>`,
    'Check',
    'Cash',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; background: white; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: letter portrait; margin: 0.5in; }
  }
</style>
</head>
<body>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;width:750px;padding:40px;background:white;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div style="flex:1;">
      ${logoHtml}
      <div style="font-size:18px;font-weight:700;color:#1E3A5F;">${s.companyName || ''}</div>
      <div style="color:#333;line-height:1.6;margin-top:4px;">${companyAddr}</div>
      <div style="color:#333;">${[s.companyPhone, s.companyEmail].filter(Boolean).join(' · ')}</div>
      ${s.companyWebsite ? `<div style="color:#333;">${s.companyWebsite}</div>` : ''}
      ${s.licenseNumber ? `<div style="color:#333;">Lic# ${s.licenseNumber}</div>` : ''}
    </div>
    <div style="text-align:right;min-width:220px;">
      <div style="font-size:32px;font-weight:700;color:#1E3A5F;letter-spacing:2px;">INVOICE</div>
      <table style="margin-left:auto;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:2px 8px;color:#555;text-align:right;">Invoice #:</td><td style="padding:2px 0;font-weight:600;text-align:right;">${invoice.invoiceNumber || '—'}</td></tr>
        <tr><td style="padding:2px 8px;color:#555;text-align:right;">Invoice Date:</td><td style="padding:2px 0;text-align:right;">${fd(invoice.invoiceDate)}</td></tr>
        <tr><td style="padding:2px 8px;color:#555;text-align:right;">Due Date:</td><td style="padding:2px 0;font-weight:600;color:#c0392b;text-align:right;">${fd(invoice.dueDate)}</td></tr>
        <tr><td style="padding:2px 8px;color:#555;text-align:right;">Status:</td><td style="padding:2px 0;text-align:right;"><span style="background:#e8f5e9;color:#2e7d32;padding:2px 10px;border-radius:10px;font-size:11px;">${invoice.status || 'Draft'}</span></td></tr>
      </table>
    </div>
  </div>

  <!-- DIVIDER -->
  <hr style="border:none;border-top:2px solid #1E3A5F;margin:0 0 20px 0;"/>

  <!-- FROM / BILL TO -->
  <div style="display:flex;gap:20px;margin-bottom:20px;">
    <div style="flex:1;background:#f4f7fa;padding:14px;border-radius:6px;">
      <div style="font-size:10px;font-weight:700;color:#1E3A5F;letter-spacing:1px;margin-bottom:8px;">FROM</div>
      <div style="font-weight:700;font-size:14px;">${s.companyName || ''}</div>
      <div style="color:#333;line-height:1.7;">${companyAddr}</div>
      <div style="color:#333;">${s.companyPhone || ''}</div>
      <div style="color:#333;">${s.companyEmail || ''}</div>
      ${s.licenseNumber ? `<div style="color:#333;">Lic# ${s.licenseNumber}</div>` : ''}
    </div>
    <div style="flex:1;background:#f4f7fa;padding:14px;border-radius:6px;">
      <div style="font-size:10px;font-weight:700;color:#1E3A5F;letter-spacing:1px;margin-bottom:8px;">BILL TO</div>
      <div style="font-weight:700;font-size:14px;">${c.firstName || ''} ${c.lastName || ''}</div>
      <div style="color:#333;line-height:1.7;">${customerAddr}</div>
      <div style="color:#333;">${c.phone || ''}</div>
      <div style="color:#333;">${c.email || ''}</div>
    </div>
  </div>

  <!-- JOB REFERENCE -->
  ${j.jobName ? `<div style="background:#e8eef5;padding:8px 14px;border-radius:4px;margin-bottom:20px;font-size:12px;color:#333;">
    <strong>Job:</strong> ${j.jobName}${j.jobNumber ? ` &nbsp;|&nbsp; <strong>Job #:</strong> ${j.jobNumber}` : ''}${j.poNumber ? ` &nbsp;|&nbsp; <strong>PO #:</strong> ${j.poNumber}` : ''}
  </div>` : '<div style="margin-bottom:20px;"></div>'}

  <!-- MATERIALS TABLE -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
    <thead>
      <tr style="background:#1E3A5F;color:white;">
        <th style="padding:10px 8px;text-align:left;width:5%;">#</th>
        <th style="padding:10px 8px;text-align:left;width:50%;">Description</th>
        <th style="padding:10px 8px;text-align:center;width:8%;">Qty</th>
        <th style="padding:10px 8px;text-align:center;width:8%;">Unit</th>
        <th style="padding:10px 8px;text-align:right;width:14%;">Unit Cost</th>
        <th style="padding:10px 8px;text-align:right;width:15%;">Total</th>
      </tr>
    </thead>
    <tbody>${matRows}</tbody>
  </table>

  <!-- TOTALS -->
  <div style="border-top:2px solid #1E3A5F;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f8f9fa;">
        <td style="padding:8px 14px;color:#555;">Materials Subtotal</td>
        <td style="padding:8px 14px;text-align:right;font-weight:500;">${fc(invoice.materialSubtotal)}</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:8px 14px;color:#555;">Labor</td>
        <td style="padding:8px 14px;text-align:right;font-weight:500;">${fc(invoice.laborCost)}</td>
      </tr>
      <tr style="background:#f8f9fa;">
        <td style="padding:8px 14px;color:#555;">Tax (${invoice.taxRate || 0}%)</td>
        <td style="padding:8px 14px;text-align:right;font-weight:500;">${fc(invoice.taxAmount)}</td>
      </tr>
      <tr style="background:#1E3A5F;color:white;">
        <td style="padding:12px 14px;font-size:15px;font-weight:700;letter-spacing:0.5px;">TOTAL DUE</td>
        <td style="padding:12px 14px;text-align:right;font-size:18px;font-weight:700;">${fc(invoice.totalAmount)}</td>
      </tr>
    </table>
  </div>

  <!-- PAYMENT INFO -->
  <div style="background:#e8f4fd;border:1px solid #b3d9f0;border-radius:6px;padding:14px;margin-top:20px;">
    <div style="font-weight:700;color:#1E3A5F;margin-bottom:6px;">Payment Due: ${fd(invoice.dueDate)}</div>
    <div style="color:#333;margin-bottom:4px;"><strong>Accepted Payment Methods:</strong></div>
    <div style="color:#333;line-height:1.8;">${payParts.join('<br/>')}</div>
  </div>

  <!-- LEGAL -->
  <div style="margin-top:20px;font-size:9px;color:#444;font-style:italic;line-height:1.5;border-top:1px solid #ddd;padding-top:10px;">
    Payment is due within 5 days of the invoice date. Invoices not paid within 5 days are subject to a late fee of 1.5% per month (18% annually) on the outstanding balance. In the event of non-payment, the client agrees to be responsible for all costs of collection, including reasonable attorney's fees. This invoice constitutes a legal demand for payment for services rendered and materials provided as described above. All work has been performed in a workmanlike manner in accordance with applicable building codes and manufacturer specifications. Disputes regarding this invoice must be submitted in writing within 5 business days of receipt. After 5 business days, the invoice is deemed accepted. ${s.companyName || '[Company Name]'} reserves the right to file a mechanic's lien on the property for unpaid balances in accordance with applicable state law.
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;text-align:center;font-size:10px;color:#555;border-top:1px solid #ddd;padding-top:10px;">
    ${s.companyName || ''}${s.licenseNumber ? ` · Lic# ${s.licenseNumber}` : ''}
    <br/><em style="color:#1E3A5F;">Thank you for your business — we appreciate the opportunity to serve you!</em>
  </div>

</div>
</body>
</html>`;
}

// ─── Generate PDF using jsPDF + autoTable ──────────────────────────────────────
async function generateInvoicePdfBlob({ invoice, job, customer, settings, jobMaterials }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navy = [30, 58, 95];
  const lightGray = [244, 247, 250];
  const darkText = [26, 26, 26];
  const medText = [80, 80, 80];

  const s = settings || {};
  const c = customer || {};
  const j = job || {};
  const mats = jobMaterials || [];

  // Logo
  if (s.logoUrl) {
    try {
      const logoBase64 = await fetchLogoBase64(s.logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, y, 16, 16);
      }
    } catch(e) { /* skip if logo fails */ }
  }

  // Company info (left)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(s.companyName || 'Company', margin + 18, y + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medText);
  const fullCompanyAddr = [s.companyAddress, s.companyCity && s.companyState && s.companyZip ? `${s.companyCity}, ${s.companyState} ${s.companyZip}` : null].filter(Boolean).join(' ');
  doc.text(fullCompanyAddr || '', margin + 18, y + 10);
  doc.text(`${s.companyPhone || ''} · ${s.companyEmail || ''}`, margin + 18, y + 13.5);
  if (s.licenseNumber) doc.text(`Lic# ${s.licenseNumber}`, margin + 18, y + 17);

  // Invoice title (right)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('INVOICE', pageW - margin, y + 6, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medText);
  doc.text(`Invoice #: ${invoice.invoiceNumber || 'INV-0000-0000'}`, pageW - margin, y + 12, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.invoiceDate) || 'N/A'}`, pageW - margin, y + 15.5, { align: 'right' });
  doc.setTextColor(192, 57, 43);
  doc.setFont('helvetica', 'bold');
  doc.text(`Due: ${formatDate(invoice.dueDate) || 'N/A'}`, pageW - margin, y + 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medText);
  doc.text(`Status: ${invoice.status || 'Draft'}`, pageW - margin, y + 22.5, { align: 'right' });

  y += 26;

  // Divider
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // FROM / BILL TO
  const colW = (pageW - margin * 2 - 4) / 2;

  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, colW, 24, 1.5, 1.5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('FROM', margin + 3, y + 5);
  doc.setFontSize(9);
  doc.text(s.companyName || '', margin + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text(s.companyAddress || '', margin + 3, y + 14);
  doc.text(s.companyPhone || '', margin + 3, y + 18);
  if (s.licenseNumber) doc.text(`Lic# ${s.licenseNumber}`, margin + 3, y + 22);

  const col2x = margin + colW + 4;
  doc.setFillColor(...lightGray);
  doc.roundedRect(col2x, y, colW, 24, 1.5, 1.5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('BILL TO', col2x + 3, y + 5);
  doc.setFontSize(9);
  doc.text(`${c.firstName || ''} ${c.lastName || ''}`, col2x + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text(c.address || '', col2x + 3, y + 14);
  doc.text(`${c.city || ''}, ${c.state || ''} ${c.zip || ''}`, col2x + 3, y + 18);
  doc.text(c.phone || '', col2x + 3, y + 21);
  doc.text(c.email || '', col2x + 3, y + 24);

  y += 28;

  // Job reference bar
  doc.setFillColor(232, 238, 245);
  doc.roundedRect(margin, y, pageW - margin * 2, 6, 0.8, 0.8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(
    `Job: ${j.jobName || ''} | Job #: ${j.jobNumber || ''} | PO #: ${j.poNumber || 'N/A'}`,
    margin + 3, y + 4
  );
  y += 9;

  // Materials table (manual drawing)
  const colWidths = [8, 68, 12, 14, 22, 24];
  const rowH = 6;
  let tableX = margin;

  // Header
  doc.setFillColor(...navy);
  doc.rect(tableX, y, pageW - margin * 2, rowH, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const headers = ['#', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Total'];
  let xPos = tableX + 1;
  headers.forEach((h, i) => {
    doc.text(h, xPos + colWidths[i] / 2, y + 4.2, { align: 'center' });
    xPos += colWidths[i];
  });
  y += rowH;

  // Body rows
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkText);
  
  if (mats.length === 0) {
    doc.setFillColor(248, 249, 250);
    doc.rect(tableX, y, pageW - margin * 2, rowH, 'F');
    doc.text('No materials listed', tableX + (pageW - margin * 2) / 2, y + 4.2, { align: 'center' });
    y += rowH;
  } else {
    mats.forEach((m, i) => {
      const isAlt = i % 2 === 0;
      doc.setFillColor(isAlt ? 248 : 255, isAlt ? 249 : 255, isAlt ? 250 : 255);
      doc.rect(tableX, y, pageW - margin * 2, rowH, 'F');
      
      const row = [
        (i + 1).toString(),
        m.materialName || m.name || '',
        (m.quantity || 1).toString(),
        m.unit || 'Each',
        `$${parseFloat(m.unitCost || 0).toFixed(2)}`,
        `$${parseFloat((m.quantity || 1) * (m.unitCost || 0)).toFixed(2)}`
      ];
      
      xPos = tableX + 1;
      row.forEach((val, colIdx) => {
        const align = colIdx === 0 ? 'center' : colIdx >= 4 ? 'right' : 'left';
        doc.text(val, xPos + (colIdx === 0 || colIdx >= 4 ? colWidths[colIdx] / 2 : 2), y + 4.2, { align, maxWidth: colWidths[colIdx] - 2 });
        xPos += colWidths[colIdx];
      });
      y += rowH;
    });
  }

  y += 2;

  // Totals
  const matSubtotal = parseFloat(invoice.materialSubtotal || 0);
  const labor = parseFloat(invoice.laborCost || 0);
  const taxRate = parseFloat(invoice.taxRate || 0);
  // TAX ONLY ON MATERIALS, NOT LABOR
  const taxAmt = matSubtotal * (taxRate / 100);
  const total = matSubtotal + labor + taxAmt;

  const totalsX = pageW - margin - 50;
  const totalsW = 50;

  const totalsData = [
    ['Materials', `$${matSubtotal.toFixed(2)}`],
    ['Labor', `$${labor.toFixed(2)}`],
    [`Tax (${taxRate}%)`, `$${taxAmt.toFixed(2)}`],
  ];

  totalsData.forEach(([label, val], i) => {
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255);
    doc.rect(totalsX, y, totalsW, 5.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...medText);
    doc.text(label, totalsX + 2, y + 3.8);
    doc.setTextColor(...darkText);
    doc.text(val, totalsX + totalsW - 2, y + 3.8, { align: 'right' });
    y += 5.5;
  });

  // TOTAL DUE
  doc.setFillColor(...navy);
  doc.rect(totalsX, y, totalsW, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DUE', totalsX + 2, y + 5.5);
  doc.text(`$${total.toFixed(2)}`, totalsX + totalsW - 2, y + 5.5, { align: 'right' });
  y += 12;

  // Payment info box
  if (y > pageH - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(232, 244, 253);
  doc.roundedRect(margin, y, pageW - margin * 2, 16, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(`Payment Due: ${formatDate(invoice.dueDate) || 'N/A'} (5 days from invoice date)`, margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text('Accepted Payment Methods:', margin + 3, y + 10);
  doc.text(s.companyPhone && s.companyEmail ? `${s.companyPhone} | ${s.companyEmail}` : s.companyPhone || s.companyEmail || 'Check, Cash', margin + 3, y + 14);

  y += 20;

  // Legal text
  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(68, 68, 68);
  const legalText = `Payment is due within 5 days of the invoice date. Invoices not paid within 5 days are subject to a late fee of 10% per month on the outstanding balance. ${s.companyName || '[Company Name]'} reserves the right to file a mechanic's lien on the property for unpaid balances in accordance with applicable state law.`;
  doc.text(legalText, margin, y, { maxWidth: pageW - margin * 2, align: 'left' });

  return doc.output('blob');
}

// ─── Shared invoice content (used by both dialog and inline modes) ────────────
function InvoiceContent({ invoice, job, customer, settings, jobMaterials, onStatusUpdate, onClose, inline = false }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (!invoice) return null;

  const s = settings || {};
  const c = customer || {};
  const mats = jobMaterials || [];
  const total = invoice.totalAmount || 0;
  const payMethods = [
    s.stripeLink && 'Credit Card',
    s.squareLink && 'Square',
    s.zelleInfo && `Zelle: ${s.zelleInfo}`,
    s.venmoHandle && `Venmo: ${s.venmoHandle}`,
    s.paypalLink && 'PayPal',
    'Check', 'Cash',
  ].filter(Boolean);

  const openEmailComposer = () => {
    setEmailTo(c.email || '');
    setEmailCc('');
    setEmailSubject(`Invoice ${invoice.invoiceNumber} from ${s.companyName || 'Us'} — Due ${formatDate(invoice.dueDate)}`);
    setEmailBody(`Dear ${c.firstName || 'Customer'},\n\nPlease find your invoice attached.\n\nInvoice #: ${invoice.invoiceNumber}\nInvoice Date: ${formatDate(invoice.invoiceDate)}\nDue Date: ${formatDate(invoice.dueDate)}\nTotal Due: ${formatCurrency(total)}\n\nAccepted Payment Methods: ${payMethods.join(', ')}\n\nIf you have any questions, please contact us at ${s.companyPhone || s.companyEmail || 'our office'}.\n\nThank you for your business!\n\n${s.companyName || ''}\n${s.companyPhone || ''}\n${s.companyEmail || ''}`);
    setEmailOpen(true);
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await generateInvoicePdfBlob({ invoice, job, customer, settings, jobMaterials: mats });
      const lastName = (c.lastName || 'Customer').replace(/\s+/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${lastName}_${invoice.invoiceNumber || 'INV'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF generation failed. Try Print instead.');
    }
    setGeneratingPdf(false);
  };

  const handlePrint = async () => {
    setPrinting(true);
    const logoBase64 = await fetchLogoBase64(s.logoUrl);
    const html = buildInvoiceHtml({ invoice, job, customer, settings, jobMaterials: mats, logoBase64 });
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast.error('Pop-up blocked. Please allow pop-ups.'); setPrinting(false); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setPrinting(false);
  };

  const handleSendEmail = async () => {
    if (!emailTo) { toast.error('Recipient email is required.'); return; }

    setSending(true);

    const lastName = (c.lastName || 'Customer').replace(/\s+/g, '_');
    const fileName = `Invoice_${lastName}_${invoice.invoiceNumber || 'INV'}.pdf`;

    // Step 1: Generate PDF blob
    let pdfBlob;
    try {
      pdfBlob = await generateInvoicePdfBlob({ invoice, job, customer, settings, jobMaterials: mats });
    } catch {
      toast.error('Could not generate invoice PDF. Please try again.');
      setSending(false);
      return;
    }

    // Step 2: Upload PDF to get public URL
    let pdfDownloadUrl;
    try {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      pdfDownloadUrl = file_url;
    } catch {
      toast.error('Could not upload invoice PDF. Please try again.');
      setSending(false);
      return;
    }

    // Step 3: Build formatted HTML email body
    const ccList = emailCc ? emailCc.split(',').map(x => x.trim()).filter(Boolean) : [];
    const companyName = s.companyName || 'Company';
    const companyPhone = s.companyPhone || '';
    const companyEmail = s.companyEmail || '';
    const customerFirstName = c.firstName || 'Customer';
    const invoiceNumber = invoice.invoiceNumber || '—';
    const invoiceDateStr = formatDate(invoice.invoiceDate);
    const dueDateStr = formatDate(invoice.dueDate);
    const totalStr = formatCurrency(total);
    const paymentMethodsStr = payMethods.join(', ');

    const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background-color: #1E3A5F; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">${companyName}</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">${companyPhone}${companyPhone && companyEmail ? ' · ' : ''}${companyEmail}</p>
  </div>

  <!-- Body -->
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 28px; border-radius: 0 0 6px 6px;">
    
    <p style="font-size: 15px;">Dear ${customerFirstName},</p>
    <p>Your invoice is ready. Please find the details below.</p>

    <!-- Invoice Summary Box -->
    <div style="background: #f4f7fa; border-left: 4px solid #1E3A5F; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #555; width: 140px;">Invoice #:</td>
          <td style="padding: 4px 0; font-weight: 600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #555;">Invoice Date:</td>
          <td style="padding: 4px 0;">${invoiceDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #555;">Due Date:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #c0392b;">${dueDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #555;">Total Due:</td>
          <td style="padding: 4px 0; font-size: 18px; font-weight: 700; color: #1E3A5F;">${totalStr}</td>
        </tr>
      </table>
    </div>

    <!-- PDF Download Button -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="${pdfDownloadUrl}" 
         style="background-color: #1E3A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block;">
        📄 Download Your Invoice PDF
      </a>
    </div>
    <p style="text-align: center; font-size: 12px; color: #888;">Click the button above to view and download your invoice</p>

    <!-- Payment Methods -->
    <div style="background: #e8f4fd; border: 1px solid #b3d9f0; padding: 14px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #1E3A5F;">Accepted Payment Methods:</p>
      <p style="margin: 0; color: #333;">${paymentMethodsStr}</p>
    </div>

    <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>

    <!-- Company Signature -->
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-weight: 700; color: #1E3A5F;">${companyName}</p>
      <p style="margin: 4px 0; color: #555;">${companyPhone}</p>
      <p style="margin: 4px 0; color: #555;">${companyEmail}</p>
      <p style="margin: 8px 0 0 0; font-style: italic; color: #888; font-size: 13px;">Thank you for your business!</p>
    </div>

  </div>

</body>
</html>`;

    // Step 4: Send email via Base44 SendEmail
    try {
      await base44.integrations.Core.SendEmail({
        to: emailTo,
        subject: emailSubject,
        body: htmlBody,
        from_name: companyName,
      });
    } catch (err) {
      toast.error(`Email failed: ${err.message || 'Please try again.'}`);
      setSending(false);
      return;
    }

    // Step 5: Log + status update
    await base44.entities.SentEmail.create({
      customerId: invoice.customerId,
      jobId: invoice.jobId,
      to: emailTo,
      subject: emailSubject,
      body: `[PDF Attached: ${fileName}]`,
      sentAt: new Date().toISOString(),
      status: 'Sent',
    });
    if (onStatusUpdate && invoice.status === 'Draft') {
      await onStatusUpdate(invoice.id, { status: 'Sent' });
    }
    toast.success(`Invoice emailed to ${emailTo} ✓`);
    setEmailOpen(false);
    setSending(false);
  };

  const toolbar = (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
      <div>
        <span className="text-sm font-semibold">Invoice {invoice.invoiceNumber}</span>
        <span className="text-xs text-muted-foreground ml-3">Due {formatDate(invoice.dueDate)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openEmailComposer} className="gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Email to Customer
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing} className="gap-1.5">
          {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Print
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-1.5">
          {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download PDF
        </Button>
        {!inline && <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>}
      </div>
    </div>
  );

  const invoicePreview = (
    <div className="bg-white rounded-lg shadow max-w-3xl mx-auto p-8" style={{ fontFamily: 'sans-serif' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          {s.logoUrl && <img src={s.logoUrl} alt="logo" className="h-14 object-contain mb-2" />}
          <h1 className="text-xl font-bold text-primary">{s.companyName}</h1>
          <p className="text-xs text-gray-600">{[s.companyAddress, s.companyCity, s.companyState, s.companyZip].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-gray-600">{s.companyPhone}{s.companyEmail ? ` · ${s.companyEmail}` : ''}</p>
          {s.licenseNumber && <p className="text-xs text-gray-600">Lic# {s.licenseNumber}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black tracking-widest text-primary">INVOICE</h2>
          <div className="text-xs text-gray-700 mt-2 space-y-0.5">
            <p><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-semibold">Date:</span> {formatDate(invoice.invoiceDate)}</p>
            <p><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>
            <p><span className="font-semibold">Status:</span> <span className={invoice.status === 'Paid' ? 'text-emerald-600 font-bold' : invoice.status === 'Overdue' ? 'text-red-600 font-bold' : 'text-gray-800'}>{invoice.status}</span></p>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-primary my-4" />
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">From</p>
          <p className="font-bold text-sm">{s.companyName}</p>
          <p className="text-xs text-gray-600">{s.companyAddress}</p>
          <p className="text-xs text-gray-600">{[s.companyCity, s.companyState, s.companyZip].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-gray-600">{s.companyPhone}</p>
          <p className="text-xs text-gray-600">{s.companyEmail}</p>
          {s.licenseNumber && <p className="text-xs text-gray-600">Lic# {s.licenseNumber}</p>}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">Bill To</p>
          <p className="font-bold text-sm">{c.firstName} {c.lastName}</p>
          <p className="text-xs text-gray-600">{c.address}</p>
          <p className="text-xs text-gray-600">{[c.city, c.state, c.zip].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-gray-600">{c.phone}</p>
          <p className="text-xs text-gray-600">{c.email}</p>
        </div>
      </div>
      {job && (
        <div className="bg-blue-50 border border-blue-100 rounded px-4 py-2 text-xs text-gray-700 mb-4">
          <span className="font-semibold">Job:</span> {job.jobName}
          {job.jobNumber && <span className="ml-3"><span className="font-semibold">Job #:</span> {job.jobNumber}</span>}
          {job.poNumber && <span className="ml-3"><span className="font-semibold">PO #:</span> {job.poNumber}</span>}
        </div>
      )}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-primary text-white">
              <th className="py-2 px-2 text-left">#</th>
              <th className="py-2 px-2 text-left">Description</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-left">Unit</th>
              <th className="py-2 px-2 text-right">Unit Cost</th>
              <th className="py-2 px-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {mats.length > 0 ? mats.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                <td className="py-1.5 px-2 font-medium">{m.materialName}</td>
                <td className="py-1.5 px-2 text-right">{m.quantity}</td>
                <td className="py-1.5 px-2 text-gray-500">{m.unit}</td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(m.unitCost)}</td>
                <td className="py-1.5 px-2 text-right font-semibold">{formatCurrency(m.totalCost)}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="py-4 text-center text-gray-400">No materials listed</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm text-gray-700"><span>Materials Subtotal</span><span>{formatCurrency(invoice.materialSubtotal)}</span></div>
          <div className="flex justify-between text-sm text-gray-700"><span>Labor</span><span>{formatCurrency(invoice.laborCost)}</span></div>
          <div className="flex justify-between text-sm text-gray-700"><span>Tax ({invoice.taxRate || 0}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
          <div className="flex justify-between bg-primary text-white px-3 py-2 rounded font-bold text-base mt-2">
            <span>TOTAL DUE</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 border rounded p-4 mb-4 text-xs">
        <p className="font-bold text-sm mb-2">Payment Information</p>
        <p className="text-gray-700 mb-2">Payment due by <span className="font-semibold">{formatDate(invoice.dueDate)}</span></p>
        {payMethods.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-1">Accepted Payment Methods:</p>
            <p className="text-gray-600">{payMethods.join(' · ')}</p>
          </div>
        )}
      </div>
      <p className="text-[9px] text-gray-500 italic leading-relaxed border-t pt-3">
        Payment is due within 5 days of the invoice date. Invoices not paid within 5 days are subject to a late fee of 10% per month on the outstanding balance. {s.companyName || '[Company Name]'} reserves the right to file a mechanic's lien on the property for unpaid balances in accordance with applicable state law.
      </p>
      <div className="flex justify-between border-t mt-4 pt-3 text-[9px] text-gray-500">
        <span>{s.companyName}{s.licenseNumber ? ` · Lic# ${s.licenseNumber}` : ''}</span>
        <span className="italic">Thank you for your business!</span>
      </div>
    </div>
  );

  const hasResendKey = !!(s.resendApiKey && s.resendFromEmail);

  const emailComposer = (
    <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
      <DialogContent className="max-w-lg">
        <h2 className="text-base font-semibold mb-4">Email Invoice to Customer</h2>
        <div className="space-y-3">
          <div><Label>To *</Label><Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com" /></div>
          <div><Label>CC (optional)</Label><Input value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="spouse@email.com" /></div>
          <div><Label>Subject</Label><Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} className="text-xs" /></div>
          <p className="text-xs text-muted-foreground">💡 Add a Resend API key in Settings → Email Delivery to send invoices as true PDF attachments.</p>
          <div className="flex justify-end gap-2 pt-1">
           <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
           <Button type="button" onClick={handleSendEmail} disabled={sending} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Generating & Sending...' : 'Send Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (inline) {
    return (
      <>
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {toolbar}
          <div className="bg-gray-100 p-6">{invoicePreview}</div>
        </div>
        {emailComposer}
      </>
    );
  }

  return (
    <>
      <Dialog open={open && !emailOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
          {toolbar}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-6">{invoicePreview}</div>
        </DialogContent>
      </Dialog>
      {emailComposer}
    </>
  );
}

// ─── Default export wraps InvoiceContent ─────────────────────────────────────
export default function InvoiceViewer(props) {
  return <InvoiceContent {...props} />;
}