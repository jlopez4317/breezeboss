import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function getStatusColor(status) {
  const colors = {
    'Lead': 'bg-gray-100 text-gray-700 border-gray-200',
    'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
    'Scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
    'Sent': 'bg-blue-50 text-blue-700 border-blue-200',
    'Confirmed': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Viewed': 'bg-amber-50 text-amber-700 border-amber-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Accepted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Partial': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Invoiced': 'bg-purple-50 text-purple-700 border-purple-200',
    'Cancelled': 'bg-red-50 text-red-700 border-red-200',
    'Declined': 'bg-red-50 text-red-700 border-red-200',
    'Void': 'bg-red-50 text-red-700 border-red-200',
    'Overdue': 'bg-red-50 text-red-700 border-red-200 animate-pulse-red',
    'No-Show': 'bg-red-50 text-red-700 border-red-200',
    'Expired': 'bg-gray-100 text-gray-500 border-gray-200',
    'Inactive': 'bg-red-50 text-red-600 border-red-200',
    'Rescheduled': 'bg-orange-50 text-orange-700 border-orange-200',
    'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Snoozed': 'bg-purple-50 text-purple-700 border-purple-200',
    'Processing': 'bg-blue-50 text-blue-700 border-blue-200',
    'Complete': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Failed': 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getPriorityColor(priority) {
  const colors = {
    'Low': 'bg-gray-100 text-gray-600',
    'Normal': 'bg-blue-50 text-blue-600',
    'High': 'bg-orange-50 text-orange-600',
    'Emergency': 'bg-red-50 text-red-600',
  };
  return colors[priority] || 'bg-gray-100 text-gray-600';
}

export async function generateNumber(prefix, entity, fieldName) {
  const year = new Date().getFullYear();
  const items = await entity.list(`-${fieldName}`, 1);
  let nextNum = 1;
  if (items.length > 0 && items[0][fieldName]) {
    const match = items[0][fieldName].match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}