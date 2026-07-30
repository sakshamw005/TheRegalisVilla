import React, { useState, useEffect } from 'react';
import { getProperty, listFloorsForProperty, listRooms } from '@/api/supabaseData';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Layers, BedDouble, Building2, ChevronRight, MapPin, Pencil, Trash2 } from 'lucide-react';

import StatusBadge from '@/components/StatusBadge';
import GoldButton from '@/components/GoldButton';
import EmptyState from '@/components/EmptyState';
import RoomFormDialog from '@/components/RoomFormDialog';
import PropertyFormDialog from '@/components/PropertyFormDialog';
import DeleteConsentDialog from '@/components/DeleteConsentDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function PropertyDetail() {
  const { id } = useParams();
  const { refreshProperties } = useAuth();
  const [property, setProperty] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomDialog, setRoomDialog] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [addingToFloor, setAddingToFloor] = useState(null);
  const [editProperty, setEditProperty] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [prop, fl, rm] = await Promise.all([
        getProperty(id).catch(() => null),
        listFloorsForProperty(id).catch(() => []),
        listRooms({ property_id: id }, '-created_date', 100).catch(() => []),
      ]);

      const dbFloors = fl || [];
      const savedEmptyFloors = JSON.parse(localStorage.getItem(`empty_floors_${id}`) || '[]').map(Number);

      // Merge empty floors with database floors
      const mergedFloors = [...dbFloors];
      savedEmptyFloors.forEach(num => {
        if (!mergedFloors.some(f => Number(f.floor_number) === num)) {
          mergedFloors.push({
            id: `${id}-${num}`,
            property_id: id,
            name: `Floor ${num}`,
            floor_number: num,
            description: 'No rooms added yet',
            floor_price: 0,
            allow_entire_floor_booking: true,
          });
        }
      });

      mergedFloors.sort((a, b) => a.floor_number - b.floor_number);

      setProperty(prop);
      setFloors(mergedFloors);
      setRooms(rm || []);
    } catch (e) {
      console.error('Error loading property details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRoomSaved = () => {
    if (addingToFloor) {
      // Clear floor from empty floors if we added a room to it
      const savedEmptyFloors = JSON.parse(localStorage.getItem(`empty_floors_${id}`) || '[]').map(Number);
      const filtered = savedEmptyFloors.filter(num => num !== addingToFloor.floor_number);
      localStorage.setItem(`empty_floors_${id}`, JSON.stringify(filtered));
    }
    setRoomDialog(false);
    setEditRoom(null);
    setAddingToFloor(null);
    load();
  };

  const handlePropertySaved = () => { setEditProperty(false); load(); };

  // Add Floor Button Callback with duplicate checking
  const handleAddFloor = () => {
    const numStr = prompt('Enter Floor Number (e.g., 0, 1, 2):');
    if (numStr === null || numStr.trim() === '') return;
    const num = parseInt(numStr.trim(), 10);
    if (isNaN(num)) {
      alert('Please enter a valid floor number.');
      return;
    }
    const saved = JSON.parse(localStorage.getItem(`empty_floors_${id}`) || '[]').map(Number);
    const existingNumbers = floors.map(f => Number(f.floor_number));
    
    if (existingNumbers.includes(num) || saved.includes(num)) {
      alert('Floor already exists.');
      return;
    }
    const updated = [...saved, num].sort((a, b) => a - b);
    localStorage.setItem(`empty_floors_${id}`, JSON.stringify(updated));
    load();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-2xl glass animate-shimmer" />
        <div className="h-16 rounded-xl glass animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-2xl glass animate-shimmer" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="glass rounded-2xl">
        <EmptyState icon={Building2} title="Property not found" description="This property may have been removed."
          action={<Link to="/properties"><GoldButton variant="outline"><ArrowLeft className="w-4 h-4" /> Back to Properties</GoldButton></Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-down">
        <Link to="/properties" className="hover:text-gold transition-colors">Properties</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground truncate">{property.name}</span>
      </div>

      {/* Hero Header */}
      <div className="relative h-56 lg:h-72 rounded-2xl overflow-hidden glass animate-fade-up">
        {property.cover_image && (
          <img src={property.cover_image} alt={property.name} className="w-full h-full object-cover animate-fade-in" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={property.status} />
                {property.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{property.city}</span>}
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">{property.name}</h1>
              {property.address && <p className="text-sm text-muted-foreground mt-1">{property.address}</p>}
            </div>
            <div className="flex items-center gap-2">
              <GoldButton variant="outline" onClick={() => setEditProperty(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </GoldButton>
              <GoldButton variant="ghost" onClick={() => setDeleteDialog(true)} className="!text-red-400 hover:!bg-red-500/10">
                <Trash2 className="w-4 h-4" /> Delete
              </GoldButton>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Card containing ONLY "+ Add Floor" */}
      <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-up border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Layers className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-foreground">Room Overview</h3>
            <p className="text-xs text-muted-foreground">Manage floors and room pricing for this property.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-xs text-muted-foreground">Rooms</div>
            <div className="text-sm font-medium text-foreground">{rooms.length}</div>
          </div>
        </div>
        
        <GoldButton variant="primary" onClick={handleAddFloor}>
          <Plus className="w-4 h-4 animate-pulse mr-1" /> Add Floor
        </GoldButton>
      </div>

      {/* Floors list and rooms rendering */}
      {floors.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState icon={Layers} title="No rooms yet" description="Add floors and rooms to this property to start accepting bookings."
            action={
              <GoldButton variant="primary" onClick={handleAddFloor}><Plus className="w-4 h-4 mr-1" /> Add Floor</GoldButton>
            } 
          />
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map((f) => {
            const fRooms = rooms.filter(r => r.floor_id === f.id || Number(r.floor) === f.floor_number);
            return (
              <div key={f.id} className="glass rounded-2xl p-6 border border-white/5 space-y-4 animate-fade-up">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{f.name}</h3>
                      <p className="text-xs text-muted-foreground">{fRooms.length} {fRooms.length === 1 ? 'room' : 'rooms'} total</p>
                    </div>
                  </div>
                  
                  <GoldButton variant="outline" className="h-9 text-xs" onClick={() => { 
                    setEditRoom(null);
                    setAddingToFloor(f);
                    setRoomDialog(true);
                  }}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Room to {f.name}
                  </GoldButton>
                </div>

                {fRooms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground/45 border border-dashed border-white/10 rounded-xl">
                    No rooms added to this floor yet. Click "Add Room" to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {fRooms.map((room) => {
                      const isBooked = room.status === 'booked' || room.status === 'occupied';
                      return (
                        <div 
                          key={room.id}
                          onClick={() => { 
                            setEditRoom(room); 
                            setAddingToFloor(f); 
                            setRoomDialog(true); 
                          }}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between min-h-[92px] ${
                            isBooked 
                              ? 'bg-white/[0.02] border-white/5 opacity-50 grayscale text-muted-foreground hover:opacity-75' 
                              : 'glass border-white/10 text-foreground hover:border-gold/30 hover:scale-[1.01]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold font-display truncate max-w-[120px]">{room.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                                isBooked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                              }`}>
                                {isBooked ? 'Booked' : 'Available'}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{room.category || 'Bedroom'}</div>
                          </div>
                          <div className="text-xs font-semibold text-gold mt-2.5">
                            ₹{Number(room.price_per_night).toLocaleString('en-IN')}/night
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog Modals */}
      <RoomFormDialog open={roomDialog} onOpenChange={(v) => { setRoomDialog(v); if (!v) { setEditRoom(null); setAddingToFloor(null); } }} property={property} floor={addingToFloor} room={editRoom} onSaved={handleRoomSaved} />
      <PropertyFormDialog open={editProperty} onOpenChange={setEditProperty} property={property} onSaved={handlePropertySaved} />
      <DeleteConsentDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        property={property}
        onExecuted={async () => {
          setDeleteDialog(false);
          if (refreshProperties) await refreshProperties();
          navigate('/properties');
        }}
      />
    </div>
  );
}