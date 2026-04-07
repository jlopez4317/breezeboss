import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, MapPin, List, LayoutGrid, Pencil } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const TYPES = ['Estimate', 'Install', 'Repair', 'Maintenance', 'Follow-up', 'Sales Call'];
const STATUSES = ['Scheduled', 'Confirmed', 'Completed', 'No-Show', 'Cancelled', 'Rescheduled'];
const OUTCOMES = ['Sold', 'Not Sold', 'Follow-up Needed', 'Repair Made', 'No Issue Found', 'Scheduled Return'];

export default function Appointments() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === 'true');
  const presetCustomerId = searchParams.get('customerId') || '';
  const [view, setView] = useState('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState(presetCustomerId);
  const [addressValue, setAddressValue] = useState('');
  const [editingAppt, setEditingAppt] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editType, setEditType] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTimeFrom, setEditTimeFrom] = useState('');
  const [editTimeTo, setEditTimeTo] = useState('');
  const [newTimeFrom, setNewTimeFrom] = useState('');
  const [newTimeTo, setNewTimeTo] = useState('');
  const [editTech, setEditTech] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editJobId, setEditJobId] = useState('');

  const { data: appointments = [], isLoading } = useQuery({ queryKey: ['appointments'], queryFn: () => base44.entities.Appointment.list('-scheduledDate', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => base44.entities.Job.list('-created_date', 200) });

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    const cust = customerMap[customerId];
    if (cust) {
      setAddressValue([cust.address, cust.city, cust.state, cust.zip].filter(Boolean).join(', '));
    } else {
      setAddressValue('');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setFormOpen(false); setSelectedCustomerId(''); setAddressValue(''); toast.success('Appointment created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Appointment removed.'); },
    onError: () => toast.error('Failed to remove appointment.'),
  });

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.scheduledDate === today);
  const upcoming = appointments.filter(a => a.scheduledDate > today && a.status !== 'Cancelled');
  const past = appointments.filter(a => a.scheduledDate < today);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const cust = customerMap[data.customerId];
    if (cust && !data.address) {
      data.address = [cust.address, cust.city, cust.state, cust.zip].filter(Boolean).join(', ');
    }
    data.scheduledTime = newTimeFrom || '';
    data.scheduledTimeTo = newTimeTo || null;
    createMutation.mutate(data);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const AppointmentCard = ({ appt, onDelete }) => {
    const cust = customerMap[appt.customerId];
    return (
      <div className="bg-card rounded-lg border p-4 hover:border-secondary/50 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{appt.appointmentType}</p>
            <p className="text-sm text-muted-foreground">{cust ? `${cust.firstName} ${cust.lastName}` : 'Unknown'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={appt.status} />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-secondary"
              title="Edit Appointment"
              onClick={() => {
                setEditingAppt(appt);
                setEditCustomerId(appt.customerId || '');
                setEditAddress(appt.address || '');
                setEditType(appt.appointmentType || 'Estimate');
                setEditDate(appt.scheduledDate || '');
                setEditTimeFrom(appt.scheduledTime || '');
                setEditTimeTo(appt.scheduledTimeTo || '');
                setEditTech(appt.assignedTech || '');
                setEditNotes(appt.notes || '');
                setEditStatus(appt.status || 'Scheduled');
                setEditJobId(appt.jobId || '');
                setEditFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(appt.scheduledDate)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {appt.scheduledTime && formatTime(appt.scheduledTime)}
            {appt.scheduledTimeTo && ` — ${formatTime(appt.scheduledTimeTo)}`}
          </span>
        </div>
        {appt.address && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {appt.address}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          {(appt.status === 'Scheduled' || appt.status === 'Confirmed') && (
            <>
              {appt.status === 'Scheduled' && (
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: appt.id, data: { status: 'Confirmed' } })}>Confirm</Button>
              )}
              <Button size="sm" variant="outline" className="bg-green-50 border-green-400 text-green-700 hover:bg-green-100" onClick={() => updateMutation.mutate({ id: appt.id, data: { status: 'Completed' } })}>✓ Complete</Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 ml-auto"
            onClick={() => { if (window.confirm('Delete this appointment? This cannot be undone.')) { onDelete(appt.id); } }}
          >
            🗑 Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Appointments" subtitle={`${todayAppts.length} today`} actionLabel="New Appointment" onAction={() => { setSelectedCustomerId(presetCustomerId || ''); setAddressValue(''); setFormOpen(true); }} />

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({todayAppts.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {todayAppts.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No appointments today" description="Schedule an appointment to get started." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayAppts.map(a => <AppointmentCard key={a.id} appt={a} onDelete={(id) => deleteMutation.mutate(id)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming appointments" description="Schedule future appointments." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map(a => <AppointmentCard key={a.id} appt={a} onDelete={(id) => deleteMutation.mutate(id)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.slice(0, 20).map(a => <AppointmentCard key={a.id} appt={a} onDelete={(id) => deleteMutation.mutate(id)} />)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setSelectedCustomerId(presetCustomerId || ''); setAddressValue(''); setNewTimeFrom(''); setNewTimeTo(''); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <Select name="customerId" value={selectedCustomerId} onValueChange={handleCustomerChange} required>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select name="appointmentType" defaultValue="Estimate">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Date *</Label><Input name="scheduledDate" type="date" required /></div>
              <div>
                <Label>From *</Label>
                <Select value={newTimeFrom} onValueChange={setNewTimeFrom}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 24}, (_, h) => ['00','30'].map(m => {
                      const val = `${String(h).padStart(2,'0')}:${m}`;
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const hour = h % 12 || 12;
                      return <SelectItem key={val} value={val}>{hour}:{m} {ampm}</SelectItem>;
                    })).flat()}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To</Label>
                <Select value={newTimeTo} onValueChange={setNewTimeTo}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {Array.from({length: 24}, (_, h) => ['00','30'].map(m => {
                      const val = `${String(h).padStart(2,'0')}:${m}`;
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const hour = h % 12 || 12;
                      return <SelectItem key={val} value={val}>{hour}:{m} {ampm}</SelectItem>;
                    })).flat()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Job (optional)</Label>
              <Select name="jobId">
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.jobNumber} — {j.jobName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Assigned Tech</Label><Input name="assignedTech" /></div>
            <div><Label>Address</Label><Input name="address" value={addressValue} onChange={e => setAddressValue(e.target.value)} placeholder="Auto-filled from customer" /></div>
            <div><Label>Notes</Label><Textarea name="notes" rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Create Appointment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Appointment Dialog */}
      <Dialog open={editFormOpen} onOpenChange={(open) => { setEditFormOpen(open); if (!open) setEditingAppt(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          {editingAppt && (
            <div className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={editCustomerId} onValueChange={(val) => { setEditCustomerId(val); const cust = customerMap[val]; if (cust) setEditAddress([cust.address, cust.city, cust.state, cust.zip].filter(Boolean).join(', ')); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div>
                  <Label>From *</Label>
                  <Select value={editTimeFrom} onValueChange={setEditTimeFrom}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 24}, (_, h) => ['00','30'].map(m => {
                        const val = `${String(h).padStart(2,'0')}:${m}`;
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const hour = h % 12 || 12;
                        return <SelectItem key={val} value={val}>{hour}:{m} {ampm}</SelectItem>;
                      })).flat()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To</Label>
                  <Select value={editTimeTo} onValueChange={setEditTimeTo}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {Array.from({length: 24}, (_, h) => ['00','30'].map(m => {
                        const val = `${String(h).padStart(2,'0')}:${m}`;
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const hour = h % 12 || 12;
                        return <SelectItem key={val} value={val}>{hour}:{m} {ampm}</SelectItem>;
                      })).flat()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Job (optional)</Label>
                <Select value={editJobId} onValueChange={setEditJobId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.jobNumber} — {j.jobName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned Tech</Label>
                <Input value={editTech} onChange={e => setEditTech(e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setEditFormOpen(false); setEditingAppt(null); }}>Cancel</Button>
                <Button
                  onClick={() => {
                    const data = {
                      customerId: editCustomerId,
                      appointmentType: editType,
                      scheduledDate: editDate,
                      scheduledTime: editTimeFrom,
                      scheduledTimeTo: editTimeTo || null,
                      assignedTech: editTech,
                      address: editAddress,
                      notes: editNotes,
                      status: editStatus,
                      jobId: editJobId || null,
                    };
                    updateMutation.mutate({ id: editingAppt.id, data });
                    setEditFormOpen(false);
                    setEditingAppt(null);
                    toast.success('Appointment updated!');
                  }}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}