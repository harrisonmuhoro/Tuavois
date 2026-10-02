import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api from '../api/client';
import type { ApiResponse } from '../types';
import { Button, Card, CardBody, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Select, StatusBadge, Table, Td, Th } from '../components/ui';

type Staff = { id: string; name: string; email: string; phone?: string; department?: string; status: string; dateJoined: string; role: { id: string; name: string } };
type Role = { id: string; name: string; description?: string };
const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), phone: z.string().optional(), department: z.string().optional(), roleId: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

export function StaffPage() {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const staff = useQuery({ queryKey: ['admin-staff'], queryFn: async () => (await api.get<ApiResponse<Staff[]>>('/admin/staff')).data }); const roles = useQuery({ queryKey: ['admin-roles'], queryFn: async () => (await api.get<ApiResponse<Role[]>>('/admin/roles')).data });
  const create = useMutation({ mutationFn: (values: FormValues) => api.post('/admin/staff', values), onSuccess: () => { client.invalidateQueries({ queryKey: ['admin-staff'] }); setOpen(false); form.reset(); } });
  return <div className="p-4 sm:p-6 lg:p-8"><PageHeader title="Staff" subtitle="Manage travel agency users and operational access." actions={<Button onClick={() => setOpen(true)}>+ Add staff</Button>} /><Card><CardBody className="p-0">{staff.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : staff.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>Unable to load staff accounts.</span><Button size="sm" variant="outline" onClick={() => staff.refetch()}>Retry</Button></div> : (staff.data?.data ?? []).length === 0 ? <EmptyState title="No staff accounts" description="Add a user to begin assigning operational ownership." /> : <Table><thead><tr><Th>Name</Th><Th>Contact</Th><Th>Department</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th></tr></thead><tbody>{(staff.data?.data ?? []).map((member) => <tr key={member.id}><Td className="font-medium">{member.name}</Td><Td>{member.email}<p className="text-xs text-slate-500">{member.phone || ''}</p></Td><Td>{member.department || '—'}</Td><Td>{member.role.name}</Td><Td><StatusBadge status={member.status} /></Td><Td>{new Date(member.dateJoined).toLocaleDateString()}</Td></tr>)}</tbody></Table>}</CardBody></Card><Modal open={open} onClose={() => setOpen(false)} title="Add staff member"><form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => create.mutate(values))}><Input label="Name" {...form.register('name')} /><Input label="Email" type="email" {...form.register('email')} /><Input label="Temporary password" type="password" {...form.register('password')} /><Input label="Phone" {...form.register('phone')} /><Input label="Department" {...form.register('department')} /><Select label="Role" {...form.register('roleId')}><option value="">Select role</option>{(roles.data?.data ?? []).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</Select>{create.isError && <p className="sm:col-span-2 text-sm text-red-600" role="alert">Unable to create staff account.</p>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create account</Button></div></form></Modal></div>;
}
