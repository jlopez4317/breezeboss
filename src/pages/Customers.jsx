import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Search, Plus, Phone, Mail, Wrench, Eye, Send, Upload, Download } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import CustomerStatusDropdown from '@/components/shared/CustomerStatusDropdown';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const sourceFilter = searchParams.get('source') || '';
  const setSearch = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('q', val); else n.delete('q'); return n; }, { replace: true });
  const setStatusFilter = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('status', val); else n.delete('status'); return n; }, { replace: true });
  const setSourceFilter = (val) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (val) n.set('source', val); else n.delete('source'); return n; }, { replace: true });
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === 'true');
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCustomer, setComposeCustomer] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 200),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list('-created_date', 1),
  });
  const settings = settingsList[0] || {};

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false); setEditingCustomer(null); toast.success('Customer created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: (_, { id }) => { 
      queryClient.invalidateQueries({ queryKey: ['customers'] }); 
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setFormOpen(false); 
      setEditingCustomer(null); 
      toast.success('Customer updated'); 
    },
  });

  const filtered = customers.filter(c => {
    const matchSearch = !search || `${c.firstName} ${c.lastName} ${c.phone} ${c.email} ${c.address} ${c.city}`.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === '' && sourceFilter === '' && !search) return false;
    const matchStatus = statusFilter === '' || statusFilter === 'all' || c.status === statusFilter;
    const matchSource = sourceFilter === '' || sourceFilter === 'all' || c.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const buildEmailBody = (customer, message) => {
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${settings.companyName || ''}</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">${settings.companyPhone || ''} · ${settings.companyEmail || ''}</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear ${customer?.firstName || ''},</p>
    ${message ? message.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('') : '<p>&nbsp;</p>'}
    <p style="margin-top: 32px;">Best regards,<br/><strong>${settings.companyName || ''}</strong></p>
  </div>
  <div style="margin-top:28px; padding-top:16px; padding-bottom:24px; border-top:2px solid #2E9CCA; font-family:Arial,sans-serif; font-size:12px; color:#555555; line-height:2;">
    <strong style="font-size:13px; color:#1E3A5F;">${settings.companyName || ''}</strong><br>
    ${settings.companyAddress || ''}<br>
    Phone: ${settings.companyPhone || ''}<br>
    Email: <a href="mailto:${settings.companyEmail || ''}" style="color:#2E9CCA;">${settings.companyEmail || ''}</a><br>
    Website: <a href="${settings.companyWebsite || ''}" style="color:#2E9CCA;">${settings.companyWebsite || ''}</a><br>
    License #: ${settings.licenseNumber || ''}
  </div>
</div>`;
  };

  const openComposeEmail = (customer) => {
    setComposeCustomer(customer);
    setComposeSubject('');
    setComposeMessage('');
    setComposeOpen(true);
  };

  const downloadTemplate = () => {
    const headers = ['First Name*', 'Last Name*', 'Phone', 'Email', 'Address', 'City', 'State', 'ZIP', 'Status', 'Priority', 'Source', 'Notes'];
    const example = ['John', 'Smith', '(407) 555-1234', 'john@email.com', '123 Main St', 'Orlando', 'FL', '32801', 'Active', 'Normal', 'Referral', 'Existing customer since 2020'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'BreezeBoss_Customer_Import_Template.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { rows: [], errors: ['File appears empty — no data rows found.'] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase()
      .replace('first name*', 'firstname').replace('last name*', 'lastname')
      .replace('first name', 'firstname').replace('last name', 'lastname')
    );
    const rows = [], errors = [];
    lines.slice(1).forEach((line, i) => {
      if (!line.trim()) return;
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      const firstName = row['firstname'] || row['first name'] || '';
      const lastName = row['lastname'] || row['last name'] || '';
      if (!firstName && !lastName) { errors.push(`Row ${i + 2}: Missing first and last name — skipped`); return; }
      rows.push({
        firstName: firstName || '—', lastName: lastName || '—',
        phone: row['phone'] || '', email: row['email'] || '',
        address: row['address'] || '', city: row['city'] || '',
        state: row['state'] || '', zip: row['zip'] || '',
        status: ['Active', 'Inactive', 'Lead'].includes(row['status']) ? row['status'] : 'Active',
        priority: ['Low', 'Normal', 'High', 'Emergency'].includes(row['priority']) ? row['priority'] : 'Normal',
        source: row['source'] || '', notes: row['notes'] || '',
      });
    });
    return { rows, errors };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const { rows, errors } = parseCSV(evt.target.result);
      setImportData(rows); setImportErrors(errors);
      setImportComplete(false); setImportStats({ success: 0, failed: 0 });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData.length) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of importData) {
      try { await base44.entities.Customer.create(row); success++; }
      catch (err) { console.error('Failed to import:', row, err); failed++; }
    }
    setImportStats({ success, failed });
    setImportComplete(true); setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    toast.success(`Import complete! ${success} customers added${failed > 0 ? `, ${failed} failed` : ''}.`);
  };

  const openNew = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} total`} actionLabel="Add Customer" onAction={openNew}>
        <Button variant="outline" onClick={() => { setImportOpen(true); setImportData([]); setImportErrors([]); setImportComplete(false); }} className="gap-1.5">
          <Upload className="w-4 h-4" /> Import CSV
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === 'reset-status' ? '' : val); }}>
          <SelectTrigger className="w-36">
            {statusFilter === '' ? <span className="text-muted-foreground">Status</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset-status">— Status —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Lead">Lead</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(val) => { setSourceFilter(val === 'reset-source' ? '' : val); }}>
          <SelectTrigger className="w-36">
            {sourceFilter === '' ? <span className="text-muted-foreground">Sources</span> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reset-source">— Sources —</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Google">Google</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Nextdoor">Nextdoor</SelectItem>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Walk-in">Walk-in</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 && statusFilter === '' && sourceFilter === '' && !search ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Use the search bar or select a Status / Source filter to view customers.
        </div>
      ) : filtered.length === 0 && !isLoading ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No customers match your search.</p>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="font-medium">{c.firstName} {c.lastName}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{c.city || '—'}</TableCell>
                  <TableCell><CustomerStatusDropdown customerId={c.id} status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${c.id}`)} className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => openComposeEmail(c)} title="Send Email"><Mail className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 w-8 p-0 text-muted-foreground" title="Edit Customer"><Wrench className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input name="firstName" defaultValue={editingCustomer?.firstName} required /></div>
              <div><Label>Last Name *</Label><Input name="lastName" defaultValue={editingCustomer?.lastName} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><PhoneInput name="phone" defaultValue={editingCustomer?.phone} /></div>
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={editingCustomer?.email} /></div>
            </div>
            <div><Label>Address</Label><Input name="address" defaultValue={editingCustomer?.address} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input name="city" defaultValue={editingCustomer?.city} /></div>
              <div><Label>State</Label><Input name="state" defaultValue={editingCustomer?.state} /></div>
              <div><Label>Zip</Label><Input name="zip" defaultValue={editingCustomer?.zip} /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editingCustomer?.status || 'Lead'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue={editingCustomer?.priority || 'Normal'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select name="source" defaultValue={editingCustomer?.source || ''}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Referral', 'Google', 'Facebook', 'Nextdoor', 'Yelp', 'Other'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact Pref</Label>
                <Select name="preferredContactMethod" defaultValue={editingCustomer?.preferredContactMethod || 'Phone'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" defaultValue={editingCustomer?.notes} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {editingCustomer ? 'Update' : 'Create'} Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Customers from CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">Step 1 — Download the template</p>
              <p className="text-xs text-blue-700 mb-3">Fill in the template with your customer data. Works with exports from QuickBooks, Excel, Google Sheets, or any CRM.</p>
              <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download CSV Template
              </Button>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-1">Step 2 — Upload your CSV file</p>
              <p className="text-xs text-muted-foreground mb-3">Supports .csv files exported from QuickBooks, Excel, or Google Sheets</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="w-4 h-4" /> Choose CSV File
              </Button>
            </div>
            {importErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠ {importErrors.length} row(s) will be skipped:</p>
                {importErrors.map((e, i) => <p key={i} className="text-xs text-amber-700">{e}</p>)}
              </div>
            )}
            {importData.length > 0 && !importComplete && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 3 — Review & Import ({importData.length} customer{importData.length !== 1 ? 's' : ''} ready)</p>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-semibold">Name</th>
                        <th className="text-left p-2 font-semibold">Phone</th>
                        <th className="text-left p-2 font-semibold">Email</th>
                        <th className="text-left p-2 font-semibold">City</th>
                        <th className="text-left p-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2">{row.firstName} {row.lastName}</td>
                          <td className="p-2 text-muted-foreground">{row.phone}</td>
                          <td className="p-2 text-muted-foreground">{row.email}</td>
                          <td className="p-2 text-muted-foreground">{row.city}</td>
                          <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" onClick={() => { setImportData([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Clear</Button>
                  <Button onClick={handleImport} disabled={importing} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
                    {importing ? `Importing... (${importStats.success} done)` : `Import ${importData.length} Customers`}
                  </Button>
                </div>
              </div>
            )}
            {importComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-semibold text-green-800">Import Complete!</p>
                <p className="text-sm text-green-700 mt-1">{importStats.success} customer{importStats.success !== 1 ? 's' : ''} successfully imported{importStats.failed > 0 ? ` · ${importStats.failed} failed` : ''}</p>
                <Button className="mt-3" onClick={() => setImportOpen(false)}>Done</Button>
              </div>
            )}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">💡 Importing from QuickBooks?</p>
              <p className="text-xs text-gray-500">Go to Reports → Customer Contact List → Export → Excel. Save as CSV, then map columns to the BreezeBoss template. Takes about 5 minutes for any size database.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Send Email to {composeCustomer?.firstName} {composeCustomer?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>To</Label>
                <Input readOnly value={composeCustomer ? `${composeCustomer.firstName} ${composeCustomer.lastName} <${composeCustomer.email}>` : ''} className="bg-muted text-muted-foreground text-sm" />
              </div>
              <div>
                <Label>From</Label>
                <Input readOnly value={`${settings.resendFromName || settings.companyName || ''} <${settings.resendFromEmail || settings.companyEmail || ''}>`} className="bg-muted text-muted-foreground text-sm" />
              </div>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Enter email subject..." />
            </div>
            <div>
              <Label>Your Message *</Label>
              <Textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)} placeholder="Type your message here..." rows={6} className="resize-y" />
              <p className="text-xs text-muted-foreground mt-1">Your message will appear between the company header and footer.</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email Preview</Label>
              <div className="border rounded-md overflow-y-auto bg-white" style={{ maxHeight: '280px' }} dangerouslySetInnerHTML={{ __html: buildEmailBody(composeCustomer, composeMessage) }} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setComposeOpen(false); setComposeMessage(''); }}>Cancel</Button>
              <Button
                disabled={!composeSubject || !composeMessage.trim() || !composeCustomer?.email}
                onClick={async () => {
                  const finalBody = buildEmailBody(composeCustomer, composeMessage);
                  await base44.integrations.Core.SendEmail({ to: composeCustomer.email, subject: composeSubject, body: finalBody });
                  await base44.entities.SentEmail.create({
                    customerId: composeCustomer.id,
                    to: composeCustomer.email,
                    subject: composeSubject,
                    body: finalBody,
                    sentAt: new Date().toISOString(),
                    status: 'Sent',
                  });
                  setComposeOpen(false);
                  setComposeMessage('');
                  setComposeSubject('');
                  toast.success('Email sent!');
                }}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5"
              >
                <Send className="w-4 h-4" /> Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}