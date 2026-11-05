'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: data.get('username'),
        email: data.get('email'),
        password: data.get('password'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Er ging iets mis bij het registreren.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="username">Gebruikersnaam</label>
        <input id="username" name="username" className="input" required minLength={3} />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mailadres</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Wachtwoord</label>
        <input id="password" name="password" type="password" className="input" required minLength={6} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Bezig...' : 'Account aanmaken'}
      </button>
    </form>
  );
}
