import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsApi, documentsApi, downloadDocument, invoicesApi } from '../api/services';
import { Button, Card, CardBody, CardHeader, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Select, StatusBadge, Table, Td, Th } from '../components/ui';
import { formatCurrency } from '../utils';
import { EntityDocuments } from '../components/EntityDocuments';

const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  quantity: z.coerce.number().positive(),
  pax: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});

const invoiceEditSchema = z.object({
  clientId: z.string().min(1, 'Client required'),
  invoiceDate: z.string(),
  dueDate: z.string(),
  currency: z.string(),
  discountValue: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().nonnegative(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
});

type InvoiceEditForm = z.infer<typeof invoiceEditSchema>;

export function InvoiceDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const invoiceQuery = useQuery({ 
    queryKey: ['invoice', id], 
    queryFn: async () => (await invoicesApi.get(id!)).data, 
    enabled: Boolean(id) 
  });
  const clients = useQuery({ 
    queryKey: ['clients', 'invoice-select'], 
    queryFn: async () => (await clientsApi.list({ limit: 100 })).data 
  });

  const form = useForm<InvoiceEditForm>({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: { items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const handleEditOpen = () => {
    if (invoiceQuery.data?.data) {
      const inv = invoiceQuery.data.data;
      form.reset({
        clientId: inv.clientId,
        invoiceDate: new Date(inv.invoiceDate).toISOString().slice(0, 10),
        dueDate: new Date(inv.dueDate).toISOString().slice(0, 10),
        currency: inv.currency,
        discountValue: Number(inv.discountValue),
        taxRate: Number(inv.taxRate),
        items: inv.items.map((i: any) => ({ ...i, quantity: Number(i.quantity), pax: Number(i.pax || 1), unitPrice: Number(i.unitPrice) }))
      });
      setEditOpen(true);
    }
  };

  const update = useMutation({
    mutationFn: (values: InvoiceEditForm) => invoicesApi.update(id!, { ...values, discountType: 'AMOUNT' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setEditOpen(false);
    }
  });

  if (invoiceQuery.isLoading) return <div className="p-6"><LoadingSkeleton rows={8} /></div>;
  if (invoiceQuery.isError || !invoiceQuery.data?.data) return <div className="p-6"><EmptyState title="Invoice not found" action={<Link className="text-sm font-medium text-blue-700" to="/invoices">Return to invoices</Link>} /></div>;

  const inv: any = invoiceQuery.data.data;
  const clientRecords = clients.data?.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader 
        title={`Invoice ${inv.invoiceNumber}`} 
        subtitle={`Issued on ${new Date(inv.invoiceDate).toLocaleDateString()}`}
        breadcrumb={[{ label: 'Invoices', href: '/invoices' }, { label: inv.invoiceNumber }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void downloadDocument(documentsApi.invoice(inv.id), `${inv.invoiceNumber}.pdf`)}>Download PDF</Button>
            {!['PAID', 'CANCELLED'].includes(inv.status) && (
              <Button variant="outline" onClick={handleEditOpen}>Edit</Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Line Items</h2></CardHeader>
            <CardBody className="p-0">
              <Table>
                <thead><tr><Th>Description</Th><Th>Qty</Th><Th>Pax</Th><Th>Unit Price</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {inv.items.map((item: any) => (
                    <tr key={item.id}>
                      <Td>{item.description}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>{item.pax || 1}</Td>
                      <Td>{formatCurrency(Number(item.unitPrice), inv.currency)}</Td>
                      <Td className="font-medium">{formatCurrency(Number(item.total), inv.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
          <EntityDocuments link={{ invoiceId: inv.id }} />

          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Payments</h2></CardHeader>
            <CardBody className="p-0">
              {inv.payments && inv.payments.length > 0 ? (
                <Table>
                  <thead><tr><Th>Date</Th><Th>Reference</Th><Th>Method</Th><Th>Amount</Th></tr></thead>
                  <tbody>
                    {inv.payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <Td>{new Date(payment.paymentDate).toLocaleDateString()}</Td>
                        <Td>{payment.reference}</Td>
                        <Td>{payment.method}</Td>
                        <Td className="font-medium text-green-600">{formatCurrency(Number(payment.amount), inv.currency)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-6 text-center text-sm text-slate-500">No payments recorded.</div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Summary</h2></CardHeader>
            <CardBody className="space-y-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Status</span><StatusBadge status={inv.status} /></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Due Date</span><span className="font-medium">{new Date(inv.dueDate).toLocaleDateString()}</span></div>
              <div className="border-t border-slate-100 pt-4 mt-4" />
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(Number(inv.subtotal), inv.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span>{formatCurrency(Number(inv.discountAmount), inv.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span>{formatCurrency(Number(inv.taxAmount), inv.currency)}</span></div>
              <div className="border-t border-slate-100 pt-4 mt-4" />
              <div className="flex justify-between"><span className="font-semibold text-slate-900">Grand Total</span><span className="font-bold text-slate-900">{formatCurrency(Number(inv.grandTotal), inv.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Amount Paid</span><span className="text-green-600">{formatCurrency(Number(inv.amountPaid), inv.currency)}</span></div>
              {Number(inv.creditApplied) > 0 && (
                <div className="flex justify-between text-sm"><span className="text-slate-500">Credit Applied</span><span className="text-green-600">{formatCurrency(Number(inv.creditApplied), inv.currency)}</span></div>
              )}
              <div className="border-t border-slate-100 pt-4 mt-4" />
              <div className="flex justify-between"><span className="font-semibold text-slate-900">Balance Due</span><span className="font-bold text-red-600 text-lg">{formatCurrency(Number(inv.balance), inv.currency)}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Client Details</h2></CardHeader>
            <CardBody className="space-y-3">
              <div><p className="text-xs text-slate-500">Name</p><Link to={`/clients/${inv.client.id}`} className="font-medium text-blue-600 hover:underline">{inv.client.fullName}</Link></div>
              <div><p className="text-xs text-slate-500">Email</p><p className="text-sm">{inv.client.email || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Phone</p><p className="text-sm">{inv.client.phone || '—'}</p></div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Invoice" size="xl">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
          <Select label="Client" {...form.register('clientId')}>
            <option value="">Select client</option>
            {clientRecords.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </Select>
          <Select label="Currency" {...form.register('currency')}><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></Select>
          <Input label="Invoice Date" type="date" {...form.register('invoiceDate')} />
          <Input label="Due Date" type="date" {...form.register('dueDate')} />
          <Input label="Discount Amount" type="number" step="0.01" {...form.register('discountValue')} />
          <Input label="Tax Rate (%)" type="number" step="0.01" {...form.register('taxRate')} />
          
          <div className="sm:col-span-2 mt-2 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Line Items</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => append({ description: '', quantity: 1, pax: 1, unitPrice: 0 })}>Add Item</Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1"><Input placeholder="Description" {...form.register(`items.${index}.description`)} error={form.formState.errors.items?.[index]?.description?.message} /></div>
                  <div className="w-20"><Input placeholder="Qty" type="number" step="0.01" {...form.register(`items.${index}.quantity`)} /></div>
                  <div className="w-20"><Input placeholder="Pax" type="number" {...form.register(`items.${index}.pax`)} /></div>
                  <div className="w-32"><Input placeholder="Price" type="number" step="0.01" {...form.register(`items.${index}.unitPrice`)} /></div>
                  <Button type="button" variant="ghost" className="text-red-500 px-2" onClick={() => remove(index)}>✕</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>Save changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
