import React, { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User } from 'lucide-react';
import GoldButton from '@/components/GoldButton';
import { useToast } from '@/components/ui/use-toast';

const empty = { 
  name: '', 
  phone: '', 
  email: '', 
  address: '', 
  government_id_type: 'aadhaar', 
  government_id_number: '', 
  notes: '' 
};

export default function CustomerFormDialog({ open, onOpenChange, customer, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setForm({ ...empty, ...customer });
    } else {
      setForm(empty);
    }
  }, [customer, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Validation error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: 'Validation error', description: 'Phone number is required', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      if (customer?.id) {
        await updateCustomer(customer.id, form);
        toast({ title: 'Customer profile updated' });
      } else {
        await createCustomer(form);
        toast({ title: 'Customer registered successfully' });
      }
      onSaved();
    } catch (err) {
      toast({ title: 'Error saving customer', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-lg w-[95%] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto luxury-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-gold" />
            {customer ? 'Edit Guest Profile' : 'Register New Guest'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-xs">Full Name *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => set('name', e.target.value)} 
                className="bg-white/[0.03] border-white/10 mt-1 h-11" 
                placeholder="John Doe" 
                required 
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Phone Number *</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => set('phone', e.target.value)} 
                className="bg-white/[0.03] border-white/10 mt-1 h-11" 
                placeholder="+91 98765 43210" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Email Address</Label>
            <Input 
              type="email"
              value={form.email} 
              onChange={(e) => set('email', e.target.value)} 
              className="bg-white/[0.03] border-white/10 mt-1 h-11" 
              placeholder="johndoe@email.com" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-xs">Govt. ID Type</Label>
              <Select value={form.government_id_type} onValueChange={(v) => set('government_id_type', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/10 mt-1 h-11 text-xs font-semibold capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                  <SelectItem value="aadhaar" className="text-xs font-medium capitalize">Aadhaar Card</SelectItem>
                  <SelectItem value="passport" className="text-xs font-medium capitalize">Passport</SelectItem>
                  <SelectItem value="driving_license" className="text-xs font-medium capitalize">Driving License</SelectItem>
                  <SelectItem value="voter_id" className="text-xs font-medium capitalize">Voter ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Govt. ID Number</Label>
              <Input 
                value={form.government_id_number} 
                onChange={(e) => set('government_id_number', e.target.value)} 
                className="bg-white/[0.03] border-white/10 mt-1 h-11" 
                placeholder="ID Number" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Home Address</Label>
            <Input 
              value={form.address} 
              onChange={(e) => set('address', e.target.value)} 
              className="bg-white/[0.03] border-white/10 mt-1 h-11" 
              placeholder="City, State, Country"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Internal Notes (Optional)</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => set('notes', e.target.value)} 
              className="bg-white/[0.03] border-white/10 mt-1" 
              rows={2} 
              placeholder="VIP guest, dietary requirements, room preferences…"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</GoldButton>
            <GoldButton type="submit" disabled={saving || !form.name || !form.phone}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} 
              {customer ? 'Save Changes' : 'Register Guest'}
            </GoldButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
