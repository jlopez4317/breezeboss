import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, Mail, Loader2, Printer, Pencil } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { buildBidPdf } from './buildBidPdf';
import { useLiveBid } from '@/hooks/useLiveBid';

const TOTAL_PAGES = 5;

function PageFooter({ settings, pageNum }) {
  return (
    <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-700">
      <span>{settings?.companyName || 'Company'}{settings?.licenseNumber ? ` · Lic# ${settings.licenseNumber}` : ''}</span>
      <span>Page {pageNum} of {TOTAL_PAGES}</span>
    </div>
  );
}

function CompanyHeader({ settings, small }) {
  if (small) return (
    <div className="flex items-center gap-2 mb-4">
      {settings?.logoUrl && <img src={settings.logoUrl} alt="logo" className="h-8 w-8 object-contain" />}
      <span className="font-semibold text-sm text-gray-800">{settings?.companyName}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-4 mb-6">
      {settings?.logoUrl && <img src={settings.logoUrl} alt="logo" className="h-16 w-16 object-contain" />}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{settings?.companyName}</h1>
        <p className="text-sm text-gray-700">{[settings?.companyAddress, settings?.companyCity, settings?.companyState, settings?.companyZip].filter(Boolean).join(', ')}</p>
        <p className="text-sm text-gray-700">{settings?.companyPhone}{settings?.companyEmail ? ` · ${settings.companyEmail}` : ''}</p>
        {settings?.companyWebsite && <p className="text-sm text-gray-700">{settings.companyWebsite}</p>}
      </div>
    </div>
  );
}

function LegalNote({ text }) {
  return <p className="text-xs text-gray-700 italic mt-6 border-t border-gray-200 pt-4">{text}</p>;
}

// Page 1 - Proposal Cover
function Page1({ bid, job, customer, settings, docLabel }) {
  const total = (bid.materialSubtotal || 0) + (bid.laborCost || 0) + (bid.taxAmount || 0) + (bid.financingFeeAmount || 0);
  return (
    <div className="flex flex-col min-h-full">
      <CompanyHeader settings={settings} />
      <div className="text-center my-6">
        <h2 className="text-4xl font-bold tracking-widest text-gray-800 border-b-2 border-gray-800 pb-2 inline-block">{docLabel}</h2>
      </div>
      <div className="grid grid-cols-2 gap-6 my-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Prepared For</p>
          <p className="font-semibold text-gray-900">{customer?.firstName} {customer?.lastName}</p>
          <p className="text-sm text-gray-700">{customer?.address}</p>
          <p className="text-sm text-gray-700">{[customer?.city, customer?.state, customer?.zip].filter(Boolean).join(', ')}</p>
          <p className="text-sm text-gray-700">{customer?.phone}</p>
          <p className="text-sm text-gray-700">{customer?.email}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Project</p>
          <p className="font-semibold text-gray-900">{job?.jobName}</p>
          <p className="text-sm text-gray-700">Job #{job?.jobNumber}</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-700">Proposal Date:</span><span className="text-gray-800">{formatDate(bid.bidDate)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-700">Valid Until:</span><span className="font-medium text-gray-800">{formatDate(bid.validUntil)}</span></div>
          </div>
        </div>
      </div>
      <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 text-center">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Total Project Investment</p>
        <p className="text-3xl font-bold text-secondary">{formatCurrency(total)}</p>
      </div>
      <div className="mt-4 text-sm text-gray-700">
        <p><span className="font-semibold">Prepared By:</span> {settings?.companyName}{settings?.licenseNumber ? ` · Lic# ${settings.licenseNumber}` : ''}</p>
      </div>
      <LegalNote text={bid.documentType === 'Estimate' ? `This estimate is submitted by ${settings?.companyName || '[Company Name]'}, a licensed HVAC contractor. This estimate constitutes a good-faith approximation of costs and is subject to final inspection. Acceptance is subject to execution of the Acceptance Agreement on the final page. Prices quoted are valid for 30 days.` : `This proposal is submitted by ${settings?.companyName || '[Company Name]'}, a licensed HVAC contractor, and constitutes an offer to perform the described services under the terms outlined in this document. Acceptance is subject to execution of the Acceptance Agreement on the final page. Prices quoted are valid for 30 days from the proposal date unless otherwise noted.`} />
      <PageFooter settings={settings} pageNum={1} />
    </div>
  );
}

