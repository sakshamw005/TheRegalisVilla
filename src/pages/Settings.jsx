import React, { useState } from 'react';
import { Settings, Bell, Shield, Palette, Globe, Database } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import GoldButton from '@/components/GoldButton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import supabase from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const sections = [
  { icon: Shield, title: 'Security & Authentication', desc: 'PIN codes, biometric access, session policies' },
  { icon: Bell, title: 'Notifications', desc: 'Email, SMS, WhatsApp alert preferences' },
  { icon: Palette, title: 'Appearance', desc: 'Theme, branding, logo customization' },
  { icon: Globe, title: 'Localization', desc: 'Language, currency, date formats' },
  { icon: Database, title: 'Data & Backup', desc: 'Export, audit logs, retention policies' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, refreshProperties } = useAuth();
  const [cleaning, setCleaning] = useState(false);
  const [toggles, setToggles] = React.useState({ biometric: true, emailAlerts: true, smsAlerts: false, whatsappAlerts: true });

  const handleRemoveDummyData = async () => {
    const confirmText = prompt("Type 'DELETE ALL DATA' to confirm wiping all properties, rooms, bookings, payments, and guests:");
    if (confirmText !== 'DELETE ALL DATA') {
      toast({ title: 'Wipe cancelled', description: 'Confirmation text did not match.', variant: 'destructive' });
      return;
    }
    setCleaning(true);
    try {
      // 1. Delete all bookings first (references rooms)
      const { error: err1 } = await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err1) throw err1;

      // 2. Delete all properties (cascades to rooms & payments)
      const { error: err2 } = await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err2) throw err2;

      // 3. Delete all guests
      const { error: err3 } = await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err3) throw err3;

      toast({ title: 'System Wiped', description: 'All property, booking, guest, and payment data has been removed.' });
      if (refreshProperties) await refreshProperties();
    } catch (e) {
      toast({ title: 'Wipe failed', description: e.message, variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your system preferences" icon={Settings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((s, i) => {
          const Icon = s.icon;
          const toggleKey = ['biometric', 'emailAlerts', 'smsAlerts', 'whatsappAlerts', null][i];
          return (
            <div key={s.title} className="glass rounded-2xl p-5 gold-glow-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gold" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-medium text-foreground">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
                {toggleKey && (
                  <Switch checked={toggles[toggleKey]} onCheckedChange={(v) => { setToggles(t => ({ ...t, [toggleKey]: v })); toast({ title: `${s.title} ${v ? 'enabled' : 'disabled'}` }); }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {user?.role === 'admin' && (
        <div className="glass border-red-500/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
          <div className="space-y-1">
            <h3 className="font-display text-base font-semibold text-red-400 flex items-center gap-2">
              <Database className="w-5 h-5" /> Data Clean Up / Reset System
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg">
              Permanently wipe all reservation data, including all properties, rooms, bookings, payments, and guests. This action is irreversible.
            </p>
          </div>
          <GoldButton 
            onClick={handleRemoveDummyData} 
            disabled={cleaning}
            className="!from-red-700 !via-red-600 !to-red-500 !text-white hover:shadow-none font-semibold shrink-0"
          >
            {cleaning ? 'Wiping System...' : 'Remove Dummy Data'}
          </GoldButton>
        </div>
      )}

      <div className="glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-medium text-foreground">The Regalis Villa</h3>
          <p className="text-xs text-muted-foreground">Premium Property Management Suite · v1.0</p>
        </div>
        <GoldButton variant="outline" onClick={() => toast({ title: 'Settings saved' })}>Save Changes</GoldButton>
      </div>
    </div>
  );
}