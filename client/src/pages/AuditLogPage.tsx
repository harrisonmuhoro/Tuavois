import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { ApiResponse, PaginationMeta } from '../types';
import { Button, Card, CardBody, Input, LoadingSkeleton, PageHeader, Pagination, Table, Td, Th } from '../components/ui';

type AuditLog = { id: string; action: string; entity: string; entityId?: string; changes?: unknown; createdAt: string; user?: { name: string; email: string } };
export function AuditLogPage() {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const logs = useQuery({ queryKey: ['audit-log', { search, page }], queryFn: async () => (await api.get<ApiResponse<AuditLog[]> & { pagination: PaginationMeta }>('/audit-log', { params: { search, page, limit: 30 } })).data });
  return <div className="p-4 sm:p-6 lg:p-8"><PageHeader title="Audit log" subtitle="Review important financial and operational changes." /><div className="mb-4 flex gap-2"><Input className="max-w-sm" placeholder="Search action or entity…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Button variant="outline" onClick={() => logs.refetch()}>Refresh</Button></div><Card><CardBody className="p-0">{logs.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : logs.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>Unable to load audit logs.</span><Button size="sm" variant="outline" onClick={() => logs.refetch()}>Retry</Button></div> : <><Table><thead><tr><Th>Time</Th><Th>User</Th><Th>Action</Th><Th>Entity</Th><Th>Entity ID</Th></tr></thead><tbody>{(logs.data?.data ?? []).map((log) => <tr key={log.id}><Td>{new Date(log.createdAt).toLocaleString()}</Td><Td>{log.user?.name || 'System'}</Td><Td>{log.action}</Td><Td>{log.entity}</Td><Td className="text-xs text-slate-500">{log.entityId || '—'}</Td></tr>)}</tbody></Table>{logs.data?.pagination && <Pagination {...logs.data.pagination} onPageChange={setPage} />}</>}</CardBody></Card></div>;
}
