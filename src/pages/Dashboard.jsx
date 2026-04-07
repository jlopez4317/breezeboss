import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CompanySetup from '@/pages/CompanySetup';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/dashboard/StatCard';
import {
  Wrench, FileText, Receipt, CalendarDays, Bell, Plus, ScanLine,
  Users, Clock, ArrowRight, CheckCircle2, MapPin
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: () => base44.entities.Settings.list('-created_date', 1) });
  const settingsData = settingsList[0];
  const showSetup = !settingsLoading && (!settingsData || !settingsData.onboardingComplete);

  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 100) });
  const { data: bids = [] } = useQuery({ queryKey: ['bids'], queryFn: () => base44.entities.Bid.list('-created_date', 50) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 200) });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => base44.entities.Appointment.list('-scheduledDate', 50) });
  const { data: reminders = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => base44.entities.Reminder.filter({ status: 'Pending' }, '-dueDate', 20) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 10) });

  const markDoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Reminder.update(id, { status: 'Done' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const activeJobs = jobs.filter(j => ['Lead', 'Scheduled', 'In Progress'].includes(j.status));
  const openBids = bids.filter(b => ['Draft', 'Sent', 'Viewed'].includes(b.status));
  const outstandingInvoices = invoices.filter(i => ['Sent', 'Viewed', 'Partial', 'Overdue'].includes(i.status));
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.scheduledDate === today && a.status !== 'Cancelled');
  const recentJobs = jobs.slice(0, 5);

  const openBidsTotal = openBids.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

  if (showSetup) {
    return <CompanySetup existingSettings={settingsData} onComplete={() => queryClient.invalidateQueries({ queryKey: ['settings'] })} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/customers?new=true')} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Customer
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/jobs?new=true')} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Job
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/appointments?new=true')} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Appointment
          </Button>
          <Button size="sm" onClick={() => navigate('/blueprint-scanner')} className="gap-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <ScanLine className="w-3.5 h-3.5" /> Scan Blueprint
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Jobs" value={activeJobs.length} subtitle={`${jobs.filter(j => j.status === 'In Progress').length} in progress`} icon={Wrench} />
        <StatCard title="Open Bids" value={formatCurrency(openBidsTotal)} subtitle={`${openBids.length} pending`} icon={FileText} />
        <StatCard title="Outstanding Invoices" value={formatCurrency(outstandingTotal)} subtitle={`${outstandingInvoices.length} unpaid`} icon={Receipt} />
        <StatCard title="Today's Appointments" value={todayAppts.length} subtitle={todayAppts[0] ? `Next: ${todayAppts[0].scheduledTime}` : 'No appointments today'} icon={CalendarDays} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Today's Schedule */}
          <Card style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', border: '1px solid #81c784', boxShadow: '0 1px 6px rgba(39,174,96,0.15)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold" style={{ color: '#2e7d32' }}>Today's Schedule</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')} className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayAppts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No appointments scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todayAppts.map(appt => (
                    <div key={appt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-14 text-center">
                        <p className="text-sm font-semibold text-secondary">{appt.scheduledTime}</p>
                        <p className="text-[10px] text-muted-foreground">{appt.duration}min</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appt.appointmentType}</p>
                        {appt.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {appt.address}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Jobs</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No jobs yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">{job.jobNumber}</span>
                          <span className="text-sm font-medium truncate">{job.jobName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.jobType}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(job.totalPrice)}</span>
                        <StatusBadge status={job.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reminders */}
          <Card style={reminders.length > 0 ? { background: 'linear-gradient(135deg, #fffbea, #fff8dc)', border: '1px solid #ffd54f' } : {}}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-secondary" /> Reminders
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')} className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending reminders.</p>
              ) : (
                <div className="space-y-2">
                  {reminders.slice(0, 5).map(rem => (
                    <div key={rem.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rem.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(rem.dueDate)}{rem.dueTime ? ` at ${rem.dueTime}` : ''}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markDoneMutation.mutate(rem.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Customers */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" /> Recent Customers
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customers')} className="text-xs gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No customers yet.</p>
              ) : (
                <div className="space-y-2">
                  {customers.slice(0, 5).map(c => (
                    <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.city || c.phone}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}