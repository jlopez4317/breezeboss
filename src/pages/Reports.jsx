import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, DollarSign, Briefcase, Users, Trophy, XCircle, FileText, Maximize2, Download, Mail, Send } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const JOB_TYPE_COLORS = ['#1E3A5F','#2E9CCA','#27AE60','#E67E22','#E74C3C','#9B59B6'];
const STATUS_COLORS = {
  'Lead': '#95A5A6', 'Scheduled': '#3498DB', 'In Progress': '#E67E22',
  'Completed': '#27AE60', 'Invoiced': '#8E44AD', 'Paid': '#1E8449', 'Cancelled': '#E74C3C'
};

function getDateField(item, type) {
  if (type === 'jobs') return item.scheduledDate || item.created_date;
  if (type === 'customers') return item.created_date;
  if (type === 'invoices') return item.invoiceDate || item.created_date;
  if (type === 'bids') return item.bidDate || item.created_date;
  return item.created_date;
}

function inMonth(item, type, year, month) {
  const d = getDateField(item, type);
  if (!d) return false;
  const date = new Date(d);
  return date.getFullYear() === year && date.getMonth() === month;
}

function TrendBadge({ current, prev }) {
  if (prev === 0 && current === 0) return <span className="text-xs text-muted-foreground">No data</span>;
  if (prev === 0) return <span className="text-xs text-emerald-600">▲ New</span>;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">— Same as last month</span>;
  return pct > 0
    ? <span className="text-xs text-emerald-600">▲ {pct}% vs last month</span>
    : <span className="text-xs text-red-500">▼ {Math.abs(pct)}% vs last month</span>;
}

