import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Mail, MapPin, Wrench, CalendarDays, Receipt, MessageSquare } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import CustomerStatusDropdown from '@/components/shared/CustomerStatusDropdown';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const priorityColors = {
  Low: 'bg-gray-100 text-gray-700 border-gray-200',
  Normal: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200',
  Emergency: 'bg-red-50 text-red-700 border-red-200',
};

function PriorityBadge({ priority }) {
  return (
    <div className="priority-badge">
      <Badge variant="outline" className={`text-xs font-medium border ${priorityColors[priority] || priorityColors.Normal}`}>
        {priority || 'Normal'}
      </Badge>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => base44.entities.Customer.list().then(all => all.find(c => c.id === id)),
    initialData: () => queryClient.getQueryData(['customers'])?.find(c => c.id === id),
  });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });
  const { data: equipment = [] } = useQuery({ queryKey: ['equipment'], queryFn: () => base44.entities.CustomerEquipment.list('-created_date', 200) });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => base44.entities.Appointment.list('-scheduledDate', 200) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 200) });

  if (!customer) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>;

  const customerJobs = jobs.filter(j => j.customerId === id);
  const customerEquipment = equipment.filter(e => e.customerId === id);
  const customerAppts = appointments.filter(a => a.customerId === id);
  const customerInvoices = invoices.filter(i => i.customerId === id);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/customers')} className="mb-4 gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {customer.firstName?.[0]}{customer.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                <CustomerStatusDropdown customerId={customer.id} status={customer.status} />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
                <PriorityBadge priority={customer.priority || 'Normal'} />
              </div>
              {customer.source && <span className="text-xs text-muted-foreground mt-auto mb-1">via {customer.source}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/jobs?new=true&customerId=${id}`)} className="gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> New Job
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/appointments?new=true&customerId=${id}`)} className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Appointment
          </Button>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <Phone className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{customer.phone || '—'}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Mail className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{customer.email || '—'}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm font-medium">{customer.address ? `${customer.address}, ${customer.city || ''} ${customer.state || ''} ${customer.zip || ''}` : '—'}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-xs text-muted-foreground">Customer Since</p>
            <p className="text-sm font-medium">
              {customer.created_date
                ? new Date(customer.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <TabsList className="mb-4">
          <TabsTrigger value="jobs">Jobs ({customerJobs.length})</TabsTrigger>
          <TabsTrigger value="equipment">Equipment ({customerEquipment.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({customerAppts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({customerInvoices.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          {customerJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No jobs for this customer yet.</p>
          ) : (
            <div className="space-y-2">
              {customerJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:border-secondary/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{job.jobNumber}</span>
                      <span className="text-sm font-medium">{job.jobName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.jobType} · {formatDate(job.scheduledDate)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{formatCurrency(job.totalPrice)}</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
                      <PriorityBadge priority={customer.priority} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipment">
          {customerEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No equipment registered.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerEquipment.map(eq => (
                <Card key={eq.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{eq.equipmentType}</p>
                      <p className="text-sm text-muted-foreground">{eq.brand} {eq.model}</p>
                    </div>
                    <StatusBadge status={eq.condition} />
                  </div>
                  {eq.serialNumber && <p className="text-xs text-muted-foreground mt-2">S/N: {eq.serialNumber}</p>}
                  {eq.installDate && <p className="text-xs text-muted-foreground">Installed: {formatDate(eq.installDate)}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments">
          {customerAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No appointments.</p>
          ) : (
            <div className="space-y-2">
              {customerAppts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{a.appointmentType}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.scheduledDate)} at {a.scheduledTime}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {customerInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invoices.</p>
          ) : (
            <div className="space-y-2">
              {customerInvoices.map(inv => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:border-secondary/50 transition-colors">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                    <p className="text-sm font-medium">{formatDate(inv.invoiceDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <p className="text-sm whitespace-pre-wrap">{customer.notes || 'No notes yet.'}</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}