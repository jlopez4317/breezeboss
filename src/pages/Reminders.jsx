import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getPriorityColor } from '@/lib/utils';
import { toast } from 'sonner';

const TYPES = ['Call', 'Email', 'Follow-up', 'Payment', 'Service Due', 'Other'];
const PRIORITIES = ['Low', 'Normal', 'High'];

export default function Reminders() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [newDueTime, setNewDueTime] = useState('');

  const { data: reminders = [] } = useQuery({ queryKey: ['reminders'], queryFn: () => base44.entities.Reminder.list('-dueDate', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 200) });

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Reminder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reminders'] }); setFormOpen(false); toast.success('Reminder created'); },
  });

  const markDoneMutation = useMutation({
    mutationFn: (id) => base44.entities.Reminder.update(id, { status: 'Done' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reminders'] }); toast.success('Marked as done'); },
  });

  const today = new Date().toISOString().split('T')[0];
  const todayReminders = reminders.filter(r => r.dueDate === today && r.status === 'Pending');
  const upcomingReminders = reminders.filter(r => r.dueDate > today && r.status === 'Pending');
  const overdueReminders = reminders.filter(r => r.dueDate < today && r.status === 'Pending');
  const doneReminders = reminders.filter(r => r.status === 'Done');

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (data.customerId === '') delete data.customerId;
    data.dueTime = newDueTime || null;
    createMutation.mutate(data);
  };

  const ReminderRow = ({ rem }) => {
    const cust = customerMap[rem.customerId];
    const isOverdue = rem.dueDate < today && rem.status === 'Pending';
    return (
      <div className={`flex items-center gap-4 p-4 bg-card rounded-lg border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''} hover:border-secondary/30 transition-colors`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{rem.title}</p>
            <Badge className={getPriorityColor(rem.priority)}>{rem.priority}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(rem.dueDate)}{rem.dueTime ? ` at ${rem.dueTime}` : ''}</span>
            {cust && <span>{cust.firstName} {cust.lastName}</span>}
            <span>{rem.type}</span>
          </div>
          {rem.notes && <p className="text-xs text-muted-foreground mt-1">{rem.notes}</p>}
        </div>
        {rem.status === 'Pending' && (
          <Button size="sm" variant="outline" onClick={() => markDoneMutation.mutate(rem.id)} className="gap-1.5 text-emerald-600 hover:text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Done
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Reminders" subtitle={`${todayReminders.length + overdueReminders.length} need attention`} actionLabel="Add Reminder" onAction={() => setFormOpen(true)} />

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({todayReminders.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-destructive">Overdue ({overdueReminders.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingReminders.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({doneReminders.length})</TabsTrigger>
        </TabsList>

        {['today', 'overdue', 'upcoming', 'done'].map(tab => {
          const items = { today: todayReminders, overdue: overdueReminders, upcoming: upcomingReminders, done: doneReminders }[tab];
          return (
            <TabsContent key={tab} value={tab}>
              {items.length === 0 ? (
                <EmptyState icon={Bell} title={`No ${tab} reminders`} description={tab === 'today' ? 'You\'re all caught up!' : ''} />
              ) : (
                <div className="space-y-2">{items.map(r => <ReminderRow key={r.id} rem={r} />)}</div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setNewDueTime(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Title *</Label><Input name="title" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Due Date *</Label><Input name="dueDate" type="date" required /></div>
              <div>
                <Label>Due Time</Label>
                <Select value={newDueTime} onValueChange={setNewDueTime}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select name="type" defaultValue="Other">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue="Normal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Customer (optional)</Label>
              <Select name="customerId" defaultValue="">
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea name="notes" rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Create Reminder</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}