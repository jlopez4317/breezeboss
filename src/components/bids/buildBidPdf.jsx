import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Format helpers
function fmt(n) {
  if (!n && n !== 0) return '';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return (dt.getMonth() + 1).toString().padStart(2, '0') + '/' +
    dt.getDate().toString().padStart(2, '0') + '/' + dt.getFullYear();
}
function showVal(v) { return v && Number(v) > 0; }

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildPageHtml({ logoBase64, settings, footer, children }) {
  const brandColor = '#1E3A5F';
  const companyName = settings?.companyName || '';
  const lic = settings?.licenseNumber ? `Lic# ${settings.licenseNumber}` : '';

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="max-height:56px;max-width:160px;object-fit:contain;" />`
    : '';

  return `
    <div style="
      width:816px;min-height:1056px;padding:58px 62px;box-sizing:border-box;
      font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;
      display:flex;flex-direction:column;background:#fff;position:relative;
    ">
      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
        ${logoHtml}
        <div>
          <div style="font-size:16px;font-weight:700;color:${brandColor};">${companyName}</div>
          <div style="font-size:10px;color:#555;">
            ${[settings?.companyAddress, settings?.companyCity, settings?.companyState, settings?.companyZip].filter(Boolean).join(', ')}
          </div>
          <div style="font-size:10px;color:#555;">
            ${[settings?.companyPhone, settings?.companyEmail, settings?.companyWebsite].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div style="border-top:2px solid ${brandColor};margin-bottom:18px;"></div>

      <!-- BODY -->
      <div style="flex:1;">
        ${children}
      </div>

      <!-- FOOTER -->
      <div style="border-top:1px solid #ccc;margin-top:18px;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:#444;">
        <span>${companyName}${lic ? ' | ' + lic : ''}</span>
        <span>${footer}</span>
      </div>
    </div>
  `;
}

function page1Html({ logoBase64, bid, job, customer, settings, docLabel }) {
  const total = (bid.materialSubtotal || 0) + (bid.laborCost || 0) + (bid.taxAmount || 0) + (bid.financingFeeAmount || 0);
  const brandColor = '#1E3A5F';
  const children = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:28px;font-weight:900;letter-spacing:6px;color:${brandColor};border-bottom:3px solid ${brandColor};display:inline-block;padding-bottom:6px;">${docLabel}</div>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:20px;">
      <div style="flex:1;background:#f4f7fa;border-radius:6px;padding:14px;">
        <div style="font-size:9px;color:#444;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Prepared For</div>
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${customer?.firstName || ''} ${customer?.lastName || ''}</div>
        <div style="color:#555;font-size:10px;">${customer?.address || ''}</div>
        <div style="color:#555;font-size:10px;">${[customer?.city, customer?.state, customer?.zip].filter(Boolean).join(', ')}</div>
        ${customer?.phone ? `<div style="color:#555;font-size:10px;">${customer.phone}</div>` : ''}
        ${customer?.email ? `<div style="color:#555;font-size:10px;">${customer.email}</div>` : ''}
      </div>
      <div style="flex:1;background:#f4f7fa;border-radius:6px;padding:14px;">
        <div style="font-size:9px;color:#444;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Project</div>
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${job?.jobName || ''}</div>
        ${job?.jobNumber ? `<div style="color:#555;font-size:10px;">Job #${job.jobNumber}</div>` : ''}
        <div style="margin-top:8px;font-size:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#444;">Proposal Date:</span><span>${fmtDate(bid.bidDate)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#444;">Valid Until:</span><span style="font-weight:600;">${fmtDate(bid.validUntil)}</span>
          </div>
        </div>
      </div>
    </div>
    <div style="background:#2E6DA4;border-radius:8px;padding:18px;text-align:center;color:#fff;margin-bottom:18px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:1;margin-bottom:4px;">Total Project Investment</div>
      <div style="font-size:30px;font-weight:900;">${fmt(total)}</div>
    </div>
    <div style="font-size:9.5px;color:#333;font-style:italic;border-top:1px solid #e0e0e0;padding-top:10px;margin-top:auto;">
      ${bid.documentType === 'Estimate' ? `This estimate is submitted by ${settings?.companyName || '[Company Name]'}, a licensed HVAC contractor. This estimate constitutes a good-faith approximation of costs and is subject to final inspection. Acceptance is subject to execution of the Acceptance Agreement on the final page. Prices quoted are valid for 30 days.` : `This proposal is submitted by ${settings?.companyName || '[Company Name]'}, a licensed HVAC contractor, and constitutes an offer to perform the described services under the terms outlined in this document. Acceptance is subject to execution of the Acceptance Agreement on the final page. Prices quoted are valid for 30 days from the proposal date unless otherwise noted.`}
    </div>
  `;
  return buildPageHtml({ logoBase64, settings, footer: 'Page 1 of 5', children });
}

function page2Html({ logoBase64, bid, job, customer, settings }) {
  const brandColor = '#1E3A5F';
  const section = (title, content) => content ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${brandColor};border-left:3px solid ${brandColor};padding-left:8px;margin-bottom:5px;">${title}</div>
      <div style="font-size:10.5px;color:#333;white-space:pre-wrap;line-height:1.6;">${content}</div>
    </div>` : '';

  const children = `
    <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:${brandColor};margin-bottom:6px;">SCOPE OF WORK</div>
    <div style="font-size:10px;color:#777;margin-bottom:16px;">${customer?.firstName || ''} ${customer?.lastName || ''} · ${job?.jobName || ''} · #${job?.jobNumber || ''} · ${fmtDate(bid.bidDate)}</div>
    ${section('Project Description', bid.projectDescription)}
    ${section('Work Included', bid.workIncluded)}
    ${section('Exclusions / Work NOT Included', bid.workExcluded)}
    ${section('Permit Notes', bid.permitNotes)}
    ${section('Equipment Warranty', bid.equipmentWarranty)}
    ${section('Labor Warranty', bid.laborWarranty || settings?.laborWarranty)}
    <div style="font-size:9px;color:#555;font-style:italic;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:auto;">
      The scope of work described herein is based on information available at the time of proposal. Any changes or additions must be authorized in writing via a signed Change Order before additional work begins.
    </div>
  `;
  return buildPageHtml({ logoBase64, settings, footer: 'Page 2 of 5', children });
}

function page3Html({ logoBase64, bid, job, customer, settings, jobMaterials }) {
  const brandColor = '#1E3A5F';
  const matTotal = bid.materialSubtotal || 0;
  const taxAmt = matTotal * ((bid.taxRate || 0) / 100);

  const rows = jobMaterials.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f6f8fb'};">
      <td style="padding:5px 6px;text-align:center;color:#444;">${i + 1}</td>
      <td style="padding:5px 6px;font-weight:500;">${m.materialName || ''}</td>
      <td style="padding:5px 6px;text-align:right;">${m.quantity || 0}</td>
      <td style="padding:5px 6px;color:#333;">${m.unit || ''}</td>
      <td style="padding:5px 6px;text-align:right;">${fmt(m.unitCost)}</td>
      <td style="padding:5px 6px;text-align:right;font-weight:600;">${fmt(m.totalCost)}</td>
    </tr>
  `).join('');

  const children = `
    <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:${brandColor};margin-bottom:6px;">MATERIALS LIST</div>
    <div style="font-size:10px;color:#777;margin-bottom:14px;">${customer?.firstName || ''} ${customer?.lastName || ''} · ${job?.jobName || ''} · ${fmtDate(bid.bidDate)}</div>
    ${jobMaterials.length === 0 ? '<div style="color:#b45309;background:#fef3c7;padding:10px;border-radius:4px;">No materials list found for this job.</div>' : `
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead>
        <tr style="background:${brandColor};color:#fff;">
          <th style="padding:7px 6px;text-align:center;width:28px;">#</th>
          <th style="padding:7px 6px;text-align:left;">Description</th>
          <th style="padding:7px 6px;text-align:right;width:40px;">Qty</th>
          <th style="padding:7px 6px;text-align:left;width:50px;">Unit</th>
          <th style="padding:7px 6px;text-align:right;width:80px;">Unit Cost</th>
          <th style="padding:7px 6px;text-align:right;width:80px;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <div style="width:240px;font-size:10.5px;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#333;">Materials Subtotal</span><span>${fmt(matTotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#333;">Tax (${bid.taxRate || 0}%)</span><span>${fmt(taxAmt)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid #1E3A5F;margin-top:4px;font-weight:700;font-size:12px;"><span>Materials Total</span><span>${fmt(matTotal + taxAmt)}</span></div>
      </div>
    </div>
    `}
    <div style="font-size:9px;color:#555;font-style:italic;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:14px;">
      Materials listed are subject to availability. Substitutions of equal or greater value may be made at the contractor's discretion. Customer-requested substitutions will be handled via Change Order.
    </div>
  `;
  return buildPageHtml({ logoBase64, settings, footer: 'Page 3 of 5', children });
}

function page4Html({ logoBase64, bid, job, customer, settings, summaryLabel }) {
  const brandColor = '#1E3A5F';
  const sub = bid.materialSubtotal || 0;
  const labor = bid.laborCost || 0;
  const tax = bid.taxAmount || 0;
  const finFee = bid.financingFeeAmount || 0;
  const total = sub + labor + tax + finFee;
  const depPct = bid.depositPercent ?? 0;
  const progPct = bid.progressPercent ?? 0;
  const balPct = bid.balancePercent ?? 0;
  const depAmt = total * (depPct / 100);
  const progAmt = total * (progPct / 100);
  const balAmt = total * (balPct / 100);
  const milestone = bid.progressMilestone || 'progress milestone';
  const payMethods = [
    settings?.stripeLink && 'Credit Card (Stripe)',
    settings?.squareLink && 'Credit Card (Square)',
    settings?.zelleInfo && `Zelle: ${settings.zelleInfo}`,
    settings?.venmoHandle && `Venmo: ${settings.venmoHandle}`,
    settings?.paypalLink && 'PayPal',
    'Check',
    'Cash',
  ].filter(Boolean);

  const children = `
    <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:${brandColor};margin-bottom:6px;">${summaryLabel}</div>
    <div style="font-size:10px;color:#777;margin-bottom:16px;">${bid.documentType === 'Estimate' ? 'Estimate #' : 'Bid #'}${bid.bidNumber || ''} · ${customer?.firstName || ''} ${customer?.lastName || ''} · ${fmtDate(bid.bidDate)}</div>
    <div style="background:#f4f7fa;border-radius:6px;padding:16px;margin-bottom:18px;font-size:11px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#555;">Materials Subtotal</span><span style="font-family:monospace;">${fmt(sub)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#555;">Labor</span><span style="font-family:monospace;">${fmt(labor)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#555;">Tax (${bid.taxRate === 0 || bid.taxRate === undefined ? '0.00' : (bid.taxRate || 0)}%)</span><span style="font-family:monospace;">${fmt(tax)}</span></div>
      ${finFee > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#555;">Financing Fee — ${bid.financingProvider || 'Financing'} (${bid.financingFeePercent || 0}%)</span><span style="font-family:monospace;">${fmt(finFee)}</span></div>` : ''}
      <div style="border-top:2px solid ${brandColor};margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:${brandColor};">
        <span>TOTAL PROJECT COST</span><span>${fmt(total)}</span>
      </div>
    </div>
    <div style="margin-bottom:18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${brandColor};border-left:3px solid ${brandColor};padding-left:8px;margin-bottom:10px;">Payment Schedule</div>
      <div style="font-size:10.5px;display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;">
        <span>Deposit (${depPct}%) — Due at signing</span><span style="font-weight:600;">${fmt(depAmt)}</span>
      </div>
      <div style="font-size:10.5px;display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;">
        <span>Progress (${progPct}%) — Due at ${milestone}</span><span style="font-weight:600;">${fmt(progAmt)}</span>
      </div>
      <div style="font-size:10.5px;display:flex;justify-content:space-between;padding:5px 0;">
        <span>Balance (${balPct}%) — Due upon completion</span><span style="font-weight:600;">${fmt(balAmt)}</span>
      </div>
    </div>
    ${payMethods.length > 0 ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${brandColor};border-left:3px solid ${brandColor};padding-left:8px;margin-bottom:6px;">Accepted Payment Methods</div>
      <div style="font-size:10.5px;color:#444;">${payMethods.join(' &nbsp;·&nbsp; ')}</div>
    </div>` : ''}
    <div style="font-size:9px;color:#555;font-style:italic;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:auto;">
      All prices are in US Dollars. Failure to remit payment per the agreed schedule may result in work stoppage and finance charges of 10% per month on outstanding balances.
    </div>
  `;
  return buildPageHtml({ logoBase64, settings, footer: 'Page 4 of 5', children });
}

function page5Html({ logoBase64, bid, settings }) {
  const brandColor = '#1E3A5F';
  const hourly = bid.changeOrderHourlyRate || settings?.defaultHourlyLaborRate || 0;
  const afterHours = bid.changeOrderAfterHoursRate || 0;
  const minCall = bid.changeOrderMinServiceCall || 0;
  const markup = settings?.defaultMarkup || 35;

  const sigLine = (label, wide = false) => `
    <div style="margin-bottom:22px;${wide ? '' : ''}">
      <div style="border-bottom:1px solid #333;min-width:${wide ? '320px' : '200px'};height:36px;display:inline-block;min-width:100%;"></div>
      <div style="font-size:9px;color:#777;margin-top:3px;">${label}</div>
    </div>
  `;
  const sigRow = (label1, label2) => `
    <div style="display:flex;gap:24px;margin-bottom:4px;">
      <div style="flex:2;">${sigLine(label1)}</div>
      <div style="flex:1;">${sigLine(label2)}</div>
    </div>
  `;

  const children = `
    <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:${brandColor};margin-bottom:6px;">ACCEPTANCE AGREEMENT</div>
    <div style="font-size:10.5px;color:#444;margin-bottom:16px;">By signing below, the customer agrees to the full terms, scope, and pricing outlined in this proposal.</div>
    <div style="background:#f4f7fa;border-radius:6px;padding:14px;margin-bottom:14px;font-size:10.5px;">
      <div style="font-weight:700;margin-bottom:8px;color:${brandColor};">CHANGE ORDER POLICY</div>
      <div style="color:#444;margin-bottom:8px;">Any work beyond the original scope requires a written Change Order signed by both parties before work begins.</div>
      <div style="font-size:10px;color:#333;">
        ${showVal(hourly) ? `<div style="padding:2px 0;">• Standard Labor Rate: <strong>${fmt(hourly)}/hour</strong></div>` : ''}
        ${showVal(afterHours) ? `<div style="padding:2px 0;">• After-Hours / Emergency Rate: <strong>${fmt(afterHours)}/hour</strong></div>` : ''}
        ${showVal(minCall) ? `<div style="padding:2px 0;">• Minimum Service Call: <strong>${fmt(minCall)}</strong></div>` : ''}
        <div style="padding:2px 0;">• Materials billed at cost plus <strong>${markup}% markup</strong></div>
      </div>
      <div style="font-size:9px;color:#444;margin-top:6px;font-style:italic;">No verbal authorizations will be honored.</div>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px;margin-bottom:18px;font-size:10.5px;">
      <div style="font-weight:700;margin-bottom:4px;color:${brandColor};">WARRANTY NOTICE</div>
      <div style="color:#444;">Equipment warranties are manufacturer warranties subject to the manufacturer's terms. Labor warranty provided by ${settings?.companyName || '[Company]'} is as stated in the Scope of Work. Warranty is void if equipment is serviced by an unauthorized party.</div>
    </div>
    <div style="border-top:2px solid ${brandColor};padding-top:12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${brandColor};margin-bottom:14px;">CUSTOMER ACCEPTANCE</div>
      ${sigRow('Customer Signature', 'Date')}
      ${sigLine('Print Name')}
      ${sigRow('Second Signature (if applicable)', 'Date')}
      ${sigLine('Print Name')}
    </div>
    <div style="border-top:2px solid ${brandColor};padding-top:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${brandColor};margin-bottom:14px;">CONTRACTOR</div>
      ${sigRow('Authorized Signature', 'Date')}
      ${sigLine('Print Name')}
      ${sigLine('Company')}
      ${sigLine('License #')}
    </div>
  `;
  return buildPageHtml({ logoBase64, settings, footer: 'Page 5 of 5', children });
}

export async function buildBidPdf(bid, job, customer, settings, jobMaterials) {
  const isEstimate = bid?.documentType === 'Estimate';
  const docLabel = isEstimate ? 'ESTIMATE' : 'PROPOSAL';
  const summaryLabel = isEstimate ? 'ESTIMATE SUMMARY' : 'BID SUMMARY';
  let logoBase64 = null;
  if (settings?.logoUrl) {
    logoBase64 = await fetchImageAsBase64(settings.logoUrl);
  }

  const pageHtmlFns = [
    () => page1Html({ logoBase64, bid, job, customer, settings, docLabel }),
    () => page2Html({ logoBase64, bid, job, customer, settings }),
    () => page3Html({ logoBase64, bid, job, customer, settings, jobMaterials: jobMaterials || [] }),
    () => page4Html({ logoBase64, bid, job, customer, settings, summaryLabel }),
    () => page5Html({ logoBase64, bid, settings }),
  ];

  const doc = new jsPDF({ unit: 'px', format: 'letter', hotfixes: ['px_scaling'] });
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:816px;overflow:visible;';
  document.body.appendChild(container);

  for (let i = 0; i < pageHtmlFns.length; i++) {
    container.innerHTML = pageHtmlFns[i]();
    const el = container.firstElementChild;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 816,
      windowWidth: 816,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  document.body.removeChild(container);
  return doc;
}