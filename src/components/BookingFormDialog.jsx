import React, { useState, useEffect } from 'react';
import {
  listProperties,
  listCustomers,
  listFloorsForProperty,
  createCustomer,
  createBooking,
  createPayment,
  updateRoom,
  updateCustomer,
} from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, CalendarDays, Building2, Layers, BedDouble, User,
  CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft
} from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';
import supabase from '@/api/supabaseClient';

const STEPS = ['Stay Details', 'Customer & Pricing'];

export default function BookingFormDialog({ open, onOpenChange, onSaved }) {
  const { user, selectedProperty } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [properties, setProperties] = useState([]);
  const [floors, setFloors] = useState([]);
  const [allPropertyRooms, setAllPropertyRooms] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [propertyId, setPropertyId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  
  const [unavailableRoomIds, setUnavailableRoomIds] = useState(new Set());
  const [checkingAvail, setCheckingAvail] = useState(false);

  const [customerMode, setCustomerMode] = useState('existing');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  
  // Pricing States
  const [price, setPrice] = useState(0); // Custom rate for single room
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Load properties and customers
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [props, custs] = await Promise.all([
          listProperties('-created_date', 50),
          listCustomers('-created_date', 100),
        ]);
        setProperties(props || []);
        setCustomers(custs || []);

        if (selectedProperty) {
          setPropertyId(selectedProperty.id);
        }
      } catch {
        /* noop */
      }
    })();
  }, [open, selectedProperty]);

  // Load floors (including empty local storage floors) and property rooms
  useEffect(() => {
    if (!propertyId) { setFloors([]); setFloorId(''); setAllPropertyRooms([]); setRooms([]); setSelectedRoomIds([]); return; }
    (async () => {
      try {
        const fl = await listFloorsForProperty(propertyId);
        const dbFloors = fl || [];
        const savedEmptyFloors = JSON.parse(localStorage.getItem(`empty_floors_${propertyId}`) || '[]').map(Number);
        
        const mergedFloors = [...dbFloors];
        savedEmptyFloors.forEach(num => {
          if (!mergedFloors.some(f => Number(f.floor_number) === num)) {
            mergedFloors.push({
              id: `${propertyId}-${num}`,
              property_id: propertyId,
              name: `Floor ${num}`,
              floor_number: num,
              description: 'No rooms added yet',
              floor_price: 0,
              allow_entire_floor_booking: true,
            });
          }
        });
        
        mergedFloors.sort((a, b) => a.floor_number - b.floor_number);
        setFloors(mergedFloors);
        
        const { data, error } = await supabase.from('rooms').select('*').eq('property_id', propertyId);
        if (error) throw error;
        setAllPropertyRooms(data || []);
      } catch { 
        setFloors([]); 
        setAllPropertyRooms([]);
      }
      setFloorId(''); setRooms([]); setSelectedRoomIds([]);
    })();
  }, [propertyId]);

  // Filter rooms when floor changes
  useEffect(() => {
    if (!floorId || allPropertyRooms.length === 0) { setRooms([]); return; }
    const parts = floorId.split('-');
    const floorNumber = Number(parts[parts.length - 1]);
    const filtered = allPropertyRooms.filter(r => Number(r.floor) === floorNumber);
    setRooms(filtered);
  }, [floorId, allPropertyRooms]);

  const currentProperty = properties.find((p) => p.id === propertyId);
  const currentFloor = floors.find((f) => f.id === floorId);

  // Pre-fill price when single room selection changes
  useEffect(() => {
    if (selectedRoomIds.length === 1) {
      const rm = allPropertyRooms.find(r => r.id === selectedRoomIds[0]);
      setPrice(rm?.price_per_night || 0);
    }
  }, [selectedRoomIds, allPropertyRooms]);

  // Pricing math
  const nights = checkIn && checkOut ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 0;
  
  let subtotal = 0;
  if (selectedRoomIds.length === 1) {
    subtotal = nights * (Number(price) || 0);
  } else {
    subtotal = nights * selectedRoomIds.reduce((sum, roomIdVal) => {
      const rm = allPropertyRooms.find(r => r.id === roomIdVal);
      return sum + (Number(rm?.price_per_night) || 0);
    }, 0);
  }

  const gstAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const grandTotal = Math.max(0, subtotal + gstAmount + (Number(otherCharges) || 0) - (Number(discount) || 0));
  const remaining = Math.max(0, grandTotal - (Number(advance) || 0));

  // Availability calculation
  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) {
      setUnavailableRoomIds(new Set());
      return;
    }
    let cancelled = false;
    setCheckingAvail(true);
    (async () => {
      try {
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select('room_id, check_in_date, check_out_date, booking_status')
          .is('deleted_at', null)
          .neq('booking_status', 'cancelled')
          .neq('booking_status', 'no_show');
        
        if (error) throw error;
        if (cancelled) return;
        
        const nStart = checkIn;
        const nEnd = checkOut;
        
        const unavailable = new Set();
        (bookingsData || []).forEach(b => {
          const bStart = b.check_in_date;
          const bEnd = b.check_out_date;
          if (nStart < bEnd && nEnd > bStart) {
            if (b.room_id) unavailable.add(b.room_id);
          }
        });
        
        setUnavailableRoomIds(unavailable);
      } catch (err) {
        console.error('Error checking room availability:', err);
      } finally {
        if (!cancelled) setCheckingAvail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId, checkIn, checkOut]);

  // Select All helper functions
  const handleSelectAllOnFloor = () => {
    const availableOnFloor = rooms.filter(r => 
      !unavailableRoomIds.has(r.id) && !['maintenance', 'inactive'].includes(r.status)
    ).map(r => r.id);
    
    // Keep rooms selected on other floors, add current floor available rooms
    const otherFloorsSelected = selectedRoomIds.filter(id => !rooms.some(r => r.id === id));
    setSelectedRoomIds([...otherFloorsSelected, ...availableOnFloor]);
  };

  const handleSelectAllFloors = () => {
    const availableAll = allPropertyRooms.filter(r => 
      !unavailableRoomIds.has(r.id) && !['maintenance', 'inactive'].includes(r.availability_status)
    ).map(r => r.id);
    setSelectedRoomIds(availableAll);
  };

  const handleToggleRoom = (roomIdVal) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomIdVal) 
        ? prev.filter(id => id !== roomIdVal) 
        : [...prev, roomIdVal]
    );
  };

  // Reset states on open/close
  useEffect(() => {
    if (open) {
      setStep(0); 
      setPropertyId(selectedProperty?.id || ''); 
      setFloorId(''); 
      setSelectedRoomIds([]);
      setCheckIn(''); 
      setCheckOut(''); 
      setCustomerMode('existing'); 
      setSelectedCustomer(''); 
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setDiscount(0); 
      setOtherCharges(0); 
      setAdvance(0); 
      setPrice(0); 
      setPaymentMethod('cash'); 
      setNotes('');
    }
  }, [open, selectedProperty]);

  const step1Valid = propertyId && floorId && selectedRoomIds.length > 0 && checkIn && checkOut && nights > 0;
  const step2Valid = customerMode === 'existing' ? !!selectedCustomer : (newCustomer.name && newCustomer.phone);
  const canNext = step === 0 ? step1Valid : step2Valid;

  const next = () => { if (canNext) setStep((s) => Math.min(1, s + 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (selectedRoomIds.length === 0) return;
    setSaving(true);
    try {
      let customerId = selectedCustomer;
      let customerName = '';
      let customerPhone = '';

      if (customerMode === 'existing' && !customerId) {
        toast({
          title: 'Guest required',
          description: 'Please select a guest from the dropdown or choose "New Guest" to register a new profile.',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }

      if (customerMode === 'new') {
        const c = await createCustomer({ ...newCustomer });
        customerId = c.id;
        customerName = c.name;
        customerPhone = c.phone;
      } else {
        const c = customers.find((x) => x.id === selectedCustomer);
        customerName = c?.name || '';
        customerPhone = c?.phone || '';
      }

      const bookingRef = `RV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const bookingsCreated = [];

      for (let i = 0; i < selectedRoomIds.length; i++) {
        const roomIdVal = selectedRoomIds[i];
        const rm = allPropertyRooms.find(r => r.id === roomIdVal);
        const roomRate = selectedRoomIds.length === 1 ? Number(price) : (Number(rm?.price_per_night) || 0);
        const roomSubtotal = nights * roomRate;
        const roomGst = Math.round(roomSubtotal * 0.05 * 100) / 100;
        
        let payload = {};
        if (i === 0) {
          // Record charges, discount and advance paid in full on the primary room booking
          const primaryGrandTotal = roomSubtotal + roomGst + Number(otherCharges) - Number(discount);
          payload = {
            booking_id: selectedRoomIds.length > 1 ? `${bookingRef}-1` : bookingRef,
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            property_id: propertyId,
            property_name: currentProperty?.name || '',
            floor_id: floorId,
            floor_name: currentFloor?.name || '',
            room_id: roomIdVal,
            room_name: rm?.room_number || '',
            booking_type: 'room',
            check_in: checkIn,
            check_out: checkOut,
            total_nights: nights,
            room_price: roomRate,
            total_price: roomSubtotal + Number(otherCharges),
            discount: Number(discount),
            taxes: roomGst,
            advance_amount: Number(advance) || 0,
            remaining_amount: Math.max(0, primaryGrandTotal - (Number(advance) || 0)),
            grand_total: primaryGrandTotal,
            notes: notes + (Number(otherCharges) > 0 ? ` [Penalty/Fine: ₹${otherCharges}]` : '') + (selectedRoomIds.length > 1 ? ` [Group booking. Total rooms: ${selectedRoomIds.length}]` : ''),
            booked_by: user?.full_name || user?.email || '',
            booked_by_id: user?.id || '',
          };
        } else {
          // Secondary rooms bookings carry their individual price + GST
          const subGrandTotal = roomSubtotal + roomGst;
          payload = {
            booking_id: `${bookingRef}-${i + 1}`,
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            property_id: propertyId,
            property_name: currentProperty?.name || '',
            floor_id: floorId,
            floor_name: currentFloor?.name || '',
            room_id: roomIdVal,
            room_name: rm?.room_number || '',
            booking_type: 'room',
            check_in: checkIn,
            check_out: checkOut,
            total_nights: nights,
            room_price: roomRate,
            total_price: roomSubtotal,
            discount: 0,
            taxes: roomGst,
            advance_amount: 0,
            remaining_amount: subGrandTotal,
            grand_total: subGrandTotal,
            notes: `[Group booking secondary of ${bookingRef}-1]`,
            booked_by: user?.full_name || user?.email || '',
            booked_by_id: user?.id || '',
          };
        }

        const booking = await createBooking(payload);
        bookingsCreated.push(booking);
        
        await updateRoom(roomIdVal, { status: 'booked' }).catch(() => {});
      }

      // Associate advance payment transaction with the primary booking ID
      if (Number(advance) > 0 && bookingsCreated.length > 0) {
        await createPayment({
          booking_id: bookingsCreated[0].id,
          customer_id: customerId,
          customer_name: customerName,
          property_name: currentProperty?.name || '',
          amount: Number(advance),
          method: paymentMethod,
          status: 'completed',
          recorded_by: user?.full_name || user?.email || '',
        });
      }

      if (customerId) {
        await updateCustomer(customerId, {
          total_stays: ((customers.find((c) => c.id === customerId)?.total_stays || 0) + bookingsCreated.length),
        }).catch(() => {});
      }

      toast({ 
        title: 'Booking confirmed', 
        description: `Group reservation created with reference ${bookingRef} for ${selectedRoomIds.length} rooms.` 
      });
      onSaved();
    } catch (err) {
      toast({ title: 'Error creating booking', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const localDate = new Date();
  const todayStr = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') + '-' + String(localDate.getDate()).padStart(2, '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-2xl w-[95%] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto luxury-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" /> New Booking
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-gold' : 'text-muted-foreground/50'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-all ${i < step ? 'bg-gold text-[#0F0F0F] border-gold' : i === step ? 'border-gold bg-gold/10' : 'border-white/15'}`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-gold/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Stay Details */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <Label className="text-muted-foreground">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={!!selectedProperty}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {propertyId && (
              <div>
                <Label className="text-muted-foreground">Floor</Label>
                <Select value={floorId} onValueChange={setFloorId}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue placeholder="Select floor" /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                    {floors.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {floorId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground">Check-In</Label>
                    <Input type="date" min={todayStr} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Check-Out</Label>
                    <Input type="date" value={checkOut} min={checkIn || todayStr} onChange={(e) => setCheckOut(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" />
                  </div>
                </div>

                {checkIn && checkOut && (
                  <div className="space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-xs font-semibold">Select Rooms</Label>
                      <div className="flex items-center gap-1.5 text-xs text-gold">
                        <button
                          type="button"
                          onClick={handleSelectAllOnFloor}
                          className="hover:underline font-semibold"
                        >
                          Select All on Floor
                        </button>
                        <span className="text-white/10">|</span>
                        <button
                          type="button"
                          onClick={handleSelectAllFloors}
                          className="hover:underline font-semibold"
                        >
                          Select All Floors
                        </button>
                        <span className="text-white/10">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomIds([])}
                          className="text-muted-foreground hover:text-white font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto luxury-scrollbar p-1">
                      {rooms.map((r) => {
                        const isUnavailable = unavailableRoomIds.has(r.id) || ['maintenance', 'inactive', 'booked'].includes(r.status);
                        const isSelected = selectedRoomIds.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => handleToggleRoom(r.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-[76px] ${
                              isSelected
                                ? 'bg-gold/15 border-gold text-gold shadow-lg shadow-gold/5'
                                : isUnavailable
                                ? 'bg-white/[0.01] border-white/5 opacity-40 cursor-not-allowed text-muted-foreground/60'
                                : 'glass border-white/10 text-foreground hover:border-white/20'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold font-display">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{r.category || 'Bedroom'}</div>
                            </div>
                            <div className="flex items-center justify-between w-full mt-1.5">
                              <span className="text-[10px] font-semibold">₹{r.price_per_night}/night</span>
                              {isUnavailable && <span className="text-[8px] uppercase tracking-wider text-red-400 font-bold">Occupied</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Adjust Price Input for Single Room */}
                {selectedRoomIds.length === 1 && (
                  <div className="animate-fade-in">
                    <Label className="text-muted-foreground">Room Price per Night (₹)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={price} 
                      onChange={(e) => setPrice(Number(e.target.value))} 
                      className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" 
                    />
                  </div>
                )}

                {/* Stay Summary Panel */}
                {(checkIn && checkOut && selectedRoomIds.length > 0) && (
                  <div className="glass rounded-xl p-4 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Nights</span>
                      <span className="font-medium text-foreground">{nights}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rooms Booked ({selectedRoomIds.length})</span>
                      <span className="font-medium text-foreground">
                        {selectedRoomIds.map(id => allPropertyRooms.find(r => r.id === id)?.room_number || 'Room').join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                      <span className="text-muted-foreground">Room Subtotal</span>
                      <span className="font-medium text-gold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {checkingAvail ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying booking calendar…</div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-green-400 pt-2"><CheckCircle2 className="w-4 h-4" /> Rooms selection ready</div>
                    )}
                  </div>
                )}
              </>
            )}

            {propertyId && floors.length === 0 && (
              <p className="text-sm text-muted-foreground/70 text-center py-4">No floors in this property yet.</p>
            )}
          </div>
        )}

        {/* Step 2: Customer & Pricing */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <Label className="text-muted-foreground">Customer Selection</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setCustomerMode('existing')} className={`px-4 py-2.5 rounded-lg border text-sm transition-all h-11 ${customerMode === 'existing' ? 'bg-gold/15 text-gold border-gold/40' : 'glass text-muted-foreground border-white/10 hover:text-foreground'}`}>Existing Guest</button>
                <button type="button" onClick={() => setCustomerMode('new')} className={`px-4 py-2.5 rounded-lg border text-sm transition-all h-11 ${customerMode === 'new' ? 'bg-gold/15 text-gold border-gold/40' : 'glass text-muted-foreground border-white/10 hover:text-foreground'}`}>New Guest</button>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <div>
                <Label className="text-muted-foreground">Select Guest</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue placeholder="Choose customer" /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground">Full Name *</Label>
                    <Input value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" placeholder="Guest name" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone *</Label>
                    <Input value={newCustomer.phone} onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" placeholder="+91…" />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" placeholder="guest@email.com" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <Input value={newCustomer.address} onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" placeholder="City, Country" />
                </div>
              </div>
            )}

            {/* Pricing Section */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Pricing & Order Summary</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Discount (₹)</Label>
                  <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Other Charges (Penalty/Fine) (₹)</Label>
                  <Input type="number" min="0" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-muted-foreground text-xs">Advance Amount Paid (₹)</Label>
                  <Input type="number" min="0" max={grandTotal} value={advance} onChange={(e) => setAdvance(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground" />
                </div>
                {Number(advance) > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Advance Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                        {['cash', 'upi'].map((m) => <SelectItem key={m} value={m} className="uppercase">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Room Amount ({selectedRoomIds.length} rooms)</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">5% GST</span>
                  <span>+₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                {Number(otherCharges) > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Other Charges (Penalty/Fine)</span>
                    <span>+₹{Number(otherCharges).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span>
                    <span>-₹{Number(discount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1.5 border-t border-white/5">
                  <span className="text-foreground">Grand Total</span>
                  <span className="text-gold">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Paid</span>
                  <span>₹{Number(advance || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Pending Balance (Record at Checkout)</span>
                  <span className="text-gold">₹{remaining.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Booking Description / Notes (Optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" rows={2} placeholder="Arriving late, extra bed requests, group check-in notes…" />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          {step > 0 ? (
            <GoldButton type="button" variant="ghost" onClick={back} disabled={saving}>
              <ArrowLeft className="w-4 h-4" /> Back
            </GoldButton>
          ) : <div />}
          {step < 1 ? (
            <GoldButton type="button" onClick={next} disabled={!canNext}>
              Continue <ArrowRight className="w-4 h-4" />
            </GoldButton>
          ) : (
            <GoldButton type="button" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Booking
            </GoldButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}