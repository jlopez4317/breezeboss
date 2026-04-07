import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Send, FileText, Eye } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_TEMPLATE_NAMES = [
  'Appointment Reminder',
  'Bid Follow-Up',
  'Maintenance Reminder',
  'Review Request — All Platforms',
  'Review Request — Facebook',
  'Review Request — Google',
  'Review Request — Nextdoor',
  'Review Request — Yelp',
  'Thank You — After Service',
  'Thank You — New Customer',
  'Welcome — New Lead',
];

const TEMPLATE_CATEGORIES = [
  'Appointment Reminder',
  'Bid Follow-Up',
  'Promotion',
  'Review Request',
  'Thank You',
  'Welcome',
  'Seasonal Offer',
  'Payment Reminder',
  'Service Due',
  'Follow-Up',
  'Newsletter',
  'Other',
];

export default function EmailCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplMessage, setTplMessage] = useState('');


  const { data: templates = [] } = useQuery({ queryKey: ['emailTemplates'], queryFn: () => base44.entities.EmailTemplate.list('name', 100) });


  const { data: sentEmails = [] } = useQuery({ queryKey: ['sentEmails'], queryFn: () => base44.entities.SentEmail.list('-sentAt', 100) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('firstName', 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => base44.entities.Appointment.list('-scheduledDate', 200) });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list() });

  const settingsData = settings[0] || {};
  const { googleReviewUrl = '', facebookReviewUrl = '', yelpReviewUrl = '', nextdoorReviewUrl = '' } = settingsData;
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  // Resolve all placeholders in template body and inject footer
  const resolveBody = (html, cust) => {
    if (!html) return '';
    let resolved = html
      .replaceAll('[COMPANY_NAME]', settingsData.companyName || '')
      .replaceAll('[COMPANY_PHONE]', settingsData.companyPhone || '')
      .replaceAll('[COMPANY_EMAIL]', settingsData.companyEmail || '')
      .replaceAll('[COMPANY_ADDRESS]', settingsData.companyAddress || '')
      .replaceAll('[COMPANY_WEBSITE]', settingsData.companyWebsite || '')
      .replaceAll('[COMPANY_LICENSE]', settingsData.licenseNumber || '')
      .replaceAll('[GOOGLE_REVIEW_LINK]', settingsData.googleReviewUrl || '#')
      .replaceAll('[FACEBOOK_REVIEW_LINK]', settingsData.facebookReviewUrl || '#')
      .replaceAll('[YELP_REVIEW_LINK]', settingsData.yelpUrl || '#')
      .replaceAll('[NEXTDOOR_REVIEW_LINK]', settingsData.nextdoorUrl || '#')
      .replaceAll('[CUSTOMER_FIRST_NAME]', cust?.firstName || '')
      .replaceAll('[CUSTOMER_LAST_NAME]', cust?.lastName || '')
      .replaceAll('[FirstName]', cust?.firstName || '')
      .replaceAll('[LastName]', cust?.lastName || '');

    // Resolve assigned tech from customer's active job
    const customerJobs = jobs?.filter(j => j.customerId === cust?.id) || [];
    const activeJob = customerJobs.find(j => ['In Progress', 'Scheduled'].includes(j.status)) || customerJobs[0];
    const assignedTech = activeJob?.assignedTech || '';
    resolved = resolved.replaceAll('[ASSIGNED_TECH]', assignedTech);

    // Resolve appointment placeholders from customer's next upcoming appointment
    const todayStr = new Date().toISOString().split('T')[0];
    const customerAppointments = appointments
      .filter(a => a.customerId === cust?.id && a.scheduledDate >= todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const nextAppt = customerAppointments[0];
    const apptDate = nextAppt?.scheduledDate
      ? new Date(nextAppt.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const formatApptTime = (timeStr) => {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };
    resolved = resolved
      .replaceAll('[APPOINTMENT_DATE]', apptDate || 'TBD')
      .replaceAll('[APPOINTMENT_TIME]', 
        nextAppt?.scheduledTimeTo 
          ? `${formatApptTime(nextAppt.scheduledTime)} — ${formatApptTime(nextAppt.scheduledTimeTo)}`
          : formatApptTime(nextAppt?.scheduledTime) || 'TBD'
      )
      .replaceAll('[APPOINTMENT_TYPE]', nextAppt?.appointmentType || '')
      .replaceAll('[CUSTOMER_ADDRESS]', nextAppt?.address || cust?.address || '');

    // Inject company footer before the last closing </div> tag
    const footer = getCompanyFooter();
    if (footer && !resolved.includes('data-footer-injected')) {
      resolved = resolved.replace(/<\/div>\s*$/, `${footer}</div>`);
    }

    return resolved;
  };

  const getCompanyFooter = () => {
    const s = settingsData;
    if (!s?.companyName) return '';
    const lines = [];
    lines.push(`<strong style="font-size:13px; color:#1E3A5F;">${s.companyName}</strong>`);
    if (s.companyAddress) lines.push(s.companyAddress);
    if (s.companyPhone) lines.push(`Phone: ${s.companyPhone}`);
    if (s.companyEmail) lines.push(`Email: <a href="mailto:${s.companyEmail}" style="color:#2E9CCA; text-decoration:none;">${s.companyEmail}</a>`);
    if (s.companyWebsite) lines.push(`Website: <a href="${s.companyWebsite}" style="color:#2E9CCA; text-decoration:none;">${s.companyWebsite}</a>`);
    if (s.licenseNumber) lines.push(`License #: ${s.licenseNumber}`);
    return `<div data-footer-injected="true" style="margin-top:28px; padding-top:16px; padding-bottom:24px; margin-bottom:8px; border-top:2px solid #2E9CCA; font-family:Arial,sans-serif; font-size:12px; color:#555555; line-height:2;">${lines.join('<br>')}</div><hr style="border:none; border-top:1px solid #e0e0e0; margin:16px 0 8px 0;">`;
  };


  const selectedCustomer = customerMap[selectedCustomerId];

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      toast.success('Template deleted.');
    },
    onError: () => toast.error('Failed to delete template.'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setTemplateModalOpen(false);
      toast.success('Template created!');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setTemplateModalOpen(false);
      toast.success('Template updated!');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const cust = customerMap[selectedCustomerId];
      if (!cust?.email) { throw new Error('Customer has no email'); }
      const finalSubject = resolveBody(subject, cust);
      const finalBody = resolveBody(body, cust);
      try {
        const sendResult = await base44.functions.invoke('sendProposalEmail', {
          to: cust.email,
          subject: finalSubject,
          htmlBody: finalBody,
        });
        if (sendResult?.data?.error) {
          throw new Error(sendResult.data.message || sendResult.data.error || `Delivery error for ${cust.email}`);
        }
      } catch (sendErr) {
        console.error('SendEmail API error details:', JSON.stringify(sendErr));
        throw new Error(sendErr?.message || sendErr?.error || `Delivery error for ${cust.email}. Check browser console for details.`);
      }
      await base44.entities.SentEmail.create({
        customerId: selectedCustomerId,
        templateId: selectedTemplate?.id,
        to: cust.email,
        subject: finalSubject,
        body: finalBody,
        sentAt: new Date().toISOString(),
        status: 'Sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentEmails'] });
      setComposeOpen(false);
      setSelectedTemplate(null);
      setSelectedCustomerId('');
      setSubject('');
      setBody('');
      toast.success(`Email sent successfully!`);
    },
    onError: (err) => {
      console.error('Email send failed:', err);
      const msg = err?.message || err?.error || JSON.stringify(err) || 'Unknown error';
      toast.error(`Send failed: ${msg}`, { duration: 8000 });
    },
  });

  const extractMessageFromHtml = (html) => {
    if (!html) return '';
    let text = html.replace(/<[^>]*>/g, ' ');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const filtered = lines.filter(l => {
      return l &&
        !l.match(/^Dear\s/) &&
        !l.match(/^Best regards/) &&
        !l.match(/^\[COMPANY_NAME\]/) &&
        !l.match(/^\[COMPANY_PHONE\]/) &&
        !l.match(/^\[COMPANY_EMAIL\]/) &&
        !l.match(/^Contact Us/i) &&
        !l.match(/^\(321\)/) &&
        !l.match(/^info@/) &&
        !l.match(/^Juanderful/) &&
        !l.match(/^BreezeBoss/) &&
        l.length > 2;
    });
    return filtered.join('\n\n');
  };

  const buildHtmlFromFields = (name, subject, message) => {
    const paragraphs = message
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `    <p style="font-size:15px; line-height:1.7; margin:0 0 16px 0;">${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('\n');
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size:16px; margin:0 0 16px 0;">Dear [CUSTOMER_FIRST_NAME],</p>
${paragraphs}
    <p style="margin:24px 0 0 0;">Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
  </div>
</div>`;
  };

  const stripHtmlForEditing = (html) => {
    if (!html) return '';
    const withoutTags = html
      .replace(/<[^>]*>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return withoutTags;
  };

  const wrapInEmailHtml = (plainText) => {
    if (!plainText) return '';
    const paragraphs = plainText
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p style="font-size:15px; line-height:1.6; margin: 0 0 16px 0;">${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('\n     ');
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
     ${paragraphs}
  </div>
</div>`;
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplCategory('');
    setTplSubject('');
    setTplBody('');
    setTplMessage('');
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (t) => {
    setEditingTemplate(t);
    setTplName(t.name || '');
    setTplCategory(t.category || '');
    setTplSubject(t.subject || '');
    setTplBody(t.body || '');
    setTplMessage(extractMessageFromHtml(t.body || ''));
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    const htmlBody = buildHtmlFromFields(tplName, tplSubject, tplMessage);
    const data = { name: tplName, category: tplCategory, subject: tplSubject, body: htmlBody };
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const openCompose = (template = null, custId = '') => {
    const cust = customerMap[custId];
    setSelectedTemplate(template);
    setSubject(template?.subject || '');
    setBody(template ? resolveBody(template.body, cust) : '');
    setComposeOpen(true);
  };

  return (
    <div>
      <PageHeader title="Email Center" subtitle="Send emails and manage templates" actionLabel="Compose Email" onAction={() => openCompose()} icon={Send}>
        <Button size="sm" variant="outline" onClick={openCreateTemplate} className="text-xs gap-1">
          + New Template
        </Button>
      </PageHeader>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">Sent Emails ({sentEmails.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No email templates yet. They'll be created during setup.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <Card key={t.id} className="hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => openCompose(t)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t.category}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.subject}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                           <Button size="sm" variant="ghost" className="gap-1 text-secondary"><Send className="w-3 h-3" /> Use Template</Button>
                           {!DEFAULT_TEMPLATE_NAMES.includes(t.name) && (
                                                  <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEditTemplate(t); }}>✏️ Edit</Button>
                                                )}
                                                {!DEFAULT_TEMPLATE_NAMES.includes(t.name) && (
                             <Button
                               size="sm"
                               variant="ghost"
                               className="gap-1 text-destructive hover:text-destructive"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (window.confirm(`Delete "${t.name}"? This cannot be undone.`)) {
                                   deleteTemplateMutation.mutate(t.id);
                                 }
                               }}
                             >
                               🗑️ Delete
                             </Button>
                           )}
                         </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {sentEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No emails sent yet.</p>
          ) : (
            <div className="bg-card rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentEmails.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(e.sentAt)}</TableCell>
                      <TableCell className="text-sm">{e.to}</TableCell>
                      <TableCell className="text-sm font-medium">{e.subject}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={(val) => {
                setSelectedCustomerId(val);
                if (selectedTemplate) {
                  const cust = customerMap[val];
                  setBody(resolveBody(selectedTemplate.body, cust));
                  setSubject(resolveBody(selectedTemplate.subject, cust));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Choose a customer..." /></SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.email).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input 
                readOnly 
                value={`${settingsData.resendFromName || settingsData.companyName || ''} <${settingsData.resendFromEmail || settingsData.companyEmail || ''}>`} 
                className="bg-muted text-muted-foreground" 
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="min-h-[150px] text-sm"
                placeholder="Type your message here, or select a template above to auto-fill."
              />
            </div>


            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={() => sendMutation.mutate()} disabled={!selectedCustomerId || !subject || sendMutation.isPending} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5">
                <Send className="w-4 h-4" /> {sendMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Template admin fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="e.g. Follow-Up After Visit" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={tplCategory} onValueChange={setTplCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input value={tplSubject} onChange={e => setTplSubject(e.target.value)} placeholder="e.g. Following up on your recent service, [CUSTOMER_FIRST_NAME] (optional)" />
            </div>

            {/* Visual email builder */}
            <div>
              <Label className="mb-2 block">Email Message</Label>
              <div style={{border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', fontFamily: 'Arial, sans-serif', fontSize: '14px'}}>

                {/* Navy header */}
                <div style={{backgroundColor: '#1E3A5F', padding: '20px 24px', textAlign: 'center'}}>
                  <div style={{color: '#ffffff', fontWeight: 'bold', fontSize: '18px'}}>{settingsData?.companyName || 'Your Company Name'}</div>
                  <div style={{color: '#aac8e8', fontSize: '12px', marginTop: '4px'}}>
                    {settingsData?.companyPhone || ''}{settingsData?.companyPhone && settingsData?.companyEmail ? ' · ' : ''}{settingsData?.companyEmail || ''}
                  </div>
                </div>

                {/* White body */}
                <div style={{backgroundColor: '#ffffff', padding: '24px 28px', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0'}}>
                  <div style={{fontSize: '15px', marginBottom: '12px', color: '#1a1a1a'}}>
                    Dear [Customer First Name],
                  </div>
                  <Textarea
                    value={tplMessage}
                    onChange={e => setTplMessage(e.target.value)}
                    style={{width: '100%', minHeight: '140px', border: '1px dashed #2E9CCA', borderRadius: '6px', padding: '10px', fontSize: '14px', lineHeight: '1.7', color: '#1a1a1a', background: '#f9fdff', resize: 'vertical', fontFamily: 'Arial, sans-serif'}}
                    placeholder={"Write your message here...\n\nSeparate paragraphs with a blank line.\nUse [CUSTOMER_FIRST_NAME] anywhere to personalize."}
                  />
                  <div style={{fontSize: '14px', marginTop: '16px', color: '#1a1a1a'}}>
                    Best regards,<br/><strong>{settingsData?.companyName || 'Your Company'}</strong>
                  </div>
                </div>

                {/* Branded footer matching real templates */}
                <div style={{backgroundColor: '#ffffff', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', padding: '16px 28px 20px 28px', borderTop: '2px solid #2E9CCA'}}>
                  <div style={{fontSize: '12px', color: '#555555', lineHeight: '2', fontFamily: 'Arial, sans-serif'}}>
                    <strong style={{fontSize: '13px', color: '#1E3A5F'}}>{settingsData?.companyName || ''}</strong><br/>
                    {settingsData?.companyAddress ? <>{settingsData.companyAddress}<br/></> : null}
                    {settingsData?.companyPhone ? <>Phone: {settingsData.companyPhone}<br/></> : null}
                    {settingsData?.companyEmail ? <>Email: <span style={{color: '#2E9CCA'}}>{settingsData.companyEmail}</span><br/></> : null}
                    {settingsData?.companyWebsite ? <>Website: <span style={{color: '#2E9CCA'}}>{settingsData.companyWebsite}</span><br/></> : null}
                    {settingsData?.licenseNumber ? <>License #: {settingsData.licenseNumber}</> : null}
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={!tplName || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}