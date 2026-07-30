import React, { useState, useEffect } from 'react';
import { listPayments } from '@/api/supabaseData';
import { CreditCard, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { SkeletonRow } from '@/components/Skeletons';

const payData = [
  { d: 'Mon', v: 42000 }, { d: 'Tue', v: 38000 }, { d: 'Wed', v: 51000 },
  { d: 'Thu', v: 47000 }, { d: 'Fri', v: 64000 }, { d: 'Sat', v: 72000 }, { d: 'Sun', v: 58000 },
];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listPayments('-created_date', 50);
        setPayments(data || []);
      } catch (e) { setPayments([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Track transactions and outstanding balances" icon={CreditCard} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={TrendingUp} label="Total Collected" value={payments.reduce((a, p) => a + (p.amount || 0), 0)} prefix="₹" accent delay={0} />
        <StatCard icon={Wallet} label="Advance Received" value={payments.filter(p => p.status === 'completed').reduce((a, p) => a + (p.amount || 0), 0)} prefix="₹" delay={60} />
        <StatCard icon={TrendingDown} label="Outstanding" value={320000} prefix="₹" delay={120} />
        <StatCard icon={CreditCard} label="Transactions" value={payments.length} delay={180} />
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-lg font-medium text-foreground mb-4">Weekly Payment Activity</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={payData}>
            <XAxis dataKey="d" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,162,39,0.3)', borderRadius: '12px', color: '#fff' }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Collected']} />
            <Bar dataKey="v" fill="#C9A227" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-2 divide-y divide-white/5">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments recorded" description="Payment transactions will appear here once recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Customer</th>
                  <th className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Property</th>
                  <th className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Method</th>
                  <th className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{p.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.property_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{p.method}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gold">₹{(p.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}