import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api from '../api/client';
import type { ApiResponse, Company } from '../types';
import { Button, Card, CardBody, Input, LoadingSkeleton, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const schema = z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), address: z.string().optional(), website: z.string().optional(), logoUrl: z.string().url().optional().or(z.literal('')), currency: z.string().min(3), taxRate: z.coerce.number().min(0), taxName: z.string().min(1), taxId: z.string().optional(), kraPin: z.string().optional(), bankDetails: z.string().optional() });
type Settings = z.infer<typeof schema>;
export function CompanySettingsPage() {
  const queryClient = useQueryClient(); const { updateCompany } = useAuth(); const form = useForm<Settings>({ resolver: zodResolver(schema) }); const settings = useQuery({ queryKey: ['company-settings'], queryFn: async () => (await api.get<ApiResponse<Company>>('/admin/settings/company')).data });
  useEffect(() => { if (settings.data?.data) form.reset(settings.data.data); }, [settings.data, form]);
  const update = useMutation({ mutationFn: (values: Settings) => api.put<ApiResponse<Company>>('/admin/settings/company', values), onSuccess: (response) => { if (response.data.data) updateCompany(response.data.data); void queryClient.invalidateQueries({ queryKey: ['company-settings'] }); } });
  if (settings.isLoading) return <div className="p-8"><LoadingSkeleton /></div>;
  if (settings.isError) return <div className="p-8"><div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert"><span>Unable to load company settings.</span><Button size="sm" variant="outline" onClick={() => settings.refetch()}>Retry</Button></div></div>;
  return <div className="p-4 sm:p-6 lg:p-8"><PageHeader title="Company settings" subtitle="Configure the company identity used across documents and finance." /><Card><CardBody><form className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => update.mutate(values))}><Input label="Company name" {...form.register('name')} /><Input label="Email" type="email" {...form.register('email')} /><Input label="Phone" {...form.register('phone')} /><Input label="Website" {...form.register('website')} /><Input label="Logo URL" placeholder="https://…" {...form.register('logoUrl')} /><Input label="Default currency" {...form.register('currency')} /><Input label="Tax name" {...form.register('taxName')} /><Input label="Tax rate (%)" type="number" step="0.01" {...form.register('taxRate')} /><Input label="Tax ID" {...form.register('taxId')} /><Input label="KRA PIN" {...form.register('kraPin')} /><Textarea label="Address" {...form.register('address')} /><Textarea label="Bank details" {...form.register('bankDetails')} /><div className="sm:col-span-2">{form.watch('logoUrl') && <img src={form.watch('logoUrl')} alt="Company logo preview" className="mb-4 h-16 w-16 rounded-lg border object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}{update.isError && <p className="mb-3 text-sm text-red-600" role="alert">Unable to save company settings.</p>}<Button type="submit" loading={update.isPending}>Save settings</Button></div></form></CardBody></Card></div>;
}
