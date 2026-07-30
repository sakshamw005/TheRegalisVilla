import supabase from './supabaseClient';

const orderExpression = (order) => {
  if (!order) return { column: 'created_at', ascending: false };
  const ascending = !order.startsWith('-');
  const column = order.replace(/^-/, '').replace('created_date', 'created_at');
  return { column, ascending };
};

const mapProperty = (row) => ({
  ...row,
  name: row.property_name || row.name,
  address: row.address,
  city: row.city,
  description: row.description,
  cover_image: row.cover_image || row.image_url || row.photo_url || '',
  status: row.status || 'active',
  rating: row.rating ?? 0,
  total_floors: row.total_floors ?? 0,
  total_rooms: row.total_rooms ?? 0,
  created_date: row.created_at,
});

const mapRoom = (row) => ({
  ...row,
  name: row.room_name || row.room_number || row.name,
  status: row.availability_status || 'available',
  price_per_night: row.price_per_night ?? 0,
  floor_id: row.floor_id || `${row.property_id || row.property}-${(row.floor !== undefined && row.floor !== null) ? row.floor : 0}`,
  floor_name: row.floor_name || `Floor ${(row.floor !== undefined && row.floor !== null) ? row.floor : 0}`,
  room_number: row.room_number,
  created_date: row.created_at,
});

const mapCustomer = (row) => ({
  ...row,
  id: row.id,
  name: row.full_name || row.name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  total_stays: row.total_stays ?? 0,
  lifetime_spending: row.lifetime_spending ?? 0,
  created_date: row.created_at,
});

const mapUser = (row) => ({
  ...row,
  id: row.id,
  full_name: row.full_name,
  email: row.email,
  role: row.role,
  created_date: row.created_at,
});

const mapBooking = (row) => {
  const checkIn = row.check_in_date || row.check_in;
  const checkOut = row.check_out_date || row.check_out;
  const calculatedNights = (checkIn && checkOut) ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 1;

  return {
    ...row,
    id: row.id,
    booking_id: row.booking_number || row.booking_id,
    customer_name: row.customer_name || row.guest?.full_name || '',
    customer_phone: row.guest?.phone || row.customer_phone || '',
    property_name: row.property_name || row.property?.property_name || row.room?.property_name || '',
    room_name: row.room_name || row.room?.room_name || row.room?.room_number || '',
    floor_name: row.floor_name || (row.room?.floor ? `Floor ${row.room.floor}` : ''),
    check_in: row.check_in_date || row.check_in,
    check_out: row.check_out_date || row.check_out,
    total_nights: row.total_nights ?? calculatedNights,
    room_price: row.room_price ?? row.room?.price_per_night ?? 0,
    grand_total: row.final_amount ?? row.total_price ?? row.grand_total ?? 0,
    booking_status: row.booking_status || row.status || 'reserved',
    created_date: row.created_at,
    payments: row.payments || [],
  };
};

const mapPayment = (row) => ({
  ...row,
  id: row.id,
  customer_name: row.customer_name || row.guest?.full_name || '',
  property_name: row.property_name || row.booking?.property_name || '',
  method: row.payment_mode || row.method,
  amount: row.amount ?? 0,
  status: row.payment_status || row.status || 'pending',
  created_date: row.created_at,
});

const fetchRooms = async (filter = {}) => {
  let query = supabase.from('rooms').select('*');
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRoom);
};

const fetchFloorGroups = async (propertyId) => {
  const { data, error } = await supabase.from('rooms').select('floor').eq('property_id', propertyId).is('deleted_at', null);
  if (error) throw error;
  const floors = Array.from(new Set((data || []).map((room) => (room.floor === null || room.floor === undefined) ? 0 : Number(room.floor)))).sort((a, b) => a - b);
  return floors.map((floorNumber, index) => ({
    id: `${propertyId}-${floorNumber}`,
    property_id: propertyId,
    name: `Floor ${floorNumber}`,
    floor_number: floorNumber,
    description: '',
    floor_price: 0,
    allow_entire_floor_booking: false,
    order: index,
  }));
};