// Page 2 - Scope of Work
function Page2({ bid, job, customer, settings }) {
  return (
    <div className="flex flex-col min-h-full">
      <CompanyHeader settings={settings} small />
      <h2 className="text-2xl font-bold tracking-widest text-gray-800 border-b-2 border-gray-800 pb-2 mb-4">SCOPE OF WORK</h2>
      <p className="text-sm text-gray-700 mb-4">{customer?.firstName} {customer?.lastName} · {job?.jobName} · #{job?.jobNumber} · {formatDate(bid.bidDate)}</p>
      <div className="space-y-4 flex-1">
        {bid.projectDescription && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Project Description</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{bid.projectDescription}</p></div>}
        {bid.workIncluded && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Work Included</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{bid.workIncluded}</p></div>}
        {bid.workExcluded && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Exclusions / Work NOT Included</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{bid.workExcluded}</p></div>}
        <div className="grid grid-cols-2 gap-4">
          {bid.permitNotes && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Permit Notes</p><p className="text-sm text-gray-800">{bid.permitNotes}</p></div>}
          {bid.equipmentWarranty && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Equipment Warranty</p><p className="text-sm text-gray-800">{bid.equipmentWarranty}</p></div>}
          {bid.laborWarranty && <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Labor Warranty</p><p className="text-sm text-gray-800">{bid.laborWarranty}</p></div>}
        </div>
      </div>
      <LegalNote text="The scope of work described herein is based on information available at the time of proposal. Any changes or additions to this scope must be authorized in writing via a signed Change Order before additional work begins. See the Acceptance Page for Change Order rates." />
      <PageFooter settings={settings} pageNum={2} />
    </div>
  );
}

