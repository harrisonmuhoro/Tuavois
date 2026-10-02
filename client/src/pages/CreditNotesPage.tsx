import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { creditNotesApi, downloadDocument, exportsApi, invoicesApi } from '../api/services';
import { Button, Card, CardBody, ConfirmDialog, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Select, Table, Td, Th, StatusBadge } from '../components/ui';
import { formatCurrency, getErrorMessage } from '../utils';

const schema = z.object({ invoiceId: z.string().min(1, 'Invoice is required'), amount: z.coerce.number().positive('Amount must be greater than zero'), reason: z.string().min(1, 'Reason is required') });
type FormValues = z.infer<typeof schema>;

export function CreditNotesPage() {
  const [open, setOpen] = useState(false);
  const [pendingApplyId, setPendingApplyId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { invoiceId: '', amount: 0, reason: '' } });
  const notes = useQuery({ queryKey: ['credit-notes'], queryFn: async () => (await creditNotesApi.list()).data });
  const invoices = useQuery({ queryKey: ['invoices', 'credit-note-select'], queryFn: async () => (await invoicesApi.list({ limit: 100 })).data });
  const create = useMutation({ mutationFn: (values: FormValues) => creditNotesApi.create(values), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credit-notes'] }); setOpen(false); form.reset(); } });
  const apply = useMutation({ mutationFn: (id: string) => creditNotesApi.apply(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credit-notes'] }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); } });
  const records = notes.data?.data ?? [];
  const invoiceRecords = invoices.data?.data ?? [];

  return <div className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Credit notes" subtitle="Issue and apply credits against invoice balances." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void downloadDocument(exportsApi.table('credit-notes'), 'credit-notes.xlsx')}>Export Excel</Button><Button onClick={() => setOpen(true)}>+ New credit note</Button></div>} />
    <Card><CardBody className="p-0">{notes.isLoading ? <div className="p-5"><LoadingSkeleton /></div> : notes.isError ? <div className="flex items-center justify-between gap-3 p-6 text-sm text-red-600" role="alert"><span>{getErrorMessage(notes.error)}</span><Button size="sm" variant="outline" onClick={() => notes.refetch()}>Retry</Button></div> : records.length === 0 ? <EmptyState title="No credit notes" description="Create a credit note when a client is owed a refund or adjustment." action={<Button onClick={() => setOpen(true)}>Create credit note</Button>} /> : <Table><thead><tr><Th>Credit note</Th><Th>Invoice</Th><Th>Client</Th><Th>Amount</Th><Th>Status</Th><Th>Action</Th></tr></thead><tbody>{records.map((note: any) => <tr key={note.id}><Td className="font-medium">{note.creditNoteNumber}</Td><Td>{note.invoice?.invoiceNumber || '—'}</Td><Td>{note.client?.fullName || '—'}</Td><Td>{formatCurrency(Number(note.amount), note.currency)}</Td><Td><StatusBadge status={note.status} /></Td><Td>{note.status === 'ISSUED' && <Button size="sm" variant="outline" loading={apply.isPending && apply.variables === note.id} onClick={() => setPendingApplyId(note.id)}>Apply</Button>}</Td></tr>)}</tbody></Table>}</CardBody></Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Create credit note"><form className="grid gap-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}><Select label="Invoice" {...form.register('invoiceId')} error={form.formState.errors.invoiceId?.message}><option value="">Select invoice</option>{invoiceRecords.map((invoice: any) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} — {formatCurrency(Number(invoice.balance), invoice.currency)}</option>)}</Select><Input label="Amount" type="number" step="0.01" {...form.register('amount')} error={form.formState.errors.amount?.message} /><Input label="Reason" {...form.register('reason')} error={form.formState.errors.reason?.message} />{create.isError && <p className="text-sm text-red-600" role="alert">{getErrorMessage(create.error)}</p>}{apply.isError && <p className="text-sm text-red-600" role="alert">{getErrorMessage(apply.error)}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Save credit note</Button></div></form></Modal><ConfirmDialog open={Boolean(pendingApplyId)} title="Apply credit note?" description="This applies the credit to the invoice balance and cannot be undone from this screen." onConfirm={() => { if (pendingApplyId) apply.mutate(pendingApplyId); setPendingApplyId(null); }} onCancel={() => setPendingApplyId(null)} loading={apply.isPending} />
  </div>;
}