export const listProperties = async (order, limit) => {
  const { column, ascending } = orderExpression(order);
  let query = supabase.from('properties').select('*').is('deleted_at', null);
  if (column) query = query.order(column, { ascending });
  if (limit) query = query.limit(limit);
  const { data: propertiesData, error: propError } = await query;
  if (propError) throw propError;

  if (!propertiesData || propertiesData.length === 0) return [];

  // Query rooms table to calculate floor and room counts dynamically
  const { data: roomsData, error: roomsError } = await supabase
    .from('rooms')
    .select('property_id, floor')
    .is('deleted_at', null);

  if (roomsError) throw roomsError;

  const roomsByProperty = {};
  const floorsByProperty = {};

  (roomsData || []).forEach(r => {
    const pid = r.property_id;
    if (!roomsByProperty[pid]) roomsByProperty[pid] = 0;
    roomsByProperty[pid]++;

    if (!floorsByProperty[pid]) floorsByProperty[pid] = new Set();
    const floorValue = (r.floor !== null && r.floor !== undefined) ? Number(r.floor) : 0;
    floorsByProperty[pid].add(floorValue);
  });

  return propertiesData.map(row => {
    const mapped = mapProperty(row);
    mapped.total_rooms = roomsByProperty[row.id] || 0;
    mapped.total_floors = floorsByProperty[row.id] ? floorsByProperty[row.id].size : 0;
    return mapped;
  });
};

export const getProperty = async (id) => {
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) throw error;
  return mapProperty(data);
};

export const createProperty = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const insertPayload = {
    property_name: payload.name,
    address: payload.address,
    city: payload.city,
    state: payload.state || '',
    country: payload.country || 'India',
    description: payload.description,
    contact_number: payload.contact_number || payload.phone || '',
    email: payload.email || '',
    owner_id: payload.owner_id || userId || null,
    cover_image: payload.cover_image || '',
  };
  const { data, error } = await supabase.from('properties').insert([insertPayload]).select().single();
  if (error) throw error;
  return mapProperty(data);
};

export const updateProperty = async (id, payload) => {
  const updatePayload = {
    property_name: payload.name,
    address: payload.address,
    city: payload.city,
    state: payload.state || '',
    country: payload.country || 'India',
    description: payload.description,
    contact_number: payload.contact_number || payload.phone || '',
    email: payload.email || '',
    cover_image: payload.cover_image || '',
  };
  const { data, error } = await supabase.from('properties').update(updatePayload).eq('id', id).select().single();
  if (error) throw error;
  return mapProperty(data);
};

export const deleteProperty = async (id) => {
  const { data, error } = await supabase.from('properties').delete().eq('id', id).select().single();
  if (error) throw error;
  return mapProperty(data);
};

export const listFloorsForProperty = async (propertyId) => {
  if (!propertyId) return [];
  return fetchFloorGroups(propertyId);
};

export const listRooms = async (filter = {}, order, limit) => {
  const cleaned = { ...filter };
  if (cleaned.floor_id && typeof cleaned.floor_id === 'string' && cleaned.floor_id.includes('-')) {
    const parts = cleaned.floor_id.split('-');
    const floorValue = Number(parts[parts.length - 1]);
    const propertyId = parts.slice(0, -1).join('-');
    return fetchRooms({ property_id: propertyId, floor: floorValue });
  }
  let query = supabase.from('rooms').select('*');
  Object.entries(cleaned).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });
  if (order) {
    const { column, ascending } = orderExpression(order);
    if (column) query = query.order(column, { ascending });
  }
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRoom);
};

export const createRoom = async (payload) => {
  const insertPayload = {
    property_id: payload.property_id,
    room_number: payload.room_number,
    room_name: payload.name,
    room_type: payload.category || payload.room_type,
    capacity: payload.capacity,
    floor: (payload.floor_number !== undefined && payload.floor_number !== null && payload.floor_number !== '') ? Number(payload.floor_number) : (payload.floor !== undefined && payload.floor !== null && payload.floor !== '') ? Number(payload.floor) : null,
    price_per_night: payload.price_per_night,
    availability_status: payload.status || 'available',
    description: payload.description,
    amenities: payload.amenities || [],
  };
  const { data, error } = await supabase.from('rooms').insert([insertPayload]).select().single();
  if (error) throw error;
  return mapRoom(data);
};

export const updateRoom = async (id, payload) => {
  const updatePayload = {
    property_id: payload.property_id,
    room_number: payload.room_number,
    room_name: payload.name,
    room_type: payload.category || payload.room_type,
    capacity: payload.capacity,
    floor: (payload.floor_number !== undefined && payload.floor_number !== null && payload.floor_number !== '') ? Number(payload.floor_number) : (payload.floor !== undefined && payload.floor !== null && payload.floor !== '') ? Number(payload.floor) : null,
    price_per_night: payload.price_per_night,
    availability_status: payload.status || 'available',
    description: payload.description,
    amenities: payload.amenities || [],
  };
  const { data, error } = await supabase.from('rooms').update(updatePayload).eq('id', id).select().single();
  if (error) throw error;
  return mapRoom(data);
};

