import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/services';
import type { Notification } from '../types';
import { Button, Card, CardBody, EmptyState, LoadingSkeleton, PageHeader, Pagination, StatusBadge } from '../components/ui';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const notifications = useQuery({ queryKey: ['notifications', page], queryFn: async () => (await notificationsApi.list({ page, limit: 20 })).data });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const records = notifications.data?.data ?? [];
  return <div className="p-4 sm:p-6 lg:p-8"><PageHeader title="Notifications" subtitle="Stay on top of payments, invoices, and upcoming operations." actions={<Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>Mark all read</Button>} /><Card><CardBody className="divide-y divide-slate-100 p-0">{notifications.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : notifications.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>Unable to load notifications.</span><Button size="sm" variant="outline" onClick={() => notifications.refetch()}>Retry</Button></div> : records.length === 0 ? <EmptyState title="You are all caught up" description="New operational alerts will appear here." /> : records.map((notification: Notification) => <button key={notification.id} className={`block w-full p-5 text-left transition hover:bg-slate-50 ${notification.read ? 'opacity-60' : ''}`} onClick={() => !notification.read && markRead.mutate(notification.id)}><div className="flex items-start justify-between gap-4"><div><p className="font-medium text-slate-900">{notification.title}</p><p className="mt-1 text-sm text-slate-600">{notification.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p></div><StatusBadge status={notification.type} /></div></button>)}</CardBody></Card>{notifications.data?.pagination && <Pagination {...notifications.data.pagination} onPageChange={setPage} />}</div>;
}
