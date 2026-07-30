import React, { useState, useEffect } from 'react';
import { createProperty, updateProperty } from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';

const empty = { name: '', cover_image: '', address: '', city: '', description: '', status: 'active', rating: 5 };

export default function PropertyFormDialog({ open, onOpenChange, property, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (property) {
      setForm({ ...empty, ...property });
    } else {
      setForm(empty);
    }
  }, [property, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (property?.id) {
        await updateProperty(property.id, form);
        toast({ title: 'Property updated' });
      } else {
        await createProperty(form);
        toast({ title: 'Property created' });
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
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">{property ? 'Edit Property' : 'New Property'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Property Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="The Regalis Villa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">City</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="Goa" />
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gold/20">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Address</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="Beach Road, Goa" />
          </div>
          <div>
            <Label className="text-muted-foreground">Cover Image URL</Label>
            <Input value={form.cover_image} onChange={(e) => set('cover_image', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" placeholder="https://…" />
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-white/[0.03] border-white/10 mt-1" rows={3} />
          </div>
          <DialogFooter>
            <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</GoldButton>
            <GoldButton type="submit" disabled={saving || !form.name}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {property ? 'Save Changes' : 'Create Property'}
            </GoldButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}