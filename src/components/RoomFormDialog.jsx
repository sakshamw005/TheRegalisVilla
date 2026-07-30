import React, { useState, useEffect } from 'react';
import { createRoom, updateRoom } from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';

const categories = ['Bedroom', 'Living Room', 'Kitchen', 'Dining Room', 'Private Room', 'Family Suite', 'Studio', 'Dormitory', 'Balcony', 'Hall', 'Conference Room', 'Swimming Pool', 'Garden', 'Terrace', 'Storage', 'Custom'];
const bedTypes = ['Single', 'Double', 'Queen', 'King', 'Twin', 'Dormitory', 'Bunk Bed', 'Custom'];

const empty = { 
  name: '', 
  room_number: '', 
  category: 'Bedroom', 
  bed_type: 'Double', 
  capacity: 2, 
  description: '', 
  price_per_night: 0, 
  weekend_price: 0, 
  seasonal_price: 0, 
  images: [], 
  amenities: [], 
  status: 'available',
  floor_number: ''
};

export default function RoomFormDialog({ open, onOpenChange, property, floor, room, onSaved }) {
  const [form, setForm] = useState(empty);
  const [imgUrl, setImgUrl] = useState('');
  const [amenity, setAmenity] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isEdit = !!room?.id;

  useEffect(() => {
    if (room) {
      setForm({ 
        ...empty, 
        ...room, 
        floor_number: (room.floor !== undefined && room.floor !== null) ? room.floor : '' 
      });
    } else {
      setForm({ 
        ...empty, 
        floor_number: floor?.floor_number !== undefined ? floor.floor_number : '' 
      });
    }
    setImgUrl(''); 
    setAmenity('');
  }, [room, floor, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const floorNum = form.floor_number !== '' ? Number(form.floor_number) : (floor?.floor_number);
    
    if (!form.name || !form.room_number || floorNum === undefined || floorNum === '') {
      toast({ 
        title: 'Validation error', 
        description: 'Room Name, Room Number and Floor Number are required', 
        variant: 'destructive' 
      });
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        property_id: property.id, 
        property_name: property.name, 
        floor_number: floorNum, 
        floor_id: `${property.id}-${floorNum}`, 
        floor_name: `Floor ${floorNum}` 
      };
      if (isEdit) {
        await updateRoom(room.id, payload);
        toast({ title: 'Room updated' });
      } else {
        await createRoom(payload);
        toast({ title: 'Room created' });
      }
      onSaved();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-h-[90vh] overflow-y-auto luxury-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">{isEdit ? 'Edit Room' : 'New Room'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-muted-foreground">Room Name *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11" placeholder="Deluxe Suite" required />
            </div>
            <div>
              <Label className="text-muted-foreground">Room Number *</Label>
              <Input value={form.room_number} onChange={(e) => set('room_number', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1 h-11" placeholder="101" required />
            </div>
            <div>
              <Label className="text-muted-foreground">Floor Number *</Label>
              <Input 
                type="number" 
                value={form.floor_number} 
                onChange={(e) => set('floor_number', e.target.value !== '' ? Number(e.target.value) : '')} 
                className="bg-white/[0.03] border-white/10 mt-1 h-11" 
                placeholder="e.g. 1" 
                required 
                disabled={!!floor} 
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gold/20 max-h-48 text-foreground">
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Bed Type</Label>
              <Select value={form.bed_type} onValueChange={(v) => set('bed_type', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                  {bedTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} className="bg-white/[0.03] border-white/10 mt-1 h-11" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-muted-foreground">Price / Night (₹)</Label>
              <Input type="number" value={form.price_per_night} onChange={(e) => set('price_per_night', Number(e.target.value))} className="bg-white/[0.03] border-white/10 mt-1 h-11" />
            </div>
            <div>
              <Label className="text-muted-foreground">Weekend (₹)</Label>
              <Input type="number" value={form.weekend_price} onChange={(e) => set('weekend_price', Number(e.target.value))} className="bg-white/[0.03] border-white/10 mt-1 h-11" />
            </div>
            <div>
              <Label className="text-muted-foreground">Seasonal (₹)</Label>
              <Input type="number" value={form.seasonal_price} onChange={(e) => set('seasonal_price', Number(e.target.value))} className="bg-white/[0.03] border-white/10 mt-1 h-11" />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="cleaning_required">Cleaning Required</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">Room Images (URLs)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} className="bg-white/[0.03] border-white/10 h-11" placeholder="https://…" />
              <GoldButton type="button" variant="outline" onClick={() => { if (imgUrl) { set('images', [...(form.images || []), imgUrl]); setImgUrl(''); } }}>Add</GoldButton>
            </div>
            {form.images?.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {form.images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/70 text-white text-[10px] w-4 h-4 rounded-bl">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground">Amenities</Label>
            <div className="flex gap-2 mt-1">
              <Input value={amenity} onChange={(e) => setAmenity(e.target.value)} className="bg-white/[0.03] border-white/10 h-11" placeholder="AC, WiFi, Mini Bar…" />
              <GoldButton type="button" variant="outline" onClick={() => { if (amenity) { set('amenities', [...(form.amenities || []), amenity]); setAmenity(''); } }}>Add</GoldButton>
            </div>
            {form.amenities?.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {form.amenities.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-gold text-[11px] border border-gold/15">
                    {a}
                    <button type="button" onClick={() => set('amenities', form.amenities.filter((_, j) => j !== i))} className="hover:text-red-400">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" rows={2} />
          </div>
          <DialogFooter>
            <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</GoldButton>
            <GoldButton type="submit" disabled={saving || !form.name || !form.room_number || form.floor_number === ''}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Save' : 'Create Room'}
            </GoldButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}