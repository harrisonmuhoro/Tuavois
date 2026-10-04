import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { systemApi } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, CardBody, Input, LoadingSkeleton, PageHeader, StatusBadge, Table, Td, Th } from '../components/ui';

type Tab = 'overview' | 'companies' | 'users' | 'reports' | 'audit';

export function SystemAdminPage() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const report = useQuery({ queryKey: ['system-report'], queryFn: async () => (await systemApi.report()).data });
  const companies = useQuery({ queryKey: ['system-companies', search], queryFn: async () => (await systemApi.companies({ limit: 100, search: search || undefined })).data });
  const users = useQuery({ queryKey: ['system-users', search], queryFn: async () => (await systemApi.users({ limit: 100, search: search || undefined })).data });
  const audit = useQuery({ queryKey: ['system-audit', selectedCompanyId], queryFn: async () => (await systemApi.auditLogs({ limit: 100, companyId: selectedCompanyId || undefined })).data, enabled: tab === 'audit' });
  const selectedCompany = useQuery({ queryKey: ['system-company', selectedCompanyId], queryFn: async () => (await systemApi.company(selectedCompanyId!)).data, enabled: Boolean(selectedCompanyId) });
  const suspendCompany = useMutation({ mutationFn: (id: string) => systemApi.suspendCompany(id), onSuccess: () => { setMessage('Company suspended.'); void queryClient.invalidateQueries({ queryKey: ['system-companies'] }); void queryClient.invalidateQueries({ queryKey: ['system-company'] }); } });
  const suspendUser = useMutation({ mutationFn: (id: string) => systemApi.suspendUser(id, 'Suspended by platform administrator'), onSuccess: () => { setMessage('User suspended.'); void queryClient.invalidateQueries({ queryKey: ['system-users'] }); } });

  if (auth?.user.role !== 'SUPERADMIN' || auth.user.scope !== 'GLOBAL') return <Navigate to="/dashboard" replace />;
  const totals = report.data?.data || {};
  const companyRows = companies.data?.data || [];
  const userRows = users.data?.data || [];
  const auditRows = audit.data?.data || [];
  const tabs: Array<[Tab, string]> = [['overview', 'Overview'], ['companies', 'Companies'], ['users', 'Users'], ['reports', 'Reports'], ['audit', 'Audit log']];

  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
    <PageHeader title="System administration" subtitle="Global platform oversight. All data shown here is system scope." />
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Global context · {selectedCompanyId ? `Selected company: ${selectedCompany.data?.data?.name || selectedCompanyId}` : 'No company selected'}</div>
    <div className="flex flex-wrap gap-2 border-b border-slate-200">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`px-4 py-2 text-sm font-medium ${tab === value ? 'border-b-2 border-[#0f4c81] text-[#0f4c81]' : 'text-slate-500'}`}>{label}</button>)}</div>
    {message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {(tab === 'overview' || tab === 'reports') && <section className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{['companies', 'users', 'clients', 'invoices'].map((key) => <Card key={key}><CardBody><p className="text-xs uppercase tracking-wide text-slate-500">{key}</p><p className="mt-2 text-3xl font-bold text-slate-900">{report.isLoading ? '…' : totals[key] ?? 0}</p></CardBody></Card>)}</div>{tab === 'reports' && <Card><CardBody><h2 className="mb-4 font-semibold">Global platform totals</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{['prospects', 'quotations', 'payments', 'trips'].map((key) => <div key={key} className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{key}</p><p className="text-xl font-bold">{totals[key] ?? 0}</p></div>)}</div></CardBody></Card>}</section>}
    {tab === 'companies' && <section className="space-y-4"><div className="flex gap-3"><Input placeholder="Search companies" value={search} onChange={(event) => setSearch(event.target.value)} /><Button variant="outline" onClick={() => { setSearch(''); setSelectedCompanyId(null); }}>Clear</Button></div><div className="grid gap-4 lg:grid-cols-[1fr_320px]"><Card><CardBody className="p-0">{companies.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : <Table><thead><tr><Th>Company</Th><Th>Status</Th><Th>Users</Th><Th>Clients</Th><Th>Actions</Th></tr></thead><tbody>{companyRows.map((company: any) => <tr key={company.id} className={selectedCompanyId === company.id ? 'bg-blue-50' : ''}><Td className="font-medium">{company.name}</Td><Td><StatusBadge status={company.status || 'ACTIVE'} /></Td><Td>{company._count?.users ?? 0}</Td><Td>{company._count?.clients ?? 0}</Td><Td><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedCompanyId(company.id)}>View</Button>{company.status !== 'SUSPENDED' && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => suspendCompany.mutate(company.id)}>Suspend</Button>}</div></Td></tr>)}</tbody></Table>}</CardBody></Card>{selectedCompanyId && <Card><CardBody><h2 className="font-semibold">Selected company</h2>{selectedCompany.isLoading ? <LoadingSkeleton /> : selectedCompany.data?.data && <div className="mt-4 space-y-2 text-sm"><p className="font-medium">{selectedCompany.data.data.name}</p><p>Users: {selectedCompany.data.data.summary?.userCount ?? 0}</p><p>Clients: {selectedCompany.data.data.summary?.clientCount ?? 0}</p><p>Invoices: {selectedCompany.data.data.summary?.invoiceCount ?? 0}</p><p>Trips: {selectedCompany.data.data.summary?.tripCount ?? 0}</p><p>Status: {selectedCompany.data.data.status}</p></div>}</CardBody></Card>}</div></section>}
    {tab === 'users' && <Card><CardBody className="p-0"><div className="border-b border-slate-200 p-4"><Input placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{users.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : <Table><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Company</Th><Th>Status</Th><Th>Actions</Th></tr></thead><tbody>{userRows.map((user: any) => <tr key={user.id}><Td>{user.name}</Td><Td>{user.email}</Td><Td>{user.role?.name}</Td><Td>{user.company?.name || 'Platform'}</Td><Td><StatusBadge status={user.status} /></Td><Td>{user.id !== auth.user.id && user.status !== 'SUSPENDED' && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => suspendUser.mutate(user.id)}>Suspend</Button>}</Td></tr>)}</tbody></Table>}</CardBody></Card>}
    {tab === 'audit' && <Card><CardBody className="p-0">{audit.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : <Table><thead><tr><Th>Time</Th><Th>Action</Th><Th>Entity</Th><Th>Actor</Th><Th>Company</Th></tr></thead><tbody>{auditRows.map((entry: any) => <tr key={entry.id}><Td>{new Date(entry.createdAt).toLocaleString()}</Td><Td>{entry.action}</Td><Td>{entry.entity}</Td><Td>{entry.user?.email || 'System'}</Td><Td>{entry.company?.name || 'Global'}</Td></tr>)}</tbody></Table>}</CardBody></Card>}
  </div>;
}
