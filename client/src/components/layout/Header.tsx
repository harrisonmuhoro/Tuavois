import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../api/services';

export function Header() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => (await searchApi.global(debouncedQuery)).data.data,
    enabled: debouncedQuery.length >= 2
  });

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  const results = data || { clients: [], trips: [], invoices: [], quotations: [], vouchers: [], itineraries: [] };
  const hasResults = Object.values(results).some((arr: any) => arr.length > 0);

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center px-4 md:px-6 z-10 sticky top-0">
      <div className="flex-1 max-w-2xl" ref={wrapperRef}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search clients, trips, invoices..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          )}
        </div>
        
        {isOpen && query.length >= 2 && (
          <div className="absolute top-14 left-4 md:left-6 w-[calc(100%-2rem)] md:w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {!isFetching && !hasResults ? (
              <div className="p-4 text-center text-sm text-slate-500">No results found for "{query}"</div>
            ) : (
              <div className="py-2">
                {results.clients.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase bg-slate-50">Clients</div>
                    {results.clients.map((c: any) => (
                      <button key={c.id} onClick={() => handleSelect(`/clients/${c.id}`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                        <div className="font-medium">{c.fullName}</div>
                        {c.company && <div className="text-xs text-slate-500">{c.company}</div>}
                      </button>
                    ))}
                  </div>
                )}
                {results.trips.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase bg-slate-50">Trips</div>
                    {results.trips.map((t: any) => (
                      <button key={t.id} onClick={() => handleSelect(`/trips`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                        <div className="font-medium">{t.name} <span className="text-xs text-slate-500">({t.tripNumber})</span></div>
                      </button>
                    ))}
                  </div>
                )}
                {results.invoices.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase bg-slate-50">Invoices</div>
                    {results.invoices.map((i: any) => (
                      <button key={i.id} onClick={() => handleSelect(`/invoices/${i.id}`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                        <div className="font-medium">{i.invoiceNumber}</div>
                      </button>
                    ))}
                  </div>
                )}
                {results.quotations.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-slate-500 uppercase bg-slate-50">Quotations</div>
                    {results.quotations.map((q: any) => (
                      <button key={q.id} onClick={() => handleSelect(`/quotations/${q.id}`)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">
                        <div className="font-medium">{q.quotationNumber}</div>
                        <div className="text-xs text-slate-500">{q.destination}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
