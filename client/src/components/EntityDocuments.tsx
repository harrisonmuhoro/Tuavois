import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/services';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, FileUpload, Table, Td, Th } from './ui';
import { downloadBlob } from '../utils';

type Props = { link: { clientId?: string; tripId?: string; invoiceId?: string; quotationId?: string }; title?: string };

export function EntityDocuments({ link, title = 'Documents' }: Props) {
  const queryClient = useQueryClient();
  const key = ['documents', link];
  const documents = useQuery({ queryKey: key, queryFn: async () => (await documentsApi.list(link as Record<string, string>)).data });
  const upload = useMutation({ mutationFn: (file: File) => documentsApi.upload(file, link), onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  const remove = useMutation({ mutationFn: (id: string) => documentsApi.remove(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const records = documents.data?.data || [];
  return <><Card><CardHeader><h2 className="font-semibold text-slate-900">{title}</h2></CardHeader><CardBody className="space-y-4"><FileUpload onUpload={async (file) => { await upload.mutateAsync(file); }} />{documents.isError ? <div className="flex items-center justify-between gap-3 text-sm text-red-600" role="alert"><span>Unable to load documents.</span><Button size="sm" variant="outline" onClick={() => documents.refetch()}>Retry</Button></div> : records.length === 0 ? <p className="py-3 text-center text-sm text-slate-500">No documents uploaded yet.</p> : <Table><thead><tr><Th>File</Th><Th>Size</Th><Th>Uploaded</Th><Th>{''}</Th></tr></thead><tbody>{records.map((doc: any) => <tr key={doc.id}><Td><button type="button" className="text-blue-600 hover:underline" onClick={async () => { const response = await documentsApi.download(doc.id); downloadBlob(doc.originalName, response.data); }}>{doc.originalName}</button></Td><Td>{(doc.size / 1024).toFixed(1)} KB</Td><Td>{new Date(doc.createdAt).toLocaleDateString()}</Td><Td><button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setPendingDeleteId(doc.id)}>Delete</button></Td></tr>)}</tbody></Table>}</CardBody></Card><ConfirmDialog open={Boolean(pendingDeleteId)} title="Delete document?" description="This permanently removes the uploaded document." onConfirm={() => { if (pendingDeleteId) remove.mutate(pendingDeleteId); setPendingDeleteId(null); }} onCancel={() => setPendingDeleteId(null)} loading={remove.isPending} destructive /></>;
}
