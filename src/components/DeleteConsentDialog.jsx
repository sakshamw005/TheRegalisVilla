import React, { useState, useEffect } from 'react';
import {
  listUsers,
  listFloorsForProperty,
  deleteRooms,
  deleteProperty,
  listRooms,
  updateProperty,
  updateRoom,
} from '@/api/supabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import GoldButton from '@/components/GoldButton';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import supabase from '@/api/supabaseClient';

const roleLabel = (r) => ({ admin: 'Administrator', owner_a: 'Owner A', owner_b: 'Owner B' }[r] || r);

export default function DeleteConsentDialog({ open, onOpenChange, property, onExecuted }) {
  const { user, refreshProperties } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState([]);
  const [consent, setConsent] = useState(null); // existing DeletionConsent record
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [consenting, setConsenting] = useState(false);
  const [executing, setExecuting] = useState(false);

  const load = async () => {
    if (!property?.id) return;
    setLoading(true);
    try {
      const [users, consents] = await Promise.all([
        listUsers().catch(() => []),
        Promise.resolve([]),
      ]);
      const ownerUsers = (users || []).filter((u) => ['admin', 'owner_a', 'owner_b'].includes(u.role));
      setOwners(ownerUsers);
      // Find the most recent non-executed consent
      const active = (consents || []).find((c) => c.status !== 'executed') || null;
      setConsent(active);
    } catch {
      setOwners([]); setConsent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) { setReason(''); load(); } }, [open, property?.id]);

  const requestDeletion = async () => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please explain why this property should be deleted.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const ownerConsents = owners.map((o) => ({
        user_id: o.id,
        user_name: o.full_name || o.email,
        role: o.role,
        consented: o.id === user?.id,
        consented_at: o.id === user?.id ? new Date().toISOString() : '',
      }));
      const rec = {
        property_id: property.id,
        property_name: property.name,
        requested_by_id: user?.id || '',
        requested_by_name: user?.full_name || user?.email || '',
        reason: reason.trim(),
        owner_consents: ownerConsents,
        status: ownerConsents.every((c) => c.consented) ? 'approved' : 'pending',
      };
      setConsent(rec);
      toast({ title: 'Deletion requested', description: 'All owners must consent before the property can be deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const giveConsent = async () => {
    setConsenting(true);
    try {
      const updated = (consent.owner_consents || []).map((c) =>
        c.user_id === user?.id ? { ...c, consented: true, consented_at: new Date().toISOString() } : c
      );
      const allDone = updated.every((c) => c.consented);
      const rec = {
        ...consent,
        owner_consents: updated,
        status: allDone ? 'approved' : 'pending',
      };
      setConsent(rec);
      toast({ title: 'Consent recorded', description: allDone ? 'All owners have consented.' : 'Your consent was recorded.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setConsenting(false);
    }
  };

  const executeDeletion = async () => {
    setExecuting(true);
    try {
      // 1. Fetch all rooms for the property to get their IDs
      const roomsList = await listRooms({ property_id: property.id }, '-created_date', 500).catch(() => []);
      const roomIds = (roomsList || []).map(r => r.id).filter(Boolean);

      // 2. Delete all bookings referencing these rooms first (satisfies room restrict constraint)
      if (roomIds.length > 0) {
        const { error: bookingsDeleteError } = await supabase
          .from('bookings')
          .delete()
          .in('room_id', roomIds);
        if (bookingsDeleteError) throw bookingsDeleteError;
      }

      // 3. Delete related rooms
      if (roomIds.length > 0) {
        await deleteRooms({ property_id: property.id }).catch(() => {});
      }

      // 4. Finally, delete the property itself (cascade deletes floors)
      await deleteProperty(property.id);

      setConsent({ ...consent, status: 'executed' });
      toast({ title: 'Property deleted', description: `${property.name} has been permanently removed.` });
      if (refreshProperties) await refreshProperties();
      onExecuted();
    } catch (err) {
      toast({ title: 'Error in deletion', description: err.message, variant: 'destructive' });
    } finally {
      setExecuting(false);
    }
  };

  const myConsent = (consent?.owner_consents || []).find((c) => c.user_id === user?.id);
  const allConsented = consent?.owner_consents?.every((c) => c.consented);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" /> Delete Property
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
        ) : !consent ? (
          /* Request form */
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 glass rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                Deleting <span className="text-foreground font-medium">{property?.name}</span> is permanent and removes all floors and rooms. This action requires <span className="text-gold font-medium">consent from all owners &amp; co-owners</span> before it can be executed.
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Reason for deletion *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="bg-white/[0.03] border-white/10 mt-1" placeholder="Explain why this property should be removed (e.g. added by mistake, sold, etc.)" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">Consent will be required from</div>
              <div className="space-y-2">
                {owners.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 glass rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-display font-semibold">
                      {(o.full_name || o.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{o.full_name || o.email?.split('@')[0]}</div>
                      <div className="text-[11px] text-muted-foreground">{roleLabel(o.role)}</div>
                    </div>
                    {o.id === user?.id && <span className="text-[10px] text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">You</span>}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</GoldButton>
              <GoldButton type="button" onClick={requestDeletion} disabled={creating} className="!from-red-600 !via-red-500 !to-red-400 !text-white">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Request Deletion
              </GoldButton>
            </DialogFooter>
          </div>
        ) : (
          /* Consent tracking */
          <div className="space-y-4 animate-fade-in">
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <StatusBadge status={consent.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Requested by</span>
                <span className="text-sm text-foreground">{consent.requested_by_name}</span>
              </div>
              {consent.reason && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-xs text-muted-foreground">Reason</span>
                  <p className="text-sm text-foreground mt-1">{consent.reason}</p>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">Owner Consents</div>
              <div className="space-y-2">
                {(consent.owner_consents || []).map((c) => (
                  <div key={c.user_id} className="flex items-center gap-3 glass rounded-lg px-3 py-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.consented ? 'bg-green-500/15 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                      {c.consented ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <ClockIcon />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{c.user_name}</div>
                      <div className="text-[11px] text-muted-foreground">{roleLabel(c.role)}{c.consented && c.consented_at ? ` · ${new Date(c.consented_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ' · Pending'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {consent.status === 'executed' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground glass rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> This property has already been deleted.
              </div>
            ) : allConsented && consent.status === 'approved' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 glass rounded-lg p-3 border-gold/20">
                  <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">All owners have consented. You can now permanently delete this property and all its floors &amp; rooms.</p>
                </div>
                <DialogFooter>
                  <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</GoldButton>
                  <GoldButton type="button" onClick={executeDeletion} disabled={executing} className="!from-red-600 !via-red-500 !to-red-400 !text-white">
                    {executing && <Loader2 className="w-4 h-4 animate-spin" />} Execute Deletion
                  </GoldButton>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-3">
                {myConsent && !myConsent.consented && (
                  <div className="flex items-start gap-2 glass rounded-lg p-3">
                    <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Your consent is still needed. Approve to proceed toward deletion.</p>
                  </div>
                )}
                {myConsent?.consented && (
                  <div className="flex items-center gap-2 text-xs text-green-400 glass rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4" /> Your consent has been recorded. Waiting for other owners.
                  </div>
                )}
                <DialogFooter>
                  <GoldButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</GoldButton>
                  {myConsent && !myConsent.consented && (
                    <GoldButton type="button" onClick={giveConsent} disabled={consenting}>
                      {consenting && <Loader2 className="w-4 h-4 animate-spin" />} Give Consent
                    </GoldButton>
                  )}
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}