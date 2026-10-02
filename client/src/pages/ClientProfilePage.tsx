import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, documentsApi } from '../api/services';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, LoadingSkeleton, PageHeader, StatusBadge, Table, Td, Th, FileUpload } from '../components/ui';
import { downloadBlob, formatCurrency } from '../utils';

export function ClientProfilePage() {
  const { id } = useParams();
  const client = useQuery({ queryKey: ['client', id], queryFn: async () => (await clientsApi.get(id!)).data, enabled: Boolean(id) });
  const activity = useQuery({ queryKey: ['client-activity', id], queryFn: async () => (await clientsApi.activity(id!)).data, enabled: Boolean(id) });
  const queryClient = useQueryClient();
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file, { clientId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', id] })
  });
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(documentId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client', id] }); setDeleteDocumentId(null); },
  });

  if (client.isLoading) return <div className="p-6"><LoadingSkeleton rows={8} /></div>;
  if (client.isError || !client.data?.data) return <div className="p-6"><EmptyState title="Client not found" description="The client may have been removed or you may not have access." action={<Link className="text-sm font-medium text-blue-700" to="/clients">Return to clients</Link>} /></div>;

  const record: any = client.data.data;
  const sections = [
    { title: 'Quotations', records: record.quotations || [], columns: ['Number', 'Status', 'Total'], cells: (item: any) => [item.quotationNumber, <StatusBadge key="status" status={item.status} />, formatCurrency(Number(item.grandTotal), item.currency)] },
    { title: 'Invoices', records: record.invoices || [], columns: ['Number', 'Status', 'Balance'], cells: (item: any) => [item.invoiceNumber, <StatusBadge key="status" status={item.status} />, formatCurrency(Number(item.balance), item.currency)] },
    { title: 'Payments', records: record.payments || [], columns: ['Payment', 'Date', 'Amount'], cells: (item: any) => [item.paymentNumber, new Date(item.paymentDate).toLocaleDateString(), formatCurrency(Number(item.amount), item.currency)] },
    { title: 'Trips', records: record.trips || [], columns: ['Trip', 'Destination', 'Status'], cells: (item: any) => [item.tripNumber, item.destination, <StatusBadge key="status" status={item.status} />] },
  ];

  return <div className="p-4 sm:p-6 lg:p-8">
    <ConfirmDialog open={Boolean(deleteDocumentId)} title="Delete document?" description="This permanently removes the uploaded document from this client profile." onConfirm={() => deleteDocumentId && deleteMutation.mutate(deleteDocumentId)} onCancel={() => setDeleteDocumentId(null)} loading={deleteMutation.isPending} destructive />
    <PageHeader title={record.fullName} subtitle={`${record.clientNumber}${record.company ? ` · ${record.company}` : ''}`} breadcrumb={[{ label: 'Clients', href: '/clients' }, { label: record.fullName }]} />
    <Card className="mb-6"><CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{record.phone}</p></div><div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{record.email || '—'}</p></div><div><p className="text-xs text-slate-500">Nationality</p><p className="font-medium">{record.nationality || '—'}</p></div><div><p className="text-xs text-slate-500">Assigned staff</p><p className="font-medium">{record.assignedStaff?.name || 'Unassigned'}</p></div>{record.notes && <div className="sm:col-span-2 lg:col-span-4"><p className="text-xs text-slate-500">Notes</p><p className="text-sm">{record.notes}</p></div>}</CardBody></Card>
    <Card className="mb-6"><CardHeader><h2 className="font-semibold text-slate-900">Activity timeline</h2></CardHeader><CardBody>{activity.isLoading ? <LoadingSkeleton rows={4} /> : activity.isError ? <div className="flex items-center justify-between gap-3 text-sm text-red-600" role="alert"><span>Unable to load client activity.</span><Button size="sm" variant="outline" onClick={() => activity.refetch()}>Retry</Button></div> : (activity.data?.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No activity recorded yet.</p> : <div className="space-y-4">{(activity.data?.data ?? []).map((entry: any) => <div key={entry.id} className="flex gap-3 border-l-2 border-slate-200 pl-4"><div><p className="text-sm font-medium text-slate-900">{entry.action} · {entry.entity}</p><p className="text-xs text-slate-500">{entry.user?.name || 'System'} · {new Date(entry.createdAt).toLocaleString()}</p></div></div>)}</div>}</CardBody></Card>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><h2 className="font-semibold text-slate-900">Documents</h2></CardHeader>
        <CardBody className="p-5 flex flex-col gap-4">
          <FileUpload onUpload={async (file) => { await uploadMutation.mutateAsync(file); }} />
          {record.documents?.length > 0 ? (
            <Table>
              <thead><tr><Th>File Name</Th><Th>Size</Th><Th>Uploaded</Th></tr></thead>
              <tbody>
                {record.documents.map((doc: any) => (
                  <tr key={doc.id}>
                    <Td><button type="button" className="text-blue-600 hover:underline" onClick={async () => { const response = await documentsApi.download(doc.id); downloadBlob(doc.originalName, response.data); }}>{doc.originalName}</button></Td>
                    <Td>{(doc.size / 1024).toFixed(1)} KB</Td>
                    <Td><div className="flex items-center gap-3"><span>{new Date(doc.createdAt).toLocaleDateString()}</span><button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setDeleteDocumentId(doc.id)}>Delete</button></div></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No documents uploaded yet.</p>
          )}
        </CardBody>
      </Card>
      {sections.map((section) => <Card key={section.title}><CardHeader><h2 className="font-semibold text-slate-900">{section.title}</h2></CardHeader><CardBody className="p-0">{section.records.length === 0 ? <p className="p-5 text-sm text-slate-500">No related {section.title.toLowerCase()} yet.</p> : <Table><thead><tr>{section.columns.map((column) => <Th key={column}>{column}</Th>)}</tr></thead><tbody>{section.records.map((item: any) => <tr key={item.id}>{section.cells(item).map((cell: any, index: number) => <Td key={index}>{cell}</Td>)}</tr>)}</tbody></Table>}</CardBody></Card>)}
    </div>
  </div>;
}
