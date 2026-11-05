'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type BalanceCtx = {
  balance: number;
  username: string;
  role: string;
  setBalance: (n: number) => void;
  addBalance: (delta: number) => void;
  refresh: () => Promise<void>;
  addResult: (r: unknown) => void;
};

const Ctx = createContext<BalanceCtx | null>(null);

export function BalanceProvider({
  initialBalance,
  username,
  role,
  children,
}: {
  initialBalance: number;
  username: string;
  role: string;
  children: ReactNode;
}) {
  const [balance, setBalanceState] = useState(initialBalance);

  const setBalance = useCallback((n: number) => setBalanceState(Math.max(0, +n.toFixed(2))), []);
  const addBalance = useCallback((d: number) => setBalanceState((b) => Math.max(0, +(b + d).toFixed(2))), []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setBalanceState(data.balance);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const addResult = useCallback(() => {}, []);

  return (
    <Ctx.Provider value={{ balance, username, role, setBalance, addBalance, refresh, addResult }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBalance() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBalance must be used within BalanceProvider');
  return c;
}
