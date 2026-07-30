import React, { useState, useEffect } from 'react';
import { createRoom, updateRoom } from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';

const empty = { name: '', floor_number: '', floor_price: 0, description: '', image: '', allow_entire_floor_booking: true, order: 0 };

export default function FloorFormDialog({ open, onOpenChange, property, floor, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isEdit = !!floor?.id;

  useEffect(() => {
    if (floor) setForm({ ...empty, ...floor });
    else setForm(empty);
  }, [floor, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { ...form, property_id: property.id, property_name: property.name };
      if (isEdit) {
        await updateRoom(floor.id, payload);
        toast({ title: 'Floor updated' });
      } else {
        await createRoom(payload);
        toast({ title: 'Floor created' });
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
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">{isEdit ? 'Edit Floor' : 'New Floor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Floor Name *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="Ground Floor" />
            </div>
            <div>
              <Label className="text-muted-foreground">Label / Number</Label>
              <Input value={form.floor_number} onChange={(e) => set('floor_number', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="GF" />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Entire Floor Price (₹)</Label>
            <Input type="number" value={form.floor_price} onChange={(e) => set('floor_price', Number(e.target.value))} className="bg-white/[0.03] border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" rows={2} />
          </div>
          <div className="flex items-center justify-between glass rounded-lg p-3">
            <div>
              <Label className="text-foreground text-sm">Allow Entire Floor Booking</Label>
              <p className="text-[11px] text-muted-foreground">Enable booking the entire floor at once</p>
            </div>
            <Switch checked={form.allow_entire_floor_booking} onCheckedChange={(v) => set('allow_entire_floor_booking', v)} />
          </div>
          <DialogFooter>
            <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</GoldButton>
            <GoldButton type="submit" disabled={saving || !form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Save' : 'Create Floor'}
            </GoldButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}