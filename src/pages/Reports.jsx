import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Building2, Wallet, Coins, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import PageHeader from '@/components/PageHeader';
import GoldButton from '@/components/GoldButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import supabase from '@/api/supabaseClient';
import { listProperties } from '@/api/supabaseData';

export default function Reports() {
  const [properties, setProperties] = useState([]);
  const [selectedPropId, setSelectedPropId] = useState('all');
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const props = await listProperties('-created_date', 100).catch(() => []);
        setProperties(props || []);

        const { data: allBookings, error } = await supabase
          .from('bookings')
          .select('*, payments(*), room:room_id(*)')
          .is('deleted_at', null);

        if (error) throw error;

        // Group payments by date
        const grouped = {};

        (allBookings || []).forEach(b => {
          // If property filter is applied, check room's property_id
          if (selectedPropId !== 'all' && b.room?.property_id !== selectedPropId) {
            return;
          }

          (b.payments || []).forEach(p => {
            if (p.payment_status === 'completed' && p.created_at) {
              const amt = Number(p.amount) || 0;
              const mode = (p.payment_mode || '').toLowerCase();
              const pDate = new Date(p.created_at);
              const pDateStr = pDate.getFullYear() + '-' + String(pDate.getMonth() + 1).padStart(2, '0') + '-' + String(pDate.getDate()).padStart(2, '0');

              if (!grouped[pDateStr]) {
                grouped[pDateStr] = { date: pDateStr, upi: 0, cash: 0, other: 0, total: 0 };
              }

              if (mode === 'upi') {
                grouped[pDateStr].upi += amt;
              } else if (mode === 'cash') {
                grouped[pDateStr].cash += amt;
              } else {
                grouped[pDateStr].other += amt;
              }
              grouped[pDateStr].total += amt;
            }
          });
        });

        // Convert to array and sort by date
        const dataArr = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
        setDailyData(dataArr);
      } catch (err) {
        console.error('Error loading reports:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedPropId]);

  const handleDownloadCSV = () => {
    if (dailyData.length === 0) return;
    const headers = ['Date', 'UPI Collection (₹)', 'Cash Collection (₹)', 'Other Collection (₹)', 'Total Collection (₹)'];
    const rows = dailyData.map(d => [
      d.date, 
      d.upi, 
      d.cash, 
      d.other, 
      d.total
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_revenue_report_${selectedPropId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sum total collections for stat cards
  const totalUpi = dailyData.reduce((sum, d) => sum + d.upi, 0);
  const totalCash = dailyData.reduce((sum, d) => sum + d.cash, 0);
  const totalOther = dailyData.reduce((sum, d) => sum + d.other, 0);
  const grandTotal = dailyData.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Consolidated collections and revenue histograms"
        icon={BarChart3}
      />

      {/* Property Select Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass rounded-2xl p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Property Filter</h3>
          <p className="text-xs text-muted-foreground">Select property to filter revenue and download ledger exports</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedPropId} onValueChange={setSelectedPropId}>
            <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/10 text-foreground h-11">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GoldButton onClick={handleDownloadCSV} disabled={dailyData.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </GoldButton>
        </div>
      </div>

      {/* Summary statistics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden">
          <span className="text-xs text-muted-foreground font-medium block">Grand Total Collection</span>
          <span className="text-2xl font-display font-semibold text-gold mt-1.5 block">₹{grandTotal.toLocaleString('en-IN')}</span>
          <Coins className="w-8 h-8 text-gold/10 absolute -right-2 -bottom-2" />
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden">
          <span className="text-xs text-muted-foreground font-medium block">UPI Collection</span>
          <span className="text-2xl font-display font-semibold text-gold mt-1.5 block">₹{totalUpi.toLocaleString('en-IN')}</span>
          <Wallet className="w-8 h-8 text-gold/10 absolute -right-2 -bottom-2" strokeWidth={1.5} />
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden">
          <span className="text-xs text-muted-foreground font-medium block">Cash Collection</span>
          <span className="text-2xl font-display font-semibold text-gold mt-1.5 block">₹{totalCash.toLocaleString('en-IN')}</span>
          <Wallet className="w-8 h-8 text-gold/10 absolute -right-2 -bottom-2" strokeWidth={1.5} />
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden">
          <span className="text-xs text-muted-foreground font-medium block">Other Collection</span>
          <span className="text-2xl font-display font-semibold text-gold mt-1.5 block">₹{totalOther.toLocaleString('en-IN')}</span>
          <Wallet className="w-8 h-8 text-gold/10 absolute -right-2 -bottom-2" strokeWidth={1.5} />
        </div>
      </div>

      {/* Histogram of collection */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="font-display text-lg font-medium text-foreground">Collection Histogram</h3>
          <p className="text-xs text-muted-foreground">Daily collection breakdown by payment modes</p>
        </div>
        
        {loading ? (
          <div className="h-80 flex items-center justify-center text-xs text-muted-foreground">Loading collections data…</div>
        ) : dailyData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-xs text-muted-foreground">No completed collections recorded.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dailyData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              <Tooltip 
                contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,162,39,0.3)', borderRadius: '12px', color: '#fff' }} 
                formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name.toUpperCase()]}
              />
              <Bar dataKey="upi" name="UPI" fill="#C9A227" stackId="a" />
              <Bar dataKey="cash" name="Cash" fill="#4B3D0F" stackId="a" />
              <Bar dataKey="other" name="Other" fill="#1C1C1C" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}