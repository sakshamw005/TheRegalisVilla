import React, { useState, useEffect } from 'react';
import { listProperties } from '@/api/supabaseData';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { 
  CalendarCheck, 
  LogOut, 
  Users, 
  TrendingUp, 
  Wallet, 
  BedDouble, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Building2, 
  Sparkles 
} from 'lucide-react';

import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import GoldButton from '@/components/GoldButton';
import { SkeletonCard, SkeletonRow } from '@/components/Skeletons';
import { useAuth } from '@/lib/AuthContext';
import supabase from '@/api/supabaseClient';



export default function Home() {
  const { user, selectedProperty } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [stats, setStats] = useState({
    checkIns: 0, checkOuts: 0, currentGuests: 0, todayRevenue: 0,
    monthRevenue: 0, occupancy: 0, pendingPayments: 0,
    availableRooms: 0, bookedRooms: 0, maintenanceRooms: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [occupancyData, setOccupancyData] = useState([
    { name: 'Occupied', value: 0 }, { name: 'Available', value: 100 },
  ]);

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!selectedProperty) {
      setProperties([]);
      setRecentBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch properties
      const props = await listProperties('-created_date', 50).catch(() => []);
      setProperties(props || []);

      // 2. Fetch rooms for the active property
      const { data: allRooms, error: roomsErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('property_id', selectedProperty.id);
      if (roomsErr) throw roomsErr;

      // 3. Fetch bookings for rooms of the active property
      const { data: allBookings, error: bookingsErr } = await supabase
        .from('bookings')
        .select('*, guest:guest_id(*), room:room_id(*), payments(*)')
        .is('deleted_at', null);
      if (bookingsErr) throw bookingsErr;

      // Filter bookings belonging to the selected property's rooms
      const propertyRoomIds = new Set((allRooms || []).map(r => r.id));
      const propertyBookings = (allBookings || []).filter(b => b.room_id && propertyRoomIds.has(b.room_id));

      // Calculate stats using local date strings (YYYY-MM-DD)
      const localDate = new Date();
      const todayStr = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') + '-' + String(localDate.getDate()).padStart(2, '0');
      const currentYear = localDate.getFullYear();
      const currentMonth = localDate.getMonth() + 1;

      const todayCheckIns = propertyBookings.filter(b => b.check_in_date === todayStr && b.booking_status !== 'cancelled').length;
      const todayCheckOuts = propertyBookings.filter(b => b.check_out_date === todayStr && b.booking_status !== 'cancelled').length;
      const checkedInGuests = propertyBookings.filter(b => b.booking_status === 'checked_in')
        .reduce((sum, b) => sum + (b.number_of_guests || 1), 0);

      let todayRev = 0;
      let monthRev = 0;
      let pendingPay = 0;
      let todayUpi = 0;
      let todayCash = 0;
      let todayOther = 0;
      let monthUpi = 0;
      let monthCash = 0;
      let monthOther = 0;

      propertyBookings.forEach(b => {
        const remaining = Math.max(0, (b.final_amount || 0) - (b.advance_paid || 0));
        if (b.booking_status !== 'cancelled') {
          pendingPay += remaining;
        }

        // Recognition of revenue only when booking is completely paid & received (checked out)
        if (b.booking_status === 'checked_out' && b.check_out_date) {
          const checkoutDateStr = b.check_out_date;
          if (checkoutDateStr === todayStr) {
            todayRev += Number(b.final_amount) || 0;
          }
          const [yr, mo] = checkoutDateStr.split('-').map(Number);
          if (yr === currentYear && mo === currentMonth) {
            monthRev += Number(b.final_amount) || 0;
          }
        }

        // Sum payments for mode breakdown
        (b.payments || []).forEach(p => {
          if (p.payment_status === 'completed' && p.created_at) {
            const amt = Number(p.amount) || 0;
            const mode = (p.payment_mode || '').toLowerCase();
            const pDate = new Date(p.created_at);
            const pDateStr = pDate.getFullYear() + '-' + String(pDate.getMonth() + 1).padStart(2, '0') + '-' + String(pDate.getDate()).padStart(2, '0');

            if (pDateStr === todayStr) {
              if (mode === 'upi') todayUpi += amt;
              else if (mode === 'cash') todayCash += amt;
              else todayOther += amt;
            }

            const [yr, mo] = pDateStr.split('-').map(Number);
            if (yr === currentYear && mo === currentMonth) {
              if (mode === 'upi') monthUpi += amt;
              else if (mode === 'cash') monthCash += amt;
              else monthOther += amt;
            }
          }
        });
      });

      // Room status counts
      const totalRooms = allRooms?.length || 0;
      const available = allRooms?.filter(r => r.availability_status === 'available').length || 0;
      const occupied = allRooms?.filter(r => r.availability_status === 'occupied').length || 0;
      const maintenance = allRooms?.filter(r => r.availability_status === 'maintenance').length || 0;

      const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
      setOccupancyData([
        { name: 'Occupied', value: occupancyRate },
        { name: 'Available', value: 100 - occupancyRate },
      ]);

      setStats({
        checkIns: todayCheckIns,
        checkOuts: todayCheckOuts,
        currentGuests: checkedInGuests,
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        occupancy: occupancyRate,
        pendingPayments: pendingPay,
        availableRooms: available,
        bookedRooms: occupied,
        maintenanceRooms: maintenance,
        todayUpi,
        todayCash,
        todayOther,
        monthUpi,
        monthCash,
        monthOther,
      });

      // Mapped Bookings
      const mappedBookings = propertyBookings
        .slice(0, 5)
        .map(b => ({
          id: b.id,
          customer_name: b.customer_name || b.guest?.full_name || 'Guest',
          property_name: selectedProperty.name,
          room_name: b.room?.room_number || 'Room',
          grand_total: b.final_amount || 0,
          booking_status: b.booking_status,
          created_date: b.created_at,
        }));
      setRecentBookings(mappedBookings);

    } catch (e) {
      console.error("Error loading stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProperty]);

  // RECEPTIONIST LAYOUT
  if (user?.role === 'receptionist') {
    const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user.full_name || 'Receptionist'}`}
          icon={Sparkles}
        />

        {/* Global Active Property Banner */}
        {selectedProperty && (
          <div className="p-4 rounded-xl border border-gold/15 bg-gold/5 flex items-center justify-between animate-fade-down">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-gold tracking-wide uppercase">Active Property</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedProperty.name}</p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground border border-white/5 bg-white/5 rounded-full px-2 py-0.5 uppercase tracking-wider">Reception Desk</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Live Date & Time Card */}
          <div className="glass rounded-2xl p-6 md:col-span-2 flex flex-col justify-between min-h-[160px] animate-fade-up border border-gold/15">
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Current Date & Time</h3>
              <p className="text-sm font-medium text-gold mt-1.5">{dateStr}</p>
            </div>
            <div className="text-4xl sm:text-5xl font-display font-bold gold-gradient-text tracking-wide mt-4">
              {timeStr}
            </div>
          </div>

          {/* Stat Cards Column */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                icon={CalendarCheck}
                label="Today's Check-Ins"
                value={stats.checkIns}
                accent
                delay={0}
              />
            )}

            {loading ? (
              <SkeletonCard />
            ) : (
              <StatCard
                icon={Users}
                label="Current Guests"
                value={stats.currentGuests}
                delay={60}
              />
            )}
          </div>
        </div>

        {/* Recent Bookings for Active Property */}
        <div className="glass rounded-2xl p-5 animate-fade-up border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-medium text-foreground">Active Property Bookings</h3>
            <Link to="/bookings" className="text-xs text-gold hover:text-gold-light flex items-center gap-1 transition-colors">
              Go to bookings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            ) : recentBookings.length > 0 ? (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-display text-sm font-semibold shrink-0">
                    {(b.customer_name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.room_name ? `Room ${b.room_name}` : '—'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-gold">₹{(b.grand_total || 0).toLocaleString('en-IN')}</div>
                    <StatusBadge status={b.booking_status} className="mt-0.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                No active bookings recorded today
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ADMINISTRATOR LAYOUT
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={selectedProperty ? `Welcome to ${selectedProperty.name} command center` : "Select a property to view statistics"}
        icon={Sparkles}
        action={
          <Link to="/properties">
            <GoldButton variant="primary">
              <Building2 className="w-4 h-4" /> View Properties
            </GoldButton>
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={CalendarCheck} label="Today's Check-Ins" value={stats.checkIns} accent delay={0} />
            <StatCard icon={LogOut} label="Today's Check-Outs" value={stats.checkOuts} delay={60} />
            <StatCard icon={Users} label="Current Guests" value={stats.currentGuests} delay={120} />
            <StatCard icon={Wallet} label="Today's Revenue" value={stats.todayRevenue} prefix="₹" delay={180} />
            <StatCard icon={TrendingUp} label="Monthly Revenue" value={stats.monthRevenue} prefix="₹" delay={240} />
            <StatCard icon={BedDouble} label="Occupancy Rate" value={stats.occupancy} suffix="%" delay={300} />
            <StatCard icon={Clock} label="Pending Payments" value={stats.pendingPayments} prefix="₹" delay={360} />
            <StatCard icon={CheckCircle2} label="Available Rooms" value={stats.availableRooms} delay={420} />
          </>
        )}
      </div>

      {/* Charts & Collection Breakdown row */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up">
          {/* Occupancy card */}
          <div className="glass rounded-2xl p-5 flex flex-col justify-between border border-white/5">
            <div>
              <h3 className="font-display text-lg font-medium text-foreground mb-1">Occupancy</h3>
              <p className="text-xs text-muted-foreground mb-2">Current room utilization</p>
            </div>
            <div className="relative my-3">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={occupancyData} dataKey="value" innerRadius={55} outerRadius={75} paddingAngle={4} startAngle={90} endAngle={-270}>
                    <Cell fill="#C9A227" />
                    <Cell fill="#2A2A2A" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-display font-bold gold-gradient-text">{stats.occupancy}%</div>
                <div className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">Occupied</div>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-gold" />Booked</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-[#2A2A2A]" />Free</span>
            </div>
          </div>

          {/* Collections breakdowns */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Today's Collections */}
            <div className="glass rounded-2xl p-5 border border-white/5 flex-1 flex flex-col justify-between">
              <h3 className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-gold" /> Today's Collections by Mode
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">UPI</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.todayUpi || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">Cash</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.todayCash || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">Other</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.todayOther || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Monthly Collections */}
            <div className="glass rounded-2xl p-5 border border-white/5 flex-1 flex flex-col justify-between">
              <h3 className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-gold" /> Monthly Collections by Mode
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">UPI</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.monthUpi || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">Cash</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.monthCash || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="glass rounded-xl p-3 text-center border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-muted-foreground font-medium block">Other</span>
                  <span className="text-base font-bold text-gold mt-1 block">₹{(stats.monthOther || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent bookings + quick properties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent bookings */}
        <div className="glass rounded-2xl p-5 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-medium text-foreground">Recent Bookings</h3>
            <Link to="/bookings" className="text-xs text-gold hover:text-gold-light flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : recentBookings.length > 0 ? (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-display text-sm font-semibold shrink-0">
                    {(b.customer_name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.property_name || '—'} · Room {b.room_name || '—'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-gold">₹{(b.grand_total || 0).toLocaleString('en-IN')}</div>
                    <StatusBadge status={b.booking_status} className="mt-0.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                No recent bookings yet
              </div>
            )}
          </div>
        </div>

        {/* Quick properties list */}
        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-medium text-foreground">Your Properties</h3>
            <Link to="/properties" className="text-xs text-gold hover:text-gold-light flex items-center gap-1 transition-colors">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-shimmer" />)
            ) : properties.length > 0 ? (
              properties.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/properties/${p.id}`} className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors group ${selectedProperty?.id === p.id ? 'bg-gold/10 border border-gold/15' : ''}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gold/10 border border-gold/10 shrink-0">
                    {p.cover_image && <img src={p.cover_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-gold transition-colors">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.city || p.address || '—'}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-gold transition-colors" />
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">No properties yet</p>
                <Link to="/properties"><GoldButton variant="outline" className="text-xs">Add Property</GoldButton></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}