// Page 3 - Materials List
function Page3({ bid, job, customer, settings, jobMaterials }) {
  const matTotal = (bid.materialSubtotal || 0);
  const tax = matTotal * ((bid.taxRate || 0) / 100);
  return (
    <div className="flex flex-col min-h-full">
      <CompanyHeader settings={settings} small />
      <h2 className="text-2xl font-bold tracking-widest text-gray-800 border-b-2 border-gray-800 pb-2 mb-4">MATERIALS LIST</h2>
      <p className="text-sm text-gray-700 mb-4">{customer?.firstName} {customer?.lastName} · {job?.jobName} · {formatDate(bid.bidDate)}</p>
      {jobMaterials.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">No materials list found — please add materials to the job before generating the bid package.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-300 text-xs text-gray-700 uppercase font-semibold">
              <th className="text-left py-2 pr-2">#</th>
              <th className="text-left py-2 pr-2">Description</th>
              <th className="text-left py-2 pr-2 hidden sm:table-cell">Category</th>
              <th className="text-right py-2 pr-2">Qty</th>
              <th className="text-left py-2 pr-2">Unit</th>
              <th className="text-right py-2 pr-2">Unit Cost</th>
              <th className="text-right py-2">Total</th>
            </tr></thead>
            <tbody>
              {jobMaterials.map((m, i) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 text-gray-700">{i + 1}</td>
                  <td className="py-1.5 pr-2 font-medium text-gray-900">{m.materialName}</td>
                  <td className="py-1.5 pr-2 text-gray-700 hidden sm:table-cell text-xs">{m.category}</td>
                  <td className="py-1.5 pr-2 text-right text-gray-800">{m.quantity}</td>
                  <td className="py-1.5 pr-2 text-gray-700 text-xs">{m.unit}</td>
                  <td className="py-1.5 pr-2 text-right text-gray-800">{formatCurrency(m.unitCost)}</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">{formatCurrency(m.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <div className="w-56 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-700">Materials Subtotal</span><span className="text-gray-800">{formatCurrency(matTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-700">Tax ({bid.taxRate || 0}%)</span><span className="text-gray-800">{formatCurrency(tax)}</span></div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-gray-900"><span>Materials Total</span><span>{formatCurrency(matTotal + tax)}</span></div>
            </div>
          </div>
        </div>
      )}
      <LegalNote text="Materials listed are subject to availability. Substitutions of equal or greater value may be made at the contractor's discretion at no additional cost. Customer-requested substitutions or upgrades will be handled via Change Order and may affect total project cost." />
      <PageFooter settings={settings} pageNum={3} />
    </div>
  );
}

// Page 4 - Bid Summary
function Page4({ bid, job, customer, settings, summaryLabel, docNumberLabel }) {
  const sub = bid.materialSubtotal || 0;
  const labor = bid.laborCost || 0;
  const tax = bid.taxAmount || 0;
  const finFee = bid.financingFeeAmount || 0;
  const total = sub + labor + tax + finFee;
  const deposit = total * ((bid.depositPercent || 0) / 100);
  const progress = total * ((bid.progressPercent || 0) / 100);
  const balance = total * ((bid.balancePercent || 0) / 100);
  const payMethods = [settings?.stripeLink && 'Credit Card', settings?.zelleInfo && 'Zelle', settings?.venmoHandle && 'Venmo', settings?.paypalLink && 'PayPal', settings?.squareLink && 'Square', 'Check', 'Cash'].filter(Boolean);
  return (
    <div className="flex flex-col min-h-full">
      <CompanyHeader settings={settings} small />
      <h2 className="text-2xl font-bold tracking-widest text-gray-800 border-b-2 border-gray-800 pb-2 mb-4">{summaryLabel}</h2>
      <p className="text-sm text-gray-700 mb-4">{docNumberLabel}{bid.bidNumber} · {customer?.firstName} {customer?.lastName} · {formatDate(bid.bidDate)}</p>
      <div className="bg-gray-50 rounded-lg p-5 space-y-2 mb-6">
        <div className="flex justify-between text-sm"><span className="text-gray-700">Materials Subtotal</span><span className="font-mono text-gray-800">{formatCurrency(sub)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-700">Labor</span><span className="font-mono text-gray-800">{formatCurrency(labor)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-700">Tax ({bid.taxRate || 0}%)</span><span className="font-mono text-gray-800">{formatCurrency(tax)}</span></div>
        {finFee > 0 && (
          <div className="flex justify-between text-sm"><span className="text-gray-700">Financing Fee — {bid.financingProvider || 'Financing'} ({bid.financingFeePercent || 0}%)</span><span className="font-mono text-gray-800">{formatCurrency(finFee)}</span></div>
        )}
        <div className="h-px bg-gray-300 my-1" />
        <div className="flex justify-between text-lg font-bold text-gray-900"><span>TOTAL PROJECT COST</span><span className="text-secondary">{formatCurrency(total)}</span></div>
      </div>
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Payment Schedule</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-800"><span>Deposit ({bid.depositPercent || 0}%) — Due at signing</span><span className="font-semibold">{formatCurrency(deposit)}</span></div>
          <div className="flex justify-between text-sm text-gray-800"><span>Progress ({bid.progressPercent || 0}%) — Due at {bid.progressMilestone || 'midpoint'}</span><span className="font-semibold">{formatCurrency(progress)}</span></div>
          <div className="flex justify-between text-sm text-gray-800"><span>Balance ({bid.balancePercent || 0}%) — Due upon completion</span><span className="font-semibold">{formatCurrency(balance)}</span></div>
        </div>
      </div>
      {payMethods.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Accepted Payment Methods</p>
          <p className="text-sm text-gray-800">{payMethods.join(' · ')}</p>
        </div>
      )}
      <LegalNote text="All prices are in US Dollars and inclusive of labor, materials, and standard permit fees unless noted otherwise. Pricing is valid for 30 days from proposal date. Failure to remit payment per the agreed schedule may result in work stoppage and finance charges of 10% per month on outstanding balances." />
      <PageFooter settings={settings} pageNum={4} />
    </div>
  );
}

// Page 5 - Acceptance
function Page5({ bid, settings }) {
  const hourly = bid.changeOrderHourlyRate || settings?.defaultHourlyLaborRate || 0;
  const afterHours = bid.changeOrderAfterHoursRate || 0;
  const minCall = bid.changeOrderMinServiceCall || 0;
  const markup = settings?.defaultMarkup || 35;
  return (
    <div className="flex flex-col min-h-full">
      <CompanyHeader settings={settings} small />
      <h2 className="text-2xl font-bold tracking-widest text-gray-800 border-b-2 border-gray-800 pb-2 mb-4">ACCEPTANCE AGREEMENT</h2>
      <p className="text-sm text-gray-700 mb-4">By signing below, the customer agrees to the full terms, scope, and pricing outlined in this proposal.</p>

      <div className="bg-gray-50 border rounded-lg p-4 mb-4 text-sm text-gray-700 space-y-1">
        <p className="font-semibold mb-2">CHANGE ORDER POLICY</p>
        <p>Any work beyond the original scope requires a written Change Order signed by both parties before work begins. Change Orders are billed at:</p>
        <ul className="list-disc ml-4 space-y-0.5 mt-2">
          {hourly > 0 && <li>Standard Labor Rate: <strong>{formatCurrency(hourly)}/hour</strong></li>}
          {afterHours > 0 && <li>After-Hours / Emergency Rate: <strong>{formatCurrency(afterHours)}/hour</strong></li>}
          {minCall > 0 && <li>Minimum Service Call: <strong>{formatCurrency(minCall)}</strong></li>}
          <li>Materials billed at cost plus <strong>{markup}% markup</strong></li>
        </ul>
        <p className="mt-2 italic text-gray-700">No verbal authorizations will be honored.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-gray-700">
        <p className="font-semibold mb-1">WARRANTY NOTICE</p>
        <p>Equipment warranties are manufacturer warranties subject to the manufacturer's terms. The labor warranty provided by {settings?.companyName || '[Company Name]'} is as stated in the Scope of Work. Warranty is void if equipment is serviced or modified by an unauthorized party.</p>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <p className="text-xs font-bold uppercase text-gray-700 mb-3">CUSTOMER ACCEPTANCE:</p>
          <div className="space-y-3">
            {[1, 2].map(n => (
              <div key={n} className="space-y-1">
                <div className="flex gap-6">
                  <div className="flex-1"><div className="border-b border-gray-400 mb-0.5 h-6" /><p className="text-xs font-medium text-gray-700">Signature {n > 1 ? `(2nd if applicable)` : ''}</p></div>
                  <div className="w-32"><div className="border-b border-gray-400 mb-0.5 h-6" /><p className="text-xs font-medium text-gray-700">Date</p></div>
                </div>
                <div><div className="border-b border-gray-400 mb-0.5 h-6 w-2/3" /><p className="text-xs font-medium text-gray-700">Print Name</p></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-gray-700 mb-3">CONTRACTOR:</p>
          <div className="space-y-2">
            <div className="flex gap-6">
              <div className="flex-1"><div className="border-b border-gray-400 mb-0.5 h-6" /><p className="text-xs font-medium text-gray-700">Signature</p></div>
              <div className="w-32"><div className="border-b border-gray-400 mb-0.5 h-6" /><p className="text-xs font-medium text-gray-700">Date</p></div>
            </div>
            <div><div className="border-b border-gray-400 mb-0.5 h-6 w-2/3" /><p className="text-xs font-medium text-gray-700">Print Name</p></div>
            <div><div className="border-b border-gray-400 mb-0.5 h-6 w-2/3" /><p className="text-xs font-medium text-gray-700">Company · License #</p></div>
          </div>
        </div>
      </div>
      <PageFooter settings={settings} pageNum={5} />
    </div>
  );
}

const PAGE_COMPONENTS = [Page1, Page2, Page3, Page4, Page5];

export default function BidPackageViewer({ open, onClose, bid, job, customer, settings, jobMaterials, onEdit }) {
  const [currentPage, setCurrentPage] = useState(1);
  const docType = bid?.documentType || 'Bid';
  const isEstimate = docType === 'Estimate';
  const docLabel = isEstimate ? 'ESTIMATE' : 'PROPOSAL';
  const summaryLabel = isEstimate ? 'ESTIMATE SUMMARY' : 'BID SUMMARY';
  const docNumberLabel = isEstimate ? 'Estimate #' : 'Bid #';
  const PAGE_TITLES = [docLabel, 'SCOPE OF WORK', 'MATERIALS LIST', summaryLabel, 'ACCEPTANCE AGREEMENT'];
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [freshBid, setFreshBid] = useState(bid);

  // When viewer opens, fetch the fresh bid record from database
  useEffect(() => {
    if (open && bid?.id) {
      const loadFreshBid = async () => {
        try {
          const refreshed = await base44.entities.Bid.get(bid.id);
          setFreshBid(refreshed);
          console.log('BidPackageViewer — loaded fresh bid:', JSON.stringify(refreshed));
        } catch (error) {
          console.error('Failed to load fresh bid:', error);
          setFreshBid(bid); // fallback to passed bid
        }
      };
      loadFreshBid();
    }
  }, [open, bid?.id]);

  const { liveBid, materialsChanged } = useLiveBid(freshBid, jobMaterials);

  if (!bid) return null;

  const PageComp = PAGE_COMPONENTS[currentPage - 1];

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    const doc = await buildBidPdf(liveBid, job, customer, settings, jobMaterials || []);
    doc.save(`${isEstimate ? 'Estimate' : 'Proposal'}_${(job?.jobName || 'Job').replace(/\s+/g, '_')}_${liveBid.bidNumber || 'Package'}.pdf`);
    setGeneratingPdf(false);
  };

  const handlePrint = async () => {
    const b = liveBid;
    // Convert logo to base64 so it's not blocked in the new window
    let logoBase64 = '';
    if (settings?.logoUrl) {
      try {
        const resp = await fetch(settings.logoUrl);
        const blob = await resp.blob();
        logoBase64 = await new Promise(resolve => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result);
          r.readAsDataURL(blob);
        });
      } catch { /* logo embed failed, skip it */ }
    }

    const logoSrc = logoBase64 || settings?.logoUrl || '';
    const logoHtml = logoSrc ? `<img src="${logoSrc}" alt="logo" style="height:64px;width:auto;object-fit:contain;" />` : '';
    const logoSmallHtml = logoSrc ? `<img src="${logoSrc}" alt="logo" style="height:32px;width:auto;object-fit:contain;" />` : '';

    const fc = (v) => v == null ? '' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fd = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; } };

    const pageStyle = `
      body { font-family: Helvetica, Arial, sans-serif; margin:0; padding:0; color:#1a1a1a; background:#fff; font-size:12px; }
      .page { padding: 0.5in; page-break-after: always; min-height: 9in; display: flex; flex-direction: column; box-sizing: border-box; }
      .page:last-child { page-break-after: avoid; }
      .header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
      .header-sm { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
      h2 { font-size:20px; font-weight:800; letter-spacing:4px; color:#000; border-bottom:2px solid #000; padding-bottom:6px; margin:0 0 16px 0; }
      .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0; }
      .box { background:#f7f7f7; border-radius:6px; padding:14px; }
      .label { font-size:10px; color:#333; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
      .meta { font-size:11px; color:#333; margin-bottom:12px; }
      .total-box { background:#f0f7ff; border:1px solid #c9e0f5; border-radius:6px; padding:16px; text-align:center; margin:16px 0; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      th { text-align:left; padding:4px 6px; border-bottom:2px solid #333; font-size:10px; color:#222; font-weight:600; text-transform:uppercase; }
      td { padding:5px 6px; border-bottom:1px solid #e8e8e8; color:#1a1a1a; }
      .summary-box { background:#f7f7f7; border-radius:6px; padding:16px; margin-bottom:16px; }
      .row { display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px; color:#1a1a1a; }
      .total-row { display:flex; justify-content:space-between; font-size:15px; font-weight:800; color:#000; padding-top:8px; border-top:1px solid #999; margin-top:4px; }
      .footer { margin-top:auto; padding-top:10px; border-top:1px solid #ccc; display:flex; justify-content:space-between; font-size:10px; color:#333; }
      .legal { font-size:10px; color:#444; font-style:italic; margin-top:16px; border-top:1px solid #ddd; padding-top:8px; }
      .sig-line { border-bottom:1px solid #666; height:24px; margin-bottom:2px; }
      .sig-label { font-size:11px; color:#333; font-weight:500; }
      .sig-section-label { font-size:10px; color:#222; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
      .sig-grid { display:grid; grid-template-columns:1fr 120px; gap:16px; margin-bottom:12px; }
      @page { size: letter portrait; margin: 0; }
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `;

    const j = job;
    const c = customer;
    const s = settings;
    const mats = jobMaterials || [];
    const total = (b.materialSubtotal || 0) + (b.laborCost || 0) + (b.taxAmount || 0);
    const deposit = total * ((b.depositPercent || 0) / 100);
    const progress = total * ((b.progressPercent || 0) / 100);
    const balance = total * ((b.balancePercent || 0) / 100);
    const payMethods = [s?.stripeLink && 'Credit Card', s?.zelleInfo && 'Zelle', s?.venmoHandle && 'Venmo', s?.paypalLink && 'PayPal', s?.squareLink && 'Square', 'Check', 'Cash'].filter(Boolean);
    const hourly = b.changeOrderHourlyRate || s?.defaultHourlyLaborRate || 0;
    const afterHours = b.changeOrderAfterHoursRate || 0;
    const minCall = b.changeOrderMinServiceCall || 0;
    const markup = s?.defaultMarkup || 35;

    const page1 = `
      <div class="page">
        <div class="header">${logoHtml}<div><div style="font-size:20px;font-weight:800;color:#000;">${s?.companyName || ''}</div><div style="font-size:11px;color:#333;">${[s?.companyAddress, s?.companyCity, s?.companyState, s?.companyZip].filter(Boolean).join(', ')}</div><div style="font-size:11px;color:#333;">${s?.companyPhone || ''}${s?.companyEmail ? ' · ' + s.companyEmail : ''}</div></div></div>
        <div style="text-align:center;margin:16px 0;"><h2 style="display:inline-block;">${b.documentType === 'Estimate' ? 'ESTIMATE' : 'PROPOSAL'}</h2></div>
        <div class="grid2">
          <div class="box"><div class="label">Prepared For</div><div style="font-weight:600;color:#000;">${c?.firstName || ''} ${c?.lastName || ''}</div><div style="color:#333;">${c?.address || ''}</div><div style="color:#333;">${[c?.city, c?.state, c?.zip].filter(Boolean).join(', ')}</div><div style="color:#333;">${c?.phone || ''}</div><div style="color:#333;">${c?.email || ''}</div></div>
          <div class="box"><div class="label">Project</div><div style="font-weight:600;color:#000;">${j?.jobName || ''}</div><div style="color:#333;">Job #${j?.jobNumber || ''}</div><div style="margin-top:8px;"><div class="row"><span style="color:#444;">Proposal Date:</span><span style="color:#1a1a1a;">${fd(b.bidDate)}</span></div><div class="row"><span style="color:#444;">Valid Until:</span><span style="font-weight:600;color:#1a1a1a;">${fd(b.validUntil)}</span></div></div></div>
        </div>
        <div class="total-box"><div style="font-size:10px;color:#333;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total Project Investment</div><div style="font-size:28px;font-weight:800;color:#1a6fa8;">${fc(total)}</div></div>
        <div style="font-size:12px;color:#333;margin-bottom:4px;"><span style="font-weight:600;">Prepared By:</span> ${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</div>
        <div class="legal">${b.documentType === 'Estimate' ? `This estimate is submitted by ${s?.companyName || '[Company Name]'}, a licensed HVAC contractor. This estimate constitutes a good-faith approximation of costs and is subject to final inspection. Acceptance is subject to execution of the Acceptance Agreement on the final page. Prices quoted are valid for 30 days.` : `This proposal is submitted by ${s?.companyName || '[Company Name]'}, a licensed HVAC contractor, and constitutes an offer to perform the described services under the terms outlined in this document. Acceptance is subject to execution of the Acceptance Agreement on the final page.`}</div>
        <div class="footer"><span>${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</span><span>Page 1 of 5</span></div>
      </div>`;

    const page2 = `
      <div class="page">
        <div class="header-sm">${logoSmallHtml}<span style="font-weight:600;font-size:13px;">${s?.companyName || ''}</span></div>
        <h2>SCOPE OF WORK</h2>
        <div class="meta">${c?.firstName || ''} ${c?.lastName || ''} · ${j?.jobName || ''} · #${j?.jobNumber || ''} · ${fd(b.bidDate)}</div>
        ${b.projectDescription ? `<div style="margin-bottom:12px;"><div class="label">Project Description</div><div style="white-space:pre-wrap;">${b.projectDescription}</div></div>` : ''}
        ${b.workIncluded ? `<div style="margin-bottom:12px;"><div class="label">Work Included</div><div style="white-space:pre-wrap;">${b.workIncluded}</div></div>` : ''}
        ${b.workExcluded ? `<div style="margin-bottom:12px;"><div class="label">Exclusions / Work NOT Included</div><div style="white-space:pre-wrap;">${b.workExcluded}</div></div>` : ''}
        <div class="grid2">
          ${b.permitNotes ? `<div><div class="label">Permit Notes</div><div>${b.permitNotes}</div></div>` : ''}
          ${b.equipmentWarranty ? `<div><div class="label">Equipment Warranty</div><div>${b.equipmentWarranty}</div></div>` : ''}
          ${b.laborWarranty ? `<div><div class="label">Labor Warranty</div><div>${b.laborWarranty}</div></div>` : ''}
        </div>
        <div class="legal">The scope of work described herein is based on information available at the time of proposal. Any changes to this scope must be authorized in writing via a signed Change Order before additional work begins.</div>
        <div class="footer"><span>${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</span><span>Page 2 of 5</span></div>
      </div>`;

    const matRows = mats.map((m, i) => `<tr><td style="color:#555;">${i + 1}</td><td style="font-weight:500;color:#1a1a1a;">${m.materialName || ''}</td><td style="color:#444;font-size:10px;">${m.category || ''}</td><td style="text-align:right;color:#1a1a1a;">${m.quantity || 0}</td><td style="color:#444;font-size:10px;">${m.unit || ''}</td><td style="text-align:right;color:#1a1a1a;">${fc(m.unitCost)}</td><td style="text-align:right;font-weight:600;color:#000;">${fc(m.totalCost)}</td></tr>`).join('');
    const matTotal = b.materialSubtotal || 0;
    const tax = matTotal * ((b.taxRate || 0) / 100);
    const page3 = `
      <div class="page">
        <div class="header-sm">${logoSmallHtml}<span style="font-weight:600;font-size:13px;">${s?.companyName || ''}</span></div>
        <h2>MATERIALS LIST</h2>
        <div class="meta">${c?.firstName || ''} ${c?.lastName || ''} · ${j?.jobName || ''} · ${fd(b.bidDate)}</div>
        ${mats.length === 0 ? '<div style="color:#c47a00;background:#fffbe6;padding:10px;border-radius:4px;">No materials list found.</div>' : `
        <table><thead><tr><th>#</th><th>Description</th><th>Category</th><th style="text-align:right;">Qty</th><th>Unit</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Total</th></tr></thead><tbody>${matRows}</tbody></table>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;"><div style="width:200px;"><div class="row"><span style="color:#444;">Materials Subtotal</span><span style="color:#1a1a1a;">${fc(matTotal)}</span></div><div class="row"><span style="color:#444;">Tax (${b.taxRate || 0}%)</span><span style="color:#1a1a1a;">${fc(tax)}</span></div><div style="display:flex;justify-content:space-between;font-weight:800;color:#000;border-top:1px solid #999;padding-top:4px;margin-top:4px;"><span>Materials Total</span><span>${fc(matTotal + tax)}</span></div></div></div>`}
        <div class="legal">Materials listed are subject to availability. Substitutions of equal or greater value may be made at the contractor's discretion at no additional cost.</div>
        <div class="footer"><span>${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</span><span>Page 3 of 5</span></div>
      </div>`;

    const page4 = `
      <div class="page">
        <div class="header-sm">${logoSmallHtml}<span style="font-weight:600;font-size:13px;">${s?.companyName || ''}</span></div>
        <h2>${b.documentType === 'Estimate' ? 'ESTIMATE SUMMARY' : 'BID SUMMARY'}</h2>
        <div class="meta">${b.documentType === 'Estimate' ? 'Estimate #' : 'Bid #'}${b.bidNumber || ''} · ${c?.firstName || ''} ${c?.lastName || ''} · ${fd(b.bidDate)}</div>
        <div class="summary-box">
          <div class="row"><span style="color:#444;">Materials Subtotal</span><span style="font-family:monospace;color:#1a1a1a;">${fc(b.materialSubtotal || 0)}</span></div>
          <div class="row"><span style="color:#444;">Labor</span><span style="font-family:monospace;color:#1a1a1a;">${fc(b.laborCost || 0)}</span></div>
          <div class="row"><span style="color:#444;">Tax (${b.taxRate || 0}%)</span><span style="font-family:monospace;color:#1a1a1a;">${fc(b.taxAmount || 0)}</span></div>
          <div class="total-row"><span>TOTAL PROJECT COST</span><span style="color:#1a6fa8;">${fc(total)}</span></div>
        </div>
        <div style="margin-bottom:12px;"><div class="label" style="margin-bottom:6px;color:#222;">Payment Schedule</div>
          <div class="row"><span>Deposit (${b.depositPercent || 0}%) — Due at signing</span><span style="font-weight:600;">${fc(deposit)}</span></div>
          <div class="row"><span>Progress (${b.progressPercent || 0}%) — Due at ${b.progressMilestone || 'midpoint'}</span><span style="font-weight:600;">${fc(progress)}</span></div>
          <div class="row"><span>Balance (${b.balancePercent || 0}%) — Due upon completion</span><span style="font-weight:600;">${fc(balance)}</span></div>
        </div>
        ${payMethods.length > 0 ? `<div><div class="label">Accepted Payment Methods</div><div style="color:#333;">${payMethods.join(' · ')}</div></div>` : ''}
        <div class="legal">All prices are in US Dollars and inclusive of labor, materials, and standard permit fees unless noted otherwise. Pricing valid for 30 days from proposal date.</div>
        <div class="footer"><span>${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</span><span>Page 4 of 5</span></div>
      </div>`;

    const page5 = `
      <div class="page">
        <div class="header-sm">${logoSmallHtml}<span style="font-weight:600;font-size:13px;">${s?.companyName || ''}</span></div>
        <h2>ACCEPTANCE AGREEMENT</h2>
        <p style="margin-bottom:12px;">By signing below, the customer agrees to the full terms, scope, and pricing outlined in this proposal.</p>
        <div style="background:#f7f7f7;border-radius:6px;padding:14px;margin-bottom:12px;">
          <div style="font-weight:700;margin-bottom:8px;">CHANGE ORDER POLICY</div>
          <p style="margin:0 0 6px;">Any work beyond the original scope requires a written Change Order signed by both parties before work begins. Change Orders are billed at:</p>
          <ul style="margin:0;padding-left:16px;">
            ${hourly > 0 ? `<li>Standard Labor Rate: <strong>${fc(hourly)}/hour</strong></li>` : ''}
            ${afterHours > 0 ? `<li>After-Hours / Emergency Rate: <strong>${fc(afterHours)}/hour</strong></li>` : ''}
            ${minCall > 0 ? `<li>Minimum Service Call: <strong>${fc(minCall)}</strong></li>` : ''}
            <li>Materials billed at cost plus <strong>${markup}% markup</strong></li>
          </ul>
          <p style="margin:8px 0 0;font-style:italic;color:#444;">No verbal authorizations will be honored.</p>
        </div>
        <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:6px;padding:14px;margin-bottom:16px;">
          <div style="font-weight:700;margin-bottom:6px;">WARRANTY NOTICE</div>
          <p style="margin:0;">Equipment warranties are manufacturer warranties subject to the manufacturer's terms. The labor warranty provided by ${s?.companyName || '[Company Name]'} is as stated in the Scope of Work. Warranty is void if equipment is serviced or modified by an unauthorized party.</p>
        </div>
        <div style="flex:1;">
          <div class="sig-section-label">CUSTOMER ACCEPTANCE:</div>
          <div class="sig-grid"><div><div class="sig-line"></div><div class="sig-label">Signature</div></div><div><div class="sig-line"></div><div class="sig-label">Date</div></div></div>
          <div style="margin-bottom:16px;"><div class="sig-line" style="width:66%;"></div><div class="sig-label">Print Name</div></div>
          <div class="sig-grid"><div><div class="sig-line"></div><div class="sig-label">Signature (2nd if applicable)</div></div><div><div class="sig-line"></div><div class="sig-label">Date</div></div></div>
          <div style="margin-bottom:20px;"><div class="sig-line" style="width:66%;"></div><div class="sig-label">Print Name</div></div>
          <div class="sig-section-label">CONTRACTOR:</div>
          <div class="sig-grid"><div><div class="sig-line"></div><div class="sig-label">Signature</div></div><div><div class="sig-line"></div><div class="sig-label">Date</div></div></div>
          <div style="margin-bottom:8px;"><div class="sig-line" style="width:66%;"></div><div class="sig-label">Print Name</div></div>
          <div><div class="sig-line" style="width:66%;"></div><div class="sig-label">Company · License #</div></div>
        </div>
        <div class="footer"><span>${s?.companyName || ''}${s?.licenseNumber ? ' · Lic# ' + s.licenseNumber : ''}</span><span>Page 5 of 5</span></div>
      </div>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { toast.error('Pop-up blocked. Please allow pop-ups for this site.'); return; }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${b.documentType === 'Estimate' ? 'Estimate' : 'Proposal'} — ${j?.jobName || ''}</title><style>${pageStyle}</style></head><body>${page1}${page2}${page3}${page4}${page5}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

  const handleEmailToCustomer = async () => {
    if (!customer?.email) { toast.error('Customer has no email address.'); return; }

    setSendingEmail(true);

    const fileName = `${isEstimate ? 'Estimate' : 'Proposal'}_${(job?.jobName || 'Job').replace(/\s+/g, '_')}_${liveBid.bidNumber || 'Bid'}.pdf`;
    const total = formatCurrency(liveBid.totalAmount || 0);
    const subject = `Your ${isEstimate ? 'Estimate' : 'Proposal'} from ${settings?.companyName || 'Us'}`;

    // Step 1: Generate PDF
    let pdfBase64 = null;
    let pdfDownloadUrl = null;
    try {
      const doc = await buildBidPdf(liveBid, job, customer, settings, jobMaterials || []);
      const pdfBlob = doc.output('blob');
      // Convert to base64 for attachment
      pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      // Also upload for fallback download link
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      pdfDownloadUrl = file_url;
    } catch {
      toast.error('Could not generate PDF. Please try Download PDF first to verify it works, then try emailing again.');
      setSendingEmail(false);
      return;
    }

    const body = `Dear ${customer.firstName},\n\nThank you for the opportunity to provide this proposal for your HVAC project.\n\nYour full proposal is attached to this email as a PDF.\n\nProposal #: ${liveBid.bidNumber}\nTotal: ${total}\nValid Until: ${formatDate(liveBid.validUntil)}\n${pdfDownloadUrl ? `\nYou can also download it here: ${pdfDownloadUrl}\n` : ''}\nIf you have any questions, please call us at ${settings?.companyPhone || 'our office'}.\n\nWe look forward to working with you!\n\n${settings?.companyName || ''}\n${settings?.companyPhone || ''}\n${settings?.companyEmail || ''}`;

    // Step 2: Try to send via Resend backend function (supports PDF attachment)
    let emailSent = false;
    try {
      const res = await base44.functions.invoke('sendProposalEmail', {
        to: customer.email,
        subject,
        body,
        pdfBase64,
        fileName,
        fromName: settings?.companyName,
        fromEmail: settings?.companyEmail,
      });
      if (res.data?.success) {
        emailSent = true;
      } else if (res.data?.error === 'NO_RESEND_KEY' || res.data?.error === 'NO_FROM_EMAIL') {
        // Fall back to built-in SendEmail (no attachment, just link)
        await base44.integrations.Core.SendEmail({
          to: customer.email,
          subject,
          body,
          from_name: settings?.companyName || undefined,
        });
        emailSent = true;
      }
    } catch {
      // Fall back to built-in SendEmail
      try {
        await base44.integrations.Core.SendEmail({
          to: customer.email,
          subject,
          body,
          from_name: settings?.companyName || undefined,
        });
        emailSent = true;
      } catch {
        toast.error('PDF generated but email failed to send. Please try again.');
        setSendingEmail(false);
        return;
      }
    }

    if (!emailSent) {
      toast.error('PDF generated but email failed to send. Please try again.');
      setSendingEmail(false);
      return;
    }

    await base44.entities.SentEmail.create({
      customerId: customer.id,
      jobId: job?.id,
      to: customer.email,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'Sent',
    });

    toast.success(`Proposal emailed to ${customer.email} with PDF attachment ✓`);
    setSendingEmail(false);
  };

  return (
    <>
    <div id="bid-print-root" aria-hidden="true" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: -1 }} />
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{PAGE_TITLES[currentPage - 1]}</span>
            <span className="text-xs text-muted-foreground">Page {currentPage} of {TOTAL_PAGES}</span>
          </div>
          <div className="flex items-center gap-2 mr-8">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => { onEdit(bid); onClose(); }} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit Bid
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleEmailToCustomer} disabled={sendingEmail} className="gap-1.5">
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {sendingEmail ? 'Generating & Sending...' : 'Email to Customer'}
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={generatingPdf} className="gap-1.5">
              {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download PDF
            </Button>
            </div>
        </div>

        {/* Page Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto">
          {PAGE_TITLES.map((title, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)}
              className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${currentPage === i + 1 ? 'bg-secondary text-white' : 'text-muted-foreground hover:bg-muted'}`}>
              {i + 1}. {title}
            </button>
          ))}
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {materialsChanged && (
            <div className="max-w-3xl mx-auto mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-sm text-amber-800">
              <span>⚠️</span>
              <span>Materials on this job have been updated. This bid reflects the current materials list.</span>
            </div>
          )}
          <div id="bid-page-content" className="bg-white rounded-lg shadow-sm p-8 min-h-[600px] max-w-3xl mx-auto" style={{ fontFamily: 'sans-serif' }}>
            <PageComp bid={liveBid} job={job} customer={customer} settings={settings} jobMaterials={jobMaterials || []} docLabel={docLabel} summaryLabel={summaryLabel} docNumberLabel={docNumberLabel} />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {TOTAL_PAGES}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1))} disabled={currentPage === TOTAL_PAGES} className="gap-1.5">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}