export const deleteRooms = async (filter = {}) => {
  let query = supabase.from('rooms').delete();
  Object.entries(filter || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });
  const { data, error } = await query.select();
  if (error) throw error;
  return (data || []).map(mapRoom);
};

export const listCustomers = async (order, limit) => {
  const { column, ascending } = orderExpression(order);
  let query = supabase.from('guests').select('*');
  if (column) query = query.order(column, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCustomer);
};

export const createCustomer = async (payload) => {
  const insertPayload = {
    full_name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
  };
  const { data, error } = await supabase.from('guests').insert([insertPayload]).select().single();
  if (error) throw error;
  return mapCustomer(data);
};

export const updateCustomer = async (id, payload) => {
  const updatePayload = {
    full_name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
  };
  const { data, error } = await supabase.from('guests').update(updatePayload).eq('id', id).select().single();
  if (error) throw error;
  return mapCustomer(data);
};

export const listBookings = async (order, limit) => {
  const { column, ascending } = orderExpression(order);
  let query = supabase.from('bookings').select('*, guest:guest_id(*), room:room_id(*), created_by(*), payments(*)');
  if (column) query = query.order(column, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapBooking);
};

export const filterBookings = async (filter = {}, order, limit) => {
  const { column, ascending } = orderExpression(order);
  let query = supabase.from('bookings').select('*, guest:guest_id(*), room:room_id(*)');
  if (filter?.room_id) query = query.eq('room_id', filter.room_id);
  else if (filter?.floor_id) {
    const [propertyId, floorValue] = filter.floor_id.split('-');
    const rooms = await listRooms({ property_id: propertyId, floor: Number(floorValue) });
    const ids = rooms.map((room) => room.id).filter(Boolean);
    query = query.in('room_id', ids);
  } else {
    Object.entries(filter || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }
  if (column) query = query.order(column, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapBooking);
};

export const createBooking = async (payload) => {
  const insertPayload = {
    booking_number: payload.booking_id,
    room_id: payload.room_id || null,
    guest_id: payload.customer_id || null,
    created_by: payload.booked_by_id || null,
    check_in_date: payload.check_in,
    check_out_date: payload.check_out,
    number_of_guests: payload.number_of_guests || 1,
    booking_source: payload.booking_source || 'web',
    booking_status: payload.booking_status || 'reserved',
    total_price: payload.total_price ?? payload.grand_total,
    advance_paid: payload.advance_amount,
    discount: payload.discount,
    tax: payload.taxes,
    final_amount: payload.grand_total,
    special_requests: payload.notes,
  };
  const { data, error } = await supabase.from('bookings').insert([insertPayload]).select().single();
  if (error) throw error;
  return mapBooking(data);
};

export const listPayments = async (order, limit) => {
  const { column, ascending } = orderExpression(order);
  let query = supabase.from('payments').select('*, booking:booking_id(*)');
  if (column) query = query.order(column, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    id: row.id,
    customer_name: row.customer_name || row.booking?.guest_name || '',
    property_name: row.property_name || row.booking?.property_name || '',
    method: row.payment_mode,
    amount: row.amount ?? 0,
    status: row.payment_status || 'pending',
    created_date: row.created_at,
  }));
};

export const createPayment = async (payload) => {
  const insertPayload = {
    booking_id: payload.booking_id,
    amount: payload.amount,
    payment_mode: payload.method,
    payment_status: payload.status || 'completed',
    received_by: payload.recorded_by_id || null,
    notes: payload.notes || payload.payment_notes || '',
  };
  const { data, error } = await supabase.from('payments').insert([insertPayload]).select().single();
  if (error) throw error;
  return mapPayment(data);
};

export const listUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return (data || []).map(mapUser);
};

export const listUsersByStatus = async (status) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapUser);
};

export const approveUser = async (userId, role) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, status: 'active' })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
};

export const rejectUser = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
};

export const deactivateUser = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
};

export const changeUserRole = async (userId, role) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
};

const supabaseService = {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  listFloorsForProperty,
  listRooms,
  createRoom,
  updateRoom,
  deleteRooms,
  listCustomers,
  createCustomer,
  updateCustomer,
  listBookings,
  filterBookings,
  createBooking,
  listPayments,
  createPayment,
  listUsers,
  listUsersByStatus,
  approveUser,
  rejectUser,
  deactivateUser,
  changeUserRole,
};

export default supabaseService;

