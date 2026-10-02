import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { downloadDocument, exportsApi, prospectsApi } from '../api/services';
import type { Prospect, ProspectStatus } from '../types';
import { Button, Card, CardBody, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Td, Th } from '../components/ui';
import { useConfirmation } from '../contexts/ConfirmationContext';

const prospectSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  company: z.string().optional(),
  leadSource: z.string().optional(),
  travelInterest: z.string().optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  currency: z.string(),
});
type ProspectForm = z.infer<typeof prospectSchema>;
const statuses: ProspectStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST'];

export function ProspectsPage() {
  const { confirm } = useConfirmation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const form = useForm<ProspectForm>({ resolver: zodResolver(prospectSchema), defaultValues: { currency: 'KES' } });
  const prospects = useQuery({ queryKey: ['prospects', { search, status, page }], queryFn: async () => (await prospectsApi.list({ search, status: status || undefined, page, limit: 20 })).data });
  const createProspect = useMutation({ mutationFn: (data: ProspectForm) => prospectsApi.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prospects'] }); setOpen(false); form.reset({ currency: 'KES' }); } });
  const convert = useMutation({ mutationFn: async (id: string) => { if (!await confirm({ title: 'Convert prospect to client?', description: 'This creates a client record from the prospect and changes the prospect status.' })) return null; return prospectsApi.convert(id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }) });
  const records = prospects.data?.data ?? [];
  const pagination = prospects.data?.pagination;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Prospects" subtitle="Track leads from first contact through conversion." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void downloadDocument(exportsApi.table('prospects'), 'prospects.xlsx')}>Export Excel</Button><Button onClick={() => setOpen(true)}>+ New prospect</Button></div>} />
      <div className="mb-4 flex flex-wrap gap-3"><Input className="max-w-sm" placeholder="Search prospects…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Select className="w-48" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</Select></div>
      <Card><CardBody className="p-0">{prospects.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : prospects.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>Unable to load prospects.</span><Button size="sm" variant="outline" onClick={() => prospects.refetch()}>Retry</Button></div> : records.length === 0 ? <EmptyState title="No prospects found" description="Add a lead to start your CRM pipeline." action={<Button onClick={() => setOpen(true)}>Add prospect</Button>} /> : <><Table><thead><tr><Th>Prospect</Th><Th>Interest</Th><Th>Value</Th><Th>Status</Th><Th>Action</Th></tr></thead><tbody>{records.map((prospect: Prospect) => <tr key={prospect.id} className="hover:bg-slate-50"><Td><p className="font-medium text-slate-900">{prospect.fullName}</p><p className="text-xs text-slate-500">{prospect.phone} · {prospect.email || '—'}</p></Td><Td>{prospect.travelInterest || '—'}</Td><Td>{prospect.estimatedValue ? `${prospect.currency} ${prospect.estimatedValue.toLocaleString()}` : '—'}</Td><Td><StatusBadge status={prospect.status} /></Td><Td>{prospect.status !== 'WON' && prospect.status !== 'LOST' && <Button size="sm" variant="outline" loading={convert.isPending && convert.variables === prospect.id} onClick={() => convert.mutate(prospect.id)}>Convert</Button>}</Td></tr>)}</tbody></Table>{pagination && <Pagination {...pagination} onPageChange={setPage} />}</>}</CardBody></Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Create prospect"><form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => createProspect.mutate(values))}><Input label="Full name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} /><Input label="Phone" {...form.register('phone')} error={form.formState.errors.phone?.message} /><Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} /><Input label="Company" {...form.register('company')} /><Input label="Lead source" {...form.register('leadSource')} /><Input label="Travel interest" {...form.register('travelInterest')} /><Input label="Estimated value" type="number" {...form.register('estimatedValue')} /><Select label="Currency" {...form.register('currency')}><option value="KES">KES</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></Select><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={createProspect.isPending}>Save prospect</Button></div></form></Modal>
    </div>
  );
}
