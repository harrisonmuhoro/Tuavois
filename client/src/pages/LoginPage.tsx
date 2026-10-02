import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (auth) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5a623] font-black text-[#0f4c81]">TV</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TuaVois</h1>
              <p className="text-sm text-slate-500">Travel operations ERP</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your travel business.</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input autoComplete="username" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input autoComplete="current-password" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-lg bg-[#0f4c81] px-4 py-3 font-semibold text-white transition hover:bg-[#0b3d68] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
