import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Menu, 
  ChevronDown, 
  LogOut, 
  User as UserIcon, 
  Building2, 
  Phone, 
  MapPin, 
  Loader2, 
  Shield 
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useLocation } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import GoldButton from '@/components/GoldButton';

export default function Topbar({ onMenuClick }) {
  const { 
    user, 
    logout, 
    propertiesList, 
    selectedProperty, 
    setSelectedProperty, 
    updateProfile 
  } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Profile Form States
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const handler = (e) => { 
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false); 
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
    }
  }, [user, profileOpen]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast({ 
        title: 'Validation error', 
        description: 'Name is required', 
        variant: 'destructive' 
      });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: profileName,
        phone: profilePhone,
        address: profileAddress
      });
      toast({ title: 'Profile updated successfully' });
      setProfileOpen(false);
    } catch (err) {
      toast({ 
        title: 'Error updating profile', 
        description: err.message || 'Update failed', 
        variant: 'destructive' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const roleLabel = (user?.role || 'user').replace('_', ' ');

  return (
    <header className="sticky top-0 z-30 h-[68px] glass-strong border-b border-gold/12 flex items-center justify-between px-4 lg:px-6 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-gold transition-colors p-1">
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search */}
        {location.pathname !== '/' && (
          <div className="relative flex-1 max-w-md animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search bookings, customers, rooms…"
              className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/30 focus:bg-white/[0.05] transition-all"
            />
            <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Property Selector Dropdown */}
        {propertiesList && propertiesList.length > 0 && (
          <div className="relative animate-scale-in">
            <Select value={selectedProperty?.id} onValueChange={(id) => {
              const prop = propertiesList.find(p => p.id === id);
              setSelectedProperty(prop);
            }}>
              <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/5 text-foreground h-10 hover:border-gold/30 focus:border-gold/30 focus:outline-none focus:ring-0 transition-all text-xs font-semibold tracking-wider uppercase">
                <Building2 className="w-3.5 h-3.5 mr-2 text-gold shrink-0" />
                <SelectValue placeholder="Select Property" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-gold/20 text-foreground">
                {propertiesList.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="capitalize text-xs font-medium">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-px h-6 bg-white/10 hidden lg:block" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center text-gold font-display font-semibold text-sm capitalize">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-foreground leading-none capitalize truncate max-w-[120px]">{displayName}</div>
              {user?.role === 'admin' && (
                <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{roleLabel}</div>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl p-2 shadow-2xl animate-scale-in origin-top-right">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <div className="text-sm font-medium text-foreground truncate capitalize">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <button 
                onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] rounded-lg transition-colors"
              >
                <UserIcon className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* My Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="bg-[#1A1A1A] border-gold/20 max-w-md w-[95%] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-gold font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gold" />
              My Profile
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Update your personal details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Full Name *</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-white/[0.03] border-white/10 text-foreground h-11"
                placeholder="Your Name"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Email Address</Label>
              <Input
                value={user?.email || ""}
                className="bg-[#141414] border-white/5 text-muted-foreground/60 h-11 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-foreground h-11 pl-10"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                <Textarea
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-foreground pl-10 pt-2.5"
                  rows={2}
                  placeholder="Your address details"
                />
              </div>
            </div>

            {user?.role === "admin" && (
              <div className="space-y-1 pt-1">
                <Label className="text-muted-foreground text-xs">System Role</Label>
                <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-foreground capitalize font-semibold tracking-wide flex items-center gap-1.5 w-fit">
                  <Shield className="w-3.5 h-3.5 text-gold" />
                  {roleLabel}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <GoldButton type="button" variant="ghost" onClick={() => setProfileOpen(false)}>
                Cancel
              </GoldButton>
              <GoldButton type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </GoldButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}