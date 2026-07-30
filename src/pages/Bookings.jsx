import React, { useState, useEffect } from 'react';
import { 
  listBookings, 
  createPayment, 
  updateRoom 
} from '@/api/supabaseData';
import { 
  CalendarDays, 
  Search, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  LogOut, 
  Wallet,
  Coins,
  AlertTriangle
} from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import GoldButton from '@/components/GoldButton';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { SkeletonRow } from '@/components/Skeletons';
import BookingFormDialog from '@/components/BookingFormDialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import supabase from '@/api/supabaseClient';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Bookings() {
  const { user, selectedProperty } = useAuth();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals state
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('cash');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutDiscount, setCheckoutDiscount] = useState('');
  const [checkoutDiscountReason, setCheckoutDiscountReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await listBookings('-created_date', 100);
      setBookings(data || []);
    } catch (e) { 
      setBookings([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadBookings(); 
  }, [selectedProperty]);

  // Filter by Property AND search query AND status
  const filtered = bookings.filter(b => {
    const matchesProperty = selectedProperty ? b.room?.property_id === selectedProperty.id : true;
    const matchesSearch = !search || 
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
      b.booking_id?.toLowerCase().includes(search.toLowerCase()) || 
      b.room_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.booking_status === statusFilter;
    
    return matchesProperty && matchesSearch && matchesStatus;
  });

  const statuses = ['all', 'reserved', 'checked_in', 'checked_out', 'cancelled'];

  // Handle Check In
  const handleCheckIn = async (booking) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'checked_in' })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      // Update room availability status to occupied
      if (booking.room_id) {
        await updateRoom(booking.room_id, { status: 'occupied' }).catch(() => {});
      }

      toast({ 
        title: 'Check-in successful', 
        description: `${booking.customer_name} is now checked in to Room ${booking.room_name || '—'}.` 
      });
      loadBookings();
    } catch (e) {
      toast({ 
        title: 'Check-in failed', 
        description: e.message || 'Error checking in guest', 
        variant: 'destructive' 
      });
    }
  };

  // Trigger Check Out Modal
  const triggerCheckOut = (booking) => {
    setSelectedBooking(booking);
    setCheckoutPaymentMethod('cash');
    setCheckoutNotes('');
    setCheckoutDiscount('');
    setCheckoutDiscountReason('');
    setCheckoutDialogOpen(true);
  };

  // Confirm Check Out & pay remaining balance
  const handleCheckOutConfirm = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      const discountVal = Number(checkoutDiscount) || 0;
      const originalPending = Math.max(0, (selectedBooking.final_amount || 0) - (selectedBooking.advance_paid || 0));

      if (discountVal > originalPending) {
        toast({
          title: 'Invalid discount',
          description: `The checkout discount cannot exceed the pending balance of ₹${originalPending.toLocaleString('en-IN')}.`,
          variant: 'destructive'
        });
        setSubmitting(false);
        return;
      }

      const pendingAmount = Math.max(0, originalPending - discountVal);

      // 1. Record remaining payment transaction if balance > 0
      if (pendingAmount > 0) {
        await createPayment({
          booking_id: selectedBooking.id,
          customer_id: selectedBooking.guest_id,
          customer_name: selectedBooking.customer_name,
          property_name: selectedBooking.property_name,
          amount: pendingAmount,
          method: checkoutPaymentMethod,
          status: 'completed',
          recorded_by: user?.full_name || user?.email || '',
          notes: checkoutNotes || 'Checkout final settlement payment.'
        });
      }

      // Construct special_requests with optional refund description
      let newNotes = selectedBooking.special_requests || '';
      if (discountVal > 0) {
        const reasonText = checkoutDiscountReason.trim() ? ` - Reason: ${checkoutDiscountReason.trim()}` : '';
        newNotes = (newNotes + ` [Checkout Reduction: ₹${discountVal}${reasonText}]`).trim();
      }

      // 2. Update booking status, discount, and special_requests
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'checked_out',
          discount: Number(selectedBooking.discount || 0) + discountVal,
          special_requests: newNotes
        })
        .eq('id', selectedBooking.id);
      
      if (error) throw error;

      // 3. Explicitly update room status to available in database
      if (selectedBooking.room_id) {
        await updateRoom(selectedBooking.room_id, { status: 'available' }).catch(() => {});
      }

      const finalSettledAmount = (selectedBooking.final_amount || 0) - discountVal;
      toast({ 
        title: 'Check-out completed', 
        description: `${selectedBooking.customer_name} has checked out. Total paid: ₹${finalSettledAmount.toLocaleString('en-IN')}` 
      });
      setCheckoutDialogOpen(false);
      loadBookings();
    } catch (e) {
      toast({ 
        title: 'Check-out failed', 
        description: e.message || 'Error checking out guest', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper payment medium formatter
  const getPaymentMediums = (b) => {
    if (!b.payments || b.payments.length === 0) return '—';
    const modes = b.payments.map(p => p.payment_mode || p.method).filter(Boolean);
    const unique = Array.from(new Set(modes));
    return unique.map(m => m.toUpperCase()).join(' + ');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={selectedProperty ? `Manage reservations for ${selectedProperty.name}` : "Manage reservations across properties"}
        icon={CalendarDays}
        action={
          <GoldButton onClick={() => setBookingFormOpen(true)} disabled={!selectedProperty}>
            <Plus className="w-4 h-4" /> New Booking
          </GoldButton>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search by customer name, booking ID…" 
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/30 transition-all text-foreground placeholder:text-muted-foreground/50" 
          />
        </div>
        <div className="flex gap-1 glass rounded-lg p-1 overflow-x-auto">
          {statuses.map(s => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)} 
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-all ${statusFilter === s ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-2 divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState 
            icon={CalendarDays} 
            title={search ? "No matching bookings" : "No bookings yet"} 
            description={search ? "Try a different search." : "Create your first booking to see it here."} 
          />
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-gold/10">
          <div className="overflow-x-auto luxury-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-4 py-4">Room</th>
                  <th className="px-4 py-4">Stay Dates</th>
                  <th className="px-4 py-4">Total Amount</th>
                  <th className="px-4 py-4">Advance Paid</th>
                  <th className="px-4 py-4">Pending Balance</th>
                  <th className="px-4 py-4">Payment Medium</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filtered.map((b) => {
                  const pendingAmount = Math.max(0, (b.final_amount || 0) - (b.advance_paid || 0));
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-display text-xs font-semibold shrink-0">
                            {(b.customer_name || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate capitalize">{b.customer_name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{b.booking_id || b.id?.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="capitalize inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-xs text-foreground font-medium">
                          Room {b.room_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-foreground">{b.check_in}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">to {b.check_out}</div>
                      </td>
                      <td className="px-4 py-4 text-foreground font-semibold">₹{b.final_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-muted-foreground">₹{b.advance_paid.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4">
                        {pendingAmount === 0 ? (
                          <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        ) : (
                          <span className="text-xs text-gold font-bold">
                            ₹{pendingAmount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-muted-foreground">
                        {getPaymentMediums(b)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={b.booking_status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {b.booking_status === 'reserved' && (
                          <GoldButton 
                            variant="primary" 
                            className="h-8 text-xs py-1"
                            onClick={() => handleCheckIn(b)}
                          >
                            Check In
                          </GoldButton>
                        )}
                        {b.booking_status === 'checked_in' && (
                          <GoldButton 
                            variant="primary" 
                            className="h-8 text-xs py-1 bg-gradient-to-r from-red-700 to-red-600 border border-red-500/10 text-white hover:shadow-none hover:brightness-110"
                            onClick={() => triggerCheckOut(b)}
                          >
                            Check Out
                          </GoldButton>
                        )}
                        {!['reserved', 'checked_in'].includes(b.booking_status) && (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Form Dialog */}
      <BookingFormDialog 
        open={bookingFormOpen} 
        onOpenChange={setBookingFormOpen} 
        onSaved={() => { setBookingFormOpen(false); loadBookings(); }} 
      />

      {/* Check-Out & Final Billing Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-md w-[95%] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto luxury-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-gold font-semibold flex items-center gap-2">
              <LogOut className="w-5 h-5 text-gold" /> Guest Check-Out & Billing
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Verify stay summaries and settle the pending balance to complete the checkout for <span className="text-foreground font-semibold">{selectedBooking?.customer_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-2 mt-2">
              {/* Order Summary breakdown */}
              <div className="glass rounded-xl p-4 space-y-2.5 border border-white/5">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-gold" /> Final Bill Summary
                </div>
                <div className="text-xs space-y-1.5 pt-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Room: Room {selectedBooking.room_name} ({selectedBooking.total_nights} nights)</span>
                    <span className="text-foreground">₹{(selectedBooking.room_price * selectedBooking.total_nights).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5% GST</span>
                    <span className="text-foreground">₹{(selectedBooking.tax || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {Number(selectedBooking.total_price - (selectedBooking.room_price * selectedBooking.total_nights)) > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Other Charges (Penalty/Fines)</span>
                      <span>₹{(selectedBooking.total_price - (selectedBooking.room_price * selectedBooking.total_nights)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {Number(selectedBooking.discount) > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span>-₹{Number(selectedBooking.discount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-foreground">
                    <span>Grand Total</span>
                    <span className="text-gold">₹{selectedBooking.final_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Advance Amount Paid</span>
                    <span className="text-foreground">₹{selectedBooking.advance_paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-foreground">
                    <span>Pending Amount to Pay</span>
                    <span className="text-gold">₹{Math.max(0, (selectedBooking.final_amount - selectedBooking.advance_paid) - (Number(checkoutDiscount) || 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Reduction / Refund Section */}
              <div className="glass rounded-xl p-4 space-y-3 border border-white/5">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-gold" /> Reduction / Refund (Optional)
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Checkout Discount / Refund Amount (₹)</Label>
                  <Input 
                    type="number"
                    min="0"
                    max={Math.max(0, selectedBooking.final_amount - selectedBooking.advance_paid)}
                    value={checkoutDiscount}
                    onChange={(e) => setCheckoutDiscount(e.target.value)}
                    placeholder="Enter discount amount if guest had issues"
                    className="bg-white/[0.03] border-white/10 mt-1 h-11"
                  />
                </div>
                {(Number(checkoutDiscount) > 0) && (
                  <div className="animate-fade-in">
                    <Label className="text-muted-foreground text-xs font-semibold text-red-300">Reason for Refund / Discomfort (Optional)</Label>
                    <Textarea
                      value={checkoutDiscountReason}
                      onChange={(e) => setCheckoutDiscountReason(e.target.value)}
                      placeholder="e.g., Guest reported AC not working on 2nd night"
                      className="bg-white/[0.03] border-white/10 mt-1 text-foreground"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Record Remaining Settlement Method */}
              {Math.max(0, (selectedBooking.final_amount - selectedBooking.advance_paid) - (Number(checkoutDiscount) || 0)) > 0 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <Label className="text-muted-foreground text-xs">Payment Medium (Remaining Balance)</Label>
                    <Select value={checkoutPaymentMethod} onValueChange={setCheckoutPaymentMethod}>
                      <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                        {['cash', 'upi', 'card', 'bank_transfer'].map((m) => (
                          <SelectItem key={m} value={m} className="uppercase font-semibold text-xs">{m.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Settlement Notes (Optional)</Label>
                    <Input 
                      value={checkoutNotes} 
                      onChange={(e) => setCheckoutNotes(e.target.value)} 
                      placeholder="e.g., Paid via UPI at front desk" 
                      className="bg-white/[0.03] border-white/10 mt-1 h-11" 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <GoldButton variant="ghost" onClick={() => setCheckoutDialogOpen(false)}>
              Cancel
            </GoldButton>
            <GoldButton 
              onClick={handleCheckOutConfirm} 
              disabled={submitting}
              className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 border border-red-500/10 text-white font-semibold"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Settle & Check Out
            </GoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}