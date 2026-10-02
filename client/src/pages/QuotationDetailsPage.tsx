import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsApi, documentsApi, downloadDocument, quotationsApi } from '../api/services';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, Select, StatusBadge, Table, Td, Th } from '../components/ui';
import { formatCurrency } from '../utils';
import { EntityDocuments } from '../components/EntityDocuments';

const quotationItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

const quotationEditSchema = z.object({
  clientId: z.string().min(1, 'Client required'),
  destination: z.string().min(1, 'Destination required'),
  pax: z.coerce.number().int().min(1),
  currency: z.string(),
  discountValue: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().nonnegative(),
  items: z.array(quotationItemSchema).min(1, 'At least one item required'),
});

type QuotationEditForm = z.infer<typeof quotationEditSchema>;

export function QuotationDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  const quotation = useQuery({ 
    queryKey: ['quotation', id], 
    queryFn: async () => (await quotationsApi.get(id!)).data, 
    enabled: Boolean(id) 
  });
  const clients = useQuery({ 
    queryKey: ['clients', 'quotation-select'], 
    queryFn: async () => (await clientsApi.list({ limit: 100 })).data 
  });

  const form = useForm<QuotationEditForm>({
    resolver: zodResolver(quotationEditSchema),
    defaultValues: { items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const handleEditOpen = () => {
    if (quotation.data?.data) {
      const q = quotation.data.data;
      form.reset({
        clientId: q.clientId,
        destination: q.destination,
        pax: q.pax,
        currency: q.currency,
        discountValue: Number(q.discountValue),
        taxRate: Number(q.taxRate),
        items: q.items.map((i: any) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
      });
      setEditOpen(true);
    }
  };

  const update = useMutation({
    mutationFn: (values: QuotationEditForm) => quotationsApi.update(id!, { ...values, discountType: 'AMOUNT' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      setEditOpen(false);
    }
  });

  const convert = useMutation({ 
    mutationFn: (qid: string) => quotationsApi.convertToInvoice(qid), 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotation', id] }) 
  });

  if (quotation.isLoading) return <div className="p-6"><LoadingSkeleton rows={8} /></div>;
  if (quotation.isError || !quotation.data?.data) return <div className="p-6"><EmptyState title="Quotation not found" action={<Link className="text-sm font-medium text-blue-700" to="/quotations">Return to quotations</Link>} /></div>;

  const q: any = quotation.data.data;
  const clientRecords = clients.data?.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader 
        title={`Quotation ${q.quotationNumber}`} 
        subtitle={`Created on ${new Date(q.createdAt).toLocaleDateString()}`}
        breadcrumb={[{ label: 'Quotations', href: '/quotations' }, { label: q.quotationNumber }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void downloadDocument(documentsApi.quotation(q.id), `${q.quotationNumber}.pdf`)}>Download PDF</Button>
            {q.status !== 'CONVERTED' && (
              <>
                <Button variant="outline" onClick={handleEditOpen}>Edit</Button>
                <Button loading={convert.isPending} onClick={() => setConfirmConvert(true)}>Convert to Invoice</Button>
              </>
            )}
          </div>
        }
      />

      <ConfirmDialog open={confirmConvert} title="Convert quotation to invoice?" description="This creates an invoice from the quotation and makes the quotation no longer editable as a draft." onConfirm={() => { setConfirmConvert(false); convert.mutate(q.id); }} onCancel={() => setConfirmConvert(false)} loading={convert.isPending} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Line Items</h2></CardHeader>
            <CardBody className="p-0">
              <Table>
                <thead><tr><Th>Description</Th><Th>Qty</Th><Th>Unit Price</Th><Th>Total</Th></tr></thead>
                <tbody>
                  {q.items.map((item: any) => (
                    <tr key={item.id}>
                      <Td>{item.description}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>{formatCurrency(Number(item.unitPrice), q.currency)}</Td>
                      <Td className="font-medium">{formatCurrency(Number(item.total), q.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
          <EntityDocuments link={{ quotationId: q.id }} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Summary</h2></CardHeader>
            <CardBody className="space-y-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Status</span><StatusBadge status={q.status} /></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Destination</span><span className="font-medium">{q.destination}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Travellers</span><span className="font-medium">{q.pax}</span></div>
              <div className="border-t border-slate-100 pt-4 mt-4" />
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(Number(q.subtotal), q.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span>{formatCurrency(Number(q.discountAmount), q.currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span>{formatCurrency(Number(q.taxAmount), q.currency)}</span></div>
              <div className="border-t border-slate-100 pt-4 mt-4" />
              <div className="flex justify-between"><span className="font-semibold text-slate-900">Grand Total</span><span className="font-bold text-[#0f4c81] text-lg">{formatCurrency(Number(q.grandTotal), q.currency)}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Client Details</h2></CardHeader>
            <CardBody className="space-y-3">
              <div><p className="text-xs text-slate-500">Name</p><Link to={`/clients/${q.client.id}`} className="font-medium text-blue-600 hover:underline">{q.client.fullName}</Link></div>
              <div><p className="text-xs text-slate-500">Email</p><p className="text-sm">{q.client.email || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Phone</p><p className="text-sm">{q.client.phone || '—'}</p></div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Quotation" size="lg">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
          <Select label="Client" {...form.register('clientId')}>
            <option value="">Select client</option>
            {clientRecords.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </Select>
          <Input label="Destination" {...form.register('destination')} error={form.formState.errors.destination?.message} />
          <Input label="Travellers" type="number" {...form.register('pax')} />
          <Select label="Currency" {...form.register('currency')}><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></Select>
          <Input label="Discount Amount" type="number" step="0.01" {...form.register('discountValue')} />
          <Input label="Tax Rate (%)" type="number" step="0.01" {...form.register('taxRate')} />
          
          <div className="sm:col-span-2 mt-2 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Line Items</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>Add Item</Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1"><Input placeholder="Description" {...form.register(`items.${index}.description`)} error={form.formState.errors.items?.[index]?.description?.message} /></div>
                  <div className="w-24"><Input placeholder="Qty" type="number" step="0.01" {...form.register(`items.${index}.quantity`)} /></div>
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
