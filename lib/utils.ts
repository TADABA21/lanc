export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'draft':
    case 'overdue':
    case 'terminated':
      return '#EF4444';
    case 'in_progress':
    case 'in-progress':
    case 'pending':
    case 'sent':
    case 'on_leave':
    case 'on-leave':
      return '#F59E0B';
    case 'done':
    case 'completed':
    case 'paid':
    case 'active':
      return '#10B981';
    default:
      return '#64748B';
  }
}