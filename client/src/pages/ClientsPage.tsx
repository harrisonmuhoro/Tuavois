import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { clientsApi, downloadDocument, exportsApi } from '../api/services';
import type { Client } from '../types';
import { Button, Card, CardBody, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Pagination, Table, Td, Th } from '../components/ui';
import { getErrorMessage } from '../utils';

const clientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  company: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type ClientForm = z.infer<typeof clientSchema>;

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const form = useForm<ClientForm>({ resolver: zodResolver(clientSchema), defaultValues: { nationality: 'Kenyan' } });
  const clients = useQuery({
    queryKey: ['clients', { search, page }],
    queryFn: async () => (await clientsApi.list({ search, page, limit: 20 })).data,
  });
  const createClient = useMutation({
    mutationFn: (data: ClientForm) => clientsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setOpen(false); form.reset({ nationality: 'Kenyan' }); },
  });

  const data = clients.data;
  const records = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Clients" subtitle="Manage customers and their travel history." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void downloadDocument(exportsApi.table('clients'), 'clients.xlsx')}>Export Excel</Button><Button onClick={() => setOpen(true)}>+ New client</Button></div>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-sm" placeholder="Search name, email, phone or company…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      </div>
      <Card>
        <CardBody className="p-0">
          {clients.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : clients.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>Unable to load clients.</span><Button size="sm" variant="outline" onClick={() => clients.refetch()}>Retry</Button></div> : records.length === 0 ? <EmptyState title="No clients found" description="Create your first client to begin the sales workflow." action={<Button onClick={() => setOpen(true)}>Add client</Button>} /> : (
            <>
              <Table>
                <thead><tr><Th>Client</Th><Th>Contact</Th><Th>Company</Th><Th>Activity</Th></tr></thead>
                <tbody>{records.map((client: Client) => <tr key={client.id} className="hover:bg-slate-50">
                  <Td><Link className="font-medium text-slate-900 hover:text-blue-700 hover:underline" to={`/clients/${client.id}`}>{client.fullName}</Link><p className="text-xs text-slate-400">{client.clientNumber}</p></Td>
                  <Td><p>{client.phone}</p><p className="text-xs text-slate-500">{client.email || '—'}</p></Td>
                  <Td>{client.company || '—'}</Td>
                  <Td><span className="text-xs text-slate-500">{client._count?.quotations ?? 0} quotations · {client._count?.invoices ?? 0} invoices</span></Td>
                </tr>)}</tbody>
              </Table>
              {pagination && <Pagination {...pagination} onPageChange={setPage} />}
            </>
          )}
        </CardBody>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Create client">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => createClient.mutate(values))}>
          <Input label="Full name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} />
          <Input label="Phone" {...form.register('phone')} error={form.formState.errors.phone?.message} />
          <Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <Input label="Company" {...form.register('company')} />
          <Input label="Nationality" {...form.register('nationality')} />
          <Input label="Address" {...form.register('address')} />
          <div className="sm:col-span-2"><Input label="Notes" {...form.register('notes')} /></div>
          {createClient.isError && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{getErrorMessage(createClient.error)}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={createClient.isPending}>Save client</Button></div>
        </form>
      </Modal>
    </div>
  );
}
