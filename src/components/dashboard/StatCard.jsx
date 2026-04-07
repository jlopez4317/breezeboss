import { Card } from '@/components/ui/card';

const CARD_STYLES = {
  'Active Jobs':            { border: '1px solid rgba(230,126,34,0.35)', boxShadow: '0 1px 6px rgba(230,126,34,0.08)', borderTop: '3px solid #e67e22' },
  'Open Bids':              { border: '1px solid rgba(46,156,202,0.35)',  boxShadow: '0 1px 6px rgba(46,156,202,0.08)',  borderTop: '3px solid #2E9CCA' },
  'Outstanding Invoices':   { border: '1px solid rgba(231,76,60,0.35)',   boxShadow: '0 1px 6px rgba(231,76,60,0.08)',   borderTop: '3px solid #e74c3c' },
  "Today's Appointments":   { border: '1px solid rgba(39,174,96,0.35)',   boxShadow: '0 1px 6px rgba(39,174,96,0.08)',   borderTop: '3px solid #27ae60' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow" style={CARD_STYLES[title] || {}}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-secondary" />
        </div>
      </div>
      {trend && (
        <p className="text-xs mt-3 text-emerald-600 font-medium">{trend}</p>
      )}
    </Card>
  );
}