export default function Reports() {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [emailReportOpen, setEmailReportOpen] = useState(false);
  const [reportEmailTo, setReportEmailTo] = useState('');
  const [reportEmailSubject, setReportEmailSubject] = useState('');
  const reportRef = useRef(null);

  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 500) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 500) });
  const { data: bids = [] } = useQuery({ queryKey: ['bids'], queryFn: () => base44.entities.Bid.list('-created_date', 500) });
  const { data: settingsList = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });
  const settingsData = settingsList[0] || {};

  const years = [];
  for (let y = 2024; y <= now.getFullYear() + 1; y++) years.push(y);

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const monthJobs = useMemo(() => jobs.filter(j => inMonth(j, 'jobs', selectedYear, selectedMonth)), [jobs, selectedYear, selectedMonth]);
  const prevMonthJobs = useMemo(() => jobs.filter(j => inMonth(j, 'jobs', prevYear, prevMonth)), [jobs, prevYear, prevMonth]);
  const monthCustomers = useMemo(() => customers.filter(c => inMonth(c, 'customers', selectedYear, selectedMonth)), [customers, selectedYear, selectedMonth]);
  const prevMonthCustomers = useMemo(() => customers.filter(c => inMonth(c, 'customers', prevYear, prevMonth)), [customers, prevYear, prevMonth]);
  const monthInvoices = useMemo(() => invoices.filter(i => inMonth(i, 'invoices', selectedYear, selectedMonth)), [invoices, selectedYear, selectedMonth]);
  const prevMonthInvoices = useMemo(() => invoices.filter(i => inMonth(i, 'invoices', prevYear, prevMonth)), [invoices, prevYear, prevMonth]);
  const monthBids = useMemo(() => bids.filter(b => inMonth(b, 'bids', selectedYear, selectedMonth)), [bids, selectedYear, selectedMonth]);

  const revenue = useMemo(() => monthInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0), [monthInvoices]);
  const prevRevenue = useMemo(() => prevMonthInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0), [prevMonthInvoices]);
  const openInvoicesBalance = useMemo(() => monthInvoices.filter(i => !['Paid','Void'].includes(i.status)).reduce((s, i) => s + (i.balanceDue || i.totalAmount || 0), 0), [monthInvoices]);
  const bidsWon = monthBids.filter(b => b.status === 'Accepted').length;
  const prevBidsWon = bids.filter(b => inMonth(b, 'bids', prevYear, prevMonth) && b.status === 'Accepted').length;
  const cancellations = monthJobs.filter(j => j.status === 'Cancelled').length;
  const prevCancellations = prevMonthJobs.filter(j => j.status === 'Cancelled').length;

  const revenueByMonth = useMemo(() => {
    return SHORT_MONTHS.map((monthName, monthIndex) => {
      const monthStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthRevenue = invoices
        .filter(i => i.status === 'Paid' && (i.invoiceDate?.startsWith(monthStr) || i.paymentDate?.startsWith(monthStr)))
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
      return { month: monthName, revenue: monthRevenue, isSelected: monthIndex === selectedMonth };
    });
  }, [invoices, selectedYear, selectedMonth]);

  const maxRevenue = Math.max(...revenueByMonth.map(m => m.revenue), 1000);
  const yAxisMax = Math.ceil(maxRevenue * 1.2 / 1000) * 1000;

  const jobTypesData = useMemo(() => {
    const counts = {};
    monthJobs.forEach(j => { if (j.jobType) counts[j.jobType] = (counts[j.jobType] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [monthJobs]);

  const jobStatusData = useMemo(() => {
    const counts = {};
    jobs.forEach(j => { if (j.status) counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const customerMap = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);
  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j])), [jobs]);

  const insights = useMemo(() => {
    const list = [];
    const totalMonthJobs = monthJobs.length;
    const cancellationRate = totalMonthJobs > 0 ? Math.round((cancellations / totalMonthJobs) * 100) : 0;
    const totalBids = monthBids.length;
    const bidWinRate = totalBids > 0 ? Math.round((bidsWon / totalBids) * 100) : 0;
    const customerGrowth = prevMonthCustomers.length > 0 ? Math.round(((monthCustomers.length - prevMonthCustomers.length) / prevMonthCustomers.length) * 100) : 0;

    if (cancellationRate > 20) list.push(`⚠️ High cancellation rate this month (${cancellationRate}%). Consider following up with lost leads.`);
    if (totalBids > 0 && bidWinRate < 50) list.push(`📉 Bid win rate is ${bidWinRate}% — consider reviewing your pricing strategy.`);
    if (totalBids > 0 && bidWinRate >= 70) list.push(`🏆 Excellent bid win rate of ${bidWinRate}% this month!`);
    if (monthCustomers.length > 0 && monthCustomers.length > prevMonthCustomers.length) list.push(`📈 New customer acquisition is up ${customerGrowth}% vs last month.`);
    if (revenue === 0) list.push(`💡 No paid invoices recorded this month. Make sure to mark invoices as Paid when collected.`);

    const typeCounts = {};
    monthJobs.forEach(j => { if (j.jobType) typeCounts[j.jobType] = (typeCounts[j.jobType] || 0) + 1; });
    const topJobType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    if (topJobType) list.push(`🔧 Most common job type: ${topJobType[0]} (${topJobType[1]} jobs).`);

    const techCounts = {};
    monthJobs.forEach(j => { if (j.assignedTech) techCounts[j.assignedTech] = (techCounts[j.assignedTech] || 0) + 1; });
    const topTech = Object.entries(techCounts).sort((a, b) => b[1] - a[1])[0];
    if (topTech) list.push(`⭐ Most active technician: ${topTech[0]}.`);

    return list;
  }, [monthJobs, monthBids, monthCustomers, prevMonthCustomers, cancellations, bidsWon, revenue]);

  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(revenue), prev: prevRevenue, curr: revenue, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', cardStyle: { borderTop: '3px solid #27ae60', border: '1px solid rgba(39,174,96,0.3)', boxShadow: '0 1px 6px rgba(39,174,96,0.08)' } },
    { label: 'Jobs This Month', value: monthJobs.length, prev: prevMonthJobs.length, curr: monthJobs.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', cardStyle: { borderTop: '3px solid #e67e22', border: '1px solid rgba(230,126,34,0.3)', boxShadow: '0 1px 6px rgba(230,126,34,0.08)' } },
    { label: 'New Customers', value: monthCustomers.length, prev: prevMonthCustomers.length, curr: monthCustomers.length, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50', cardStyle: { borderTop: '3px solid #2E9CCA', border: '1px solid rgba(46,156,202,0.3)', boxShadow: '0 1px 6px rgba(46,156,202,0.08)' } },
    { label: 'Bids Won', value: bidsWon, prev: prevBidsWon, curr: bidsWon, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50', cardStyle: { borderTop: '3px solid #8e44ad', border: '1px solid rgba(142,68,173,0.3)', boxShadow: '0 1px 6px rgba(142,68,173,0.08)' } },
    { label: 'Cancellations', value: cancellations, prev: prevCancellations, curr: cancellations, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', cardStyle: { borderTop: '3px solid #e74c3c', border: '1px solid rgba(231,76,60,0.3)', boxShadow: '0 1px 6px rgba(231,76,60,0.08)' } },
    { label: 'Open Invoices', value: formatCurrency(openInvoicesBalance), icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', noTrend: true, cardStyle: { borderTop: '3px solid #f39c12', border: '1px solid rgba(243,156,18,0.3)', boxShadow: '0 1px 6px rgba(243,156,18,0.08)' } },
  ];

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const monthName = MONTHS[selectedMonth];
      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let y = 15;

      const addText = (text, x, yPos, size = 10, style = 'normal', color = [30, 58, 95]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.setTextColor(...color);
        doc.text(String(text), x, yPos);
      };

      const addLine = (yPos, color = [160, 160, 160]) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.4);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const checkNewPage = (neededSpace) => {
        if (y + neededSpace > 280) { doc.addPage(); y = 15; }
      };

      // ── HEADER ──
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, 210, 22, 'F');
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(settingsData?.companyName || 'BreezeBoss', pageWidth / 2, 10, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 200, 232);
      doc.text(`Performance Report — ${monthName} ${selectedYear}`, pageWidth / 2, 17, { align: 'center' });
      y = 30;
      addText(`Generated: ${new Date().toLocaleDateString()}`, margin, y, 8, 'normal', [80, 80, 80]);
      y += 10;

      // ── KPI CARDS — 3 per row ──
      addText('MONTHLY SUMMARY', margin, y, 8, 'bold', [50, 50, 50]);
      y += 5; addLine(y); y += 6;

      const kpis = [
        { label: 'Total Revenue', value: `$${revenue?.toLocaleString() || '0'}`, color: [39, 174, 96] },
        { label: 'Jobs This Month', value: String(monthJobs?.length || 0), color: [230, 126, 34] },
        { label: 'New Customers', value: String(monthCustomers?.length || 0), color: [46, 156, 202] },
        { label: 'Bids Won', value: String(bidsWon || 0), color: [142, 68, 173] },
        { label: 'Cancellations', value: String(cancellations || 0), color: [231, 76, 60] },
        { label: 'Open Invoices', value: `$${(openInvoicesBalance || 0).toLocaleString()}`, color: [243, 156, 18] },
      ];

      const cardW = (contentWidth - 8) / 3;
      const cardH = 20;
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * (cardW + 4);
        const cardY = y + row * (cardH + 4);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...kpi.color);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');
        doc.setFillColor(...kpi.color);
        doc.rect(x, cardY, cardW, 1.5, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
        doc.text(kpi.label, x + 3, cardY + 7);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 95);
        doc.text(kpi.value, x + 3, cardY + 15);
      });
      y += Math.ceil(kpis.length / 3) * (cardH + 4) + 8;

      // ── REVENUE BY MONTH BAR CHART ──
      checkNewPage(60);
      addText(`MONTHLY REVENUE — ${selectedYear}`, margin, y, 8, 'bold', [50, 50, 50]);
      y += 5; addLine(y); y += 6;

      const colW = contentWidth / 12;
      const maxRev = Math.max(...(revenueByMonth?.map(m => m.revenue) || [1]), 1);
      const chartH = 35;
      const chartBottom = y + chartH;
      SHORT_MONTHS.forEach((mon, i) => {
        const rev = revenueByMonth?.[i]?.revenue || 0;
        const barH = rev > 0 ? Math.max((rev / maxRev) * chartH, 2) : 0;
        const x = margin + i * colW;
        const isSelected = i === selectedMonth;
        doc.setFillColor(isSelected ? 30 : 46, isSelected ? 58 : 156, isSelected ? 95 : 202);
        if (barH > 0) doc.rect(x + 1, chartBottom - barH, colW - 2, barH, 'F');
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
        doc.text(mon, x + colW / 2, chartBottom + 5, { align: 'center' });
        if (rev > 0) {
          doc.setFontSize(5); doc.setTextColor(80, 80, 80);
          doc.text(`$${rev >= 1000 ? (rev / 1000).toFixed(0) + 'k' : rev}`, x + colW / 2, chartBottom - barH - 1, { align: 'center' });
        }
      });
      y = chartBottom + 10;

      // ── JOBS THIS MONTH ──
      checkNewPage(40);
      addText(`JOBS — ${monthName.toUpperCase()} ${selectedYear}`, margin, y, 8, 'bold', [50, 50, 50]);
      y += 5; addLine(y); y += 5;

      if (!monthJobs || monthJobs.length === 0) {
        addText('No jobs this month.', margin, y, 9, 'normal', [150, 150, 150]); y += 8;
      } else {
        doc.setFillColor(240, 244, 248);
        doc.rect(margin, y - 3, contentWidth, 7, 'F');
        addText('Job #', margin + 1, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Name', margin + 25, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Type', margin + 100, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Status', margin + 130, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Total', pageWidth - margin - 1, y + 1, 7, 'bold', [80, 80, 80]);
        y += 7; addLine(y, [200, 200, 200]); y += 3;
        monthJobs.forEach((job, i) => {
          checkNewPage(8);
          if (i % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(margin, y - 2, contentWidth, 7, 'F'); }
          addText(job.jobNumber || '', margin + 1, y + 2, 7, 'normal', [80, 80, 80]);
          addText((job.jobName || '').substring(0, 35), margin + 25, y + 2, 7, 'normal', [30, 58, 95]);
          addText(job.jobType || '', margin + 100, y + 2, 7, 'normal', [80, 80, 80]);
          addText(job.status || '', margin + 130, y + 2, 7, 'normal', [80, 80, 80]);
          addText(`$${(job.totalPrice || 0).toLocaleString()}`, pageWidth - margin - 1, y + 2, 7, 'bold', [30, 58, 95]);
          y += 7;
        });
      }
      y += 6;

      // ── BIDS THIS MONTH ──
      checkNewPage(40);
      addText(`BIDS — ${monthName.toUpperCase()} ${selectedYear}`, margin, y, 8, 'bold', [50, 50, 50]);
      y += 5; addLine(y); y += 5;

      if (!monthBids || monthBids.length === 0) {
        addText('No bids this month.', margin, y, 9, 'normal', [150, 150, 150]); y += 8;
      } else {
        doc.setFillColor(240, 244, 248);
        doc.rect(margin, y - 3, contentWidth, 7, 'F');
        addText('Bid #', margin + 1, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Customer', margin + 30, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Status', margin + 120, y + 1, 7, 'bold', [80, 80, 80]);
        addText('Total', pageWidth - margin - 1, y + 1, 7, 'bold', [80, 80, 80]);
        y += 7; addLine(y, [200, 200, 200]); y += 3;
        monthBids.forEach((bid, i) => {
          checkNewPage(8);
          const cust = customerMap?.[bid.customerId];
          const custName = cust ? `${cust.firstName} ${cust.lastName}` : '—';
          if (i % 2 === 0) { doc.setFillColor(250, 252, 255); doc.rect(margin, y - 2, contentWidth, 7, 'F'); }
          addText(bid.bidNumber || '', margin + 1, y + 2, 7, 'normal', [80, 80, 80]);
          addText(custName.substring(0, 40), margin + 30, y + 2, 7, 'normal', [30, 58, 95]);
          const statusColor = bid.status === 'Accepted' ? [39, 174, 96] : bid.status === 'Declined' ? [231, 76, 60] : [80, 80, 80];
          addText(bid.status || '', margin + 120, y + 2, 7, 'bold', statusColor);
          addText(`$${(bid.totalAmount || 0).toLocaleString()}`, pageWidth - margin - 1, y + 2, 7, 'bold', [30, 58, 95]);
          y += 7;
        });
      }
      y += 6;

      // ── INSIGHTS ──
      checkNewPage(30);
      addText('MONTHLY INSIGHTS', margin, y, 8, 'bold', [50, 50, 50]);
      y += 5; addLine(y); y += 6;
      const pdfInsights = insights.length > 0 ? insights : ['No significant insights for this period.'];
      pdfInsights.forEach(insight => {
        checkNewPage(8);
        // Strip emoji for PDF compatibility
        addText(`• ${insight.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim()}`, margin + 2, y, 9, 'normal', [60, 60, 60]);
        y += 7;
      });

      // ── FOOTER ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(80, 80, 80);
        doc.text(`${settingsData?.companyName || 'BreezeBoss'} · Confidential`, margin, 292);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 292, { align: 'right' });
        addLine(290, [120, 120, 120]);
      }

      doc.save(`BreezeBoss_Report_${monthName}_${selectedYear}.pdf`);
      toast.success('Report downloaded!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF. Try Print instead.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const buildReportEmailBody = () => {
    const monthName = MONTHS[selectedMonth];
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${settingsData?.companyName || ''}</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">Monthly Performance Report — ${monthName} ${selectedYear}</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <h2 style="color: #1E3A5F; font-size: 16px; margin: 0 0 16px 0;">📊 ${monthName} ${selectedYear} Summary</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="background: #f4f7fa;"><td style="padding: 10px 12px; font-weight: 600; color: #1E3A5F;">💰 Total Revenue</td><td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #27AE60;">${formatCurrency(revenue)}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; color: #1E3A5F;">📋 Jobs This Month</td><td style="padding: 10px 12px; text-align: right;">${monthJobs.length}</td></tr>
      <tr style="background: #f4f7fa;"><td style="padding: 10px 12px; font-weight: 600; color: #1E3A5F;">👥 New Customers</td><td style="padding: 10px 12px; text-align: right;">${monthCustomers.length}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; color: #1E3A5F;">🏆 Bids Won</td><td style="padding: 10px 12px; text-align: right;">${bidsWon}</td></tr>
      <tr style="background: #f4f7fa;"><td style="padding: 10px 12px; font-weight: 600; color: #1E3A5F;">❌ Cancellations</td><td style="padding: 10px 12px; text-align: right;">${cancellations}</td></tr>
    </table>
    <p style="margin-top: 24px; color: #555; font-size: 13px; font-style: italic;">This report was generated from BreezeBoss on ${new Date().toLocaleDateString()}.</p>
    <p>Best regards,<br/><strong>${settingsData?.companyName || ''}</strong></p>
  </div>
</div>`;
  };

  const openEmailReport = () => {
    setReportEmailSubject(`Performance Report — ${MONTHS[selectedMonth]} ${selectedYear}`);
    setEmailReportOpen(true);
  };

  // ── Render functions (shared between page and full-screen modal) ──

  const renderKPICards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {kpiCards.map(card => (
        <Card key={card.label} style={card.cardStyle}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <div className="mt-1">{!card.noTrend && <TrendBadge current={card.curr} prev={card.prev} />}</div>
              </div>
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderRevenueChart = () => (
    <Card>
      <CardHeader><CardTitle className="text-base">Monthly Revenue — {selectedYear}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueByMonth} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, yAxisMax]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} width={55} />
            <Tooltip
              formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label) => `${label} ${selectedYear}`}
              contentStyle={{ borderRadius: '6px', border: '1px solid #e0e0e0' }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {revenueByMonth.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isSelected ? '#1E3A5F' : '#2E9CCA'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderPieCharts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Jobs by Type</CardTitle></CardHeader>
        <CardContent>
          {jobTypesData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No jobs this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={jobTypesData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {jobTypesData.map((_, i) => <Cell key={i} fill={JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Job Status Breakdown (All Time)</CardTitle></CardHeader>
        <CardContent>
          {jobStatusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No jobs yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={jobStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                  {jobStatusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#95A5A6'} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDetailTables = () => (
    <Card>
      <CardHeader><CardTitle className="text-base">Month Detail — {MONTHS[selectedMonth]} {selectedYear}</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="jobs">
          <TabsList className="mb-4">
            <TabsTrigger value="jobs">Jobs ({monthJobs.length})</TabsTrigger>
            <TabsTrigger value="bids">Bids ({monthBids.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({monthInvoices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            {monthJobs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No jobs this month</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Job #</th><th className="pb-2 pr-4">Customer</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Status</th><th className="pb-2 pr-4">Tech</th><th className="pb-2">Value</th>
                  </tr></thead>
                  <tbody>
                    {monthJobs.map(j => {
                      const cust = customerMap[j.customerId];
                      return (
                        <tr key={j.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-mono text-xs">{j.jobNumber || '—'}</td>
                          <td className="py-2 pr-4"><button onClick={() => navigate(`/customers/${j.customerId}`)} className="text-secondary hover:underline text-left" title="Go to customer">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</button></td>
                          <td className="py-2 pr-4">{j.jobType}</td>
                          <td className="py-2 pr-4"><StatusBadge status={j.status} /></td>
                          <td className="py-2 pr-4 text-muted-foreground">{j.assignedTech || '—'}</td>
                          <td className="py-2">{formatCurrency(j.totalPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids">
            {monthBids.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No bids this month</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Bid #</th><th className="pb-2 pr-4">Customer</th><th className="pb-2 pr-4">Job</th><th className="pb-2 pr-4">Total</th><th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {monthBids.map(b => {
                      const cust = customerMap[b.customerId];
                      const job = jobMap[b.jobId];
                      return (
                        <tr key={b.id} className={`border-b last:border-0 hover:bg-muted/30 ${b.status === 'Accepted' ? 'bg-emerald-50/50' : ['Declined','Expired'].includes(b.status) ? 'bg-red-50/50' : ''}`}>
                          <td className="py-2 pr-4 font-mono text-xs">{b.bidNumber || '—'}</td>
                          <td className="py-2 pr-4"><button onClick={() => navigate(`/customers/${b.customerId}`)} className="text-secondary hover:underline text-left">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</button></td>
                          <td className="py-2 pr-4"><button onClick={() => navigate(`/jobs/${b.jobId}`)} className="text-secondary hover:underline text-left">{job?.jobName || '—'}</button></td>
                          <td className="py-2 pr-4 font-medium">{formatCurrency(b.totalAmount)}</td>
                          <td className="py-2"><StatusBadge status={b.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices">
            {monthInvoices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No invoices this month</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Invoice #</th><th className="pb-2 pr-4">Customer</th><th className="pb-2 pr-4">Amount</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Due Date</th>
                  </tr></thead>
                  <tbody>
                    {monthInvoices.map(inv => {
                      const cust = customerMap[inv.customerId];
                      return (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-mono text-xs">{inv.invoiceNumber || '—'}</td>
                          <td className="py-2 pr-4"><button onClick={() => navigate(`/customers/${inv.customerId}`)} className="text-secondary hover:underline text-left">{cust ? `${cust.firstName} ${cust.lastName}` : '—'}</button></td>
                          <td className="py-2 pr-4 font-medium">{formatCurrency(inv.totalAmount)}</td>
                          <td className="py-2 pr-4"><StatusBadge status={inv.status} /></td>
                          <td className="py-2 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const renderInsights = () => (
    <Card>
      <CardHeader><CardTitle className="text-base">📊 Monthly Insights</CardTitle></CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available — add more data this month to see insights.</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm flex items-start gap-2 py-2 border-b last:border-0">{insight}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <style>{`
        @media print {
          nav, aside, header, .sidebar, [data-sidebar], .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-area { display: block !important; width: 100%; }
          .page-break { page-break-before: always; }
          .print-header { display: block !important; text-align: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #1E3A5F; }
          canvas { print-color-adjust: exact; }
          .shadow, .shadow-sm { box-shadow: none !important; }
          @page { margin: 0.5in; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="no-print">
        <PageHeader title="Performance Reports" subtitle="Track your business month by month">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFullScreenOpen(true)} className="gap-1.5">
              <Maximize2 className="w-4 h-4" /> View Report
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={generatingPdf} className="gap-1.5">
              <Download className="w-4 h-4" /> {generatingPdf ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button variant="outline" onClick={openEmailReport} className="gap-1.5">
              <Mail className="w-4 h-4" /> Email Report
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </PageHeader>
      </div>

      <div ref={reportRef} className="print-area space-y-6">
        {/* Print header — hidden on screen */}
        <div className="print-header">
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1E3A5F', margin: '0 0 4px 0' }}>
            {settingsData?.companyName || 'BreezeBoss'} — Performance Report
          </h1>
          <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
            {MONTHS[selectedMonth]} {selectedYear} · Generated {new Date().toLocaleDateString()}
          </p>
        </div>

        {renderKPICards()}
        {renderRevenueChart()}
        {renderPieCharts()}
        {renderInsights()}


      </div>

      {/* Email Report Dialog */}
      <Dialog open={emailReportOpen} onOpenChange={setEmailReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email Monthly Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Send To (email address)</Label>
              <Input value={reportEmailTo} onChange={e => setReportEmailTo(e.target.value)} placeholder="owner@company.com" type="email" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={reportEmailSubject} onChange={e => setReportEmailSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="border rounded-md overflow-y-auto bg-white" style={{ maxHeight: '250px' }} dangerouslySetInnerHTML={{ __html: buildReportEmailBody() }} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailReportOpen(false)}>Cancel</Button>
              <Button
                disabled={!reportEmailTo}
                onClick={async () => {
                  await base44.integrations.Core.SendEmail({ to: reportEmailTo, subject: reportEmailSubject, body: buildReportEmailBody() });
                  toast.success(`Report emailed to ${reportEmailTo}`);
                  setEmailReportOpen(false);
                  setReportEmailTo('');
                }}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5"
              >
                <Send className="w-4 h-4" /> Send Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Modal */}
      <Dialog open={fullScreenOpen} onOpenChange={setFullScreenOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>
                Performance Report — {MONTHS[selectedMonth]} {selectedYear}
              </DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={generatingPdf} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> {generatingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button size="sm" variant="outline" onClick={openEmailReport} className="gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Report
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 p-2">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Summary</h3>
              {renderKPICards()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Revenue</h3>
              {renderRevenueChart()}
            </div>
            <div>
              {renderPieCharts()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Insights</h3>
              {renderInsights()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}