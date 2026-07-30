-- Supabase / PostgreSQL schema for Hotel / Resort / Guest House Management System
-- Production-ready schema with UUID primary keys, constraints, indexes, triggers, views and RLS.

-- Required extensions for UUID generation and exclusion constraints
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Enums for consistent status and role values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role_enum') THEN
    CREATE TYPE profile_role_enum AS ENUM ('admin','owner','manager','receptionist','user');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_status_enum') THEN
    CREATE TYPE profile_status_enum AS ENUM ('pending','active','rejected','suspended');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM ('reserved','checked_in','checked_out','cancelled','no_show');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM ('pending','completed','failed','refunded');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_availability_enum') THEN
    CREATE TYPE room_availability_enum AS ENUM ('available','occupied','maintenance','blocked');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode_enum') THEN
    CREATE TYPE payment_mode_enum AS ENUM ('cash','card','upi','bank_transfer','wallet');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE notification_type_enum AS ENUM ('info','warning','alert','message');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_source_enum') THEN
    CREATE TYPE booking_source_enum AS ENUM ('web','phone','walk_in','agent','other');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_status_enum') THEN
    CREATE TYPE staff_status_enum AS ENUM ('active','inactive','terminated');
  END IF;
END $$;

-- ====================================================================
-- Tables
-- ====================================================================

-- Profiles linked to Supabase Auth users
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  email text not null,
  full_name text,
  phone text,
  address text,
  role profile_role_enum not null default 'user',
  status profile_status_enum not null default 'pending',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_profiles_email on profiles (lower(email));
create index if not exists idx_profiles_phone on profiles (phone);
create index if not exists idx_profiles_role on profiles (role);
create index if not exists idx_profiles_status on profiles (status);

comment on table profiles is 'User profile data linked to Supabase auth.users entries.';
comment on column profiles.role is 'Application role for access control.';
comment on column profiles.status is 'Approval and active state management for user access.';

-- Properties owned by profiles
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  property_name text not null,
  address text not null,
  city text not null,
  state text,
  country text not null,
  description text,
  contact_number text,
  email text,
  owner_id uuid not null references profiles(id) on delete restrict,
  deleted_at timestamptz,
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_owner_id on properties (owner_id);
create index if not exists idx_properties_city on properties (city);
create index if not exists idx_properties_country on properties (country);

comment on table properties is 'Hotel, resort or guest house properties owned by profile users.';

-- Rooms within a property
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_number text not null,
  room_name text,
  room_type text,
  capacity int not null default 1,
  floor int,
  price_per_night numeric(12,2) not null default 0,
  amenities jsonb default '{}'::jsonb,
  availability_status room_availability_enum not null default 'available',
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_capacity_positive check (capacity > 0),
  constraint rooms_price_positive check (price_per_night >= 0)
);

create unique index if not exists uq_rooms_property_room_number on rooms (property_id, room_number);
create index if not exists idx_rooms_property_id on rooms (property_id);
create index if not exists idx_rooms_availability_status on rooms (availability_status);
create index if not exists idx_rooms_room_type on rooms (room_type);

comment on table rooms is 'Individual rooms belonging to properties including pricing and availability.';

-- Guests separate from profiles for reservations
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  government_id_type text,
  government_id_number text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guests_email on guests (lower(email));
create index if not exists idx_guests_phone on guests (phone);

comment on table guests is 'Guest details for booking and payment tracking separate from application profiles.';

-- Bookings for rooms
create sequence if not exists booking_number_seq;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  room_id uuid not null references rooms(id) on delete restrict,
  guest_id uuid not null references guests(id) on delete restrict,
  created_by uuid not null references profiles(id) on delete restrict,
  check_in_date date not null,
  check_out_date date not null,
  number_of_guests int not null default 1,
  booking_source booking_source_enum not null default 'web',
  booking_status booking_status_enum not null default 'reserved',
  total_price numeric(12,2) not null default 0,
  advance_paid numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  final_amount numeric(12,2) not null default 0,
  special_requests text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_check check (check_out_date > check_in_date),
  constraint bookings_number_of_guests_positive check (number_of_guests > 0),
  constraint bookings_price_non_negative check (total_price >= 0 and advance_paid >= 0 and discount >= 0 and tax >= 0 and final_amount >= 0),
  constraint bookings_advance_paid_check check (advance_paid <= total_price),
  constraint bookings_no_overlap exclude using gist (room_id with =, daterange(check_in_date, check_out_date, '[)') with &&) where (deleted_at is null and booking_status not in ('cancelled','no_show'))
);

create index if not exists idx_bookings_booking_number on bookings (booking_number);
create index if not exists idx_bookings_room_id on bookings (room_id);
create index if not exists idx_bookings_guest_id on bookings (guest_id);
create index if not exists idx_bookings_created_by on bookings (created_by);
create index if not exists idx_bookings_status on bookings (booking_status);
create index if not exists idx_bookings_check_in on bookings (check_in_date);
create index if not exists idx_bookings_check_out on bookings (check_out_date);
create index if not exists idx_bookings_created_at on bookings (created_at);

comment on table bookings is 'Room booking records including stay dates, financials and reservation status.';

-- Payments for bookings
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_mode payment_mode_enum not null,
  payment_status payment_status_enum not null default 'pending',
  transaction_reference text,
  received_by uuid references profiles(id) on delete set null,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount > 0)
);

create index if not exists idx_payments_booking_id on payments (booking_id);
create index if not exists idx_payments_status on payments (payment_status);
create index if not exists idx_payments_created_at on payments (created_at);

comment on table payments is 'Payment records for bookings enabling multiple receipts per reservation.';

-- Expenses tracked per property
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null,
  description text,
  expense_date date not null,
  recorded_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount > 0)
);

create index if not exists idx_expenses_property_id on expenses (property_id);
create index if not exists idx_expenses_expense_date on expenses (expense_date);
create index if not exists idx_expenses_created_at on expenses (created_at);

comment on table expenses is 'Operational and property expenses for cost tracking.';

-- Staff assignments for properties
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  designation text not null,
  salary numeric(12,2) not null default 0,
  joining_date date not null,
  status staff_status_enum not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_salary_non_negative check (salary >= 0)
);

create unique index if not exists uq_staff_property_profile on staff (property_id, profile_id);
create index if not exists idx_staff_property_id on staff (property_id);
create index if not exists idx_staff_profile_id on staff (profile_id);

comment on table staff is 'Staff members assigned to properties for manager/receptionist duties.';

-- Notifications for profiles
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type notification_type_enum not null default 'info',
  is_read boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_profile_id on notifications (profile_id);
create index if not exists idx_notifications_created_at on notifications (created_at);
create index if not exists idx_notifications_is_read on notifications (is_read);

comment on table notifications is 'In-app notifications for profile users.';

-- Audit log table
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  performed_by uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check check (action in ('INSERT','UPDATE','DELETE'))
);

create index if not exists idx_audit_logs_table_name on audit_logs (table_name);
create index if not exists idx_audit_logs_record_id on audit_logs (record_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at);

comment on table audit_logs is 'Immutable audit log records for data changes.';

-- ====================================================================
-- Helper Functions
-- ====================================================================

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_owner() returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'manager'
      and status = 'active'
  );
$$;

create or replace function public.is_receptionist() returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'receptionist'
      and status = 'active'
  );
$$;

create or replace function public.can_manage_property(p_property_id uuid) returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1
    from properties p
    where p.id = p_property_id
      and p.deleted_at is null
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1 from profiles pr
          where pr.id = auth.uid()
            and pr.role = 'receptionist'
            and pr.status = 'active'
        )
        or exists (
          select 1 from staff s
          where s.property_id = p_property_id
            and s.profile_id = auth.uid()
            and s.status = 'active'
            and s.deleted_at is null
            and s.designation in ('manager','receptionist')
        )
      )
  );
$$;

create or replace function public.can_access_booking(p_booking_id uuid) returns boolean language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (
    select 1 from bookings b
    join rooms r on r.id = b.room_id
    where b.id = p_booking_id
      and b.deleted_at is null
      and (
        b.created_by = auth.uid()
        or public.can_manage_property(r.property_id)
      )
  );
$$;

create or replace function public.generate_booking_number() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.booking_number is null or trim(new.booking_number) = '' then
    new.booking_number := format('BKG-%s-%06s', to_char(now(), 'YYYYMMDD'), nextval('booking_number_seq')::text);
  end if;
  return new;
end;
$$;

create or replace function public.booking_overlap_check() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  overlap_count int;
begin
  if new.check_out_date <= new.check_in_date then
    raise exception 'check_out_date must be after check_in_date';
  end if;

  select count(*) into overlap_count
  from bookings
  where room_id = new.room_id
    and (new.id is null or id <> new.id)
    and booking_status not in ('cancelled','no_show')
    and daterange(check_in_date, check_out_date, '[)') && daterange(new.check_in_date, new.check_out_date, '[)')
    and deleted_at is null;

  if overlap_count > 0 then
    raise exception 'Booking dates overlap with an existing reservation for this room';
  end if;

  return new;
end;
$$;

create or replace function public.calculate_booking_final_amount() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  new.discount := coalesce(new.discount, 0);
  new.tax := coalesce(new.tax, 0);
  new.advance_paid := coalesce(new.advance_paid, 0);
  new.total_price := coalesce(new.total_price, 0);
  new.final_amount := new.total_price - new.discount + new.tax;

  if new.final_amount < 0 then
    raise exception 'final_amount cannot be negative';
  end if;

  return new;
end;
$$;

create or replace function public.update_room_availability_on_booking() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.booking_status = 'checked_in' and old.booking_status <> 'checked_in') then
    update rooms
    set availability_status = 'occupied', updated_at = now()
    where id = new.room_id;
  elsif tg_op = 'UPDATE' and new.booking_status in ('checked_out','cancelled','no_show') and old.booking_status <> new.booking_status then
    if not exists (
      select 1 from bookings b
      where b.room_id = new.room_id
        and b.booking_status = 'checked_in'
        and b.deleted_at is null
    ) then
      update rooms
      set availability_status = 'available', updated_at = now()
      where id = new.room_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_log_trigger() returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if tg_table_name = 'audit_logs' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    insert into audit_logs(table_name, record_id, action, performed_by, old_data, new_data, created_at)
    values (tg_table_name, old.id::uuid, tg_op, auth.uid(), to_jsonb(old), null, now());
    return old;
  elsif tg_op = 'INSERT' then
    insert into audit_logs(table_name, record_id, action, performed_by, old_data, new_data, created_at)
    values (tg_table_name, new.id::uuid, tg_op, auth.uid(), null, to_jsonb(new), now());
    return new;
  else
    insert into audit_logs(table_name, record_id, action, performed_by, old_data, new_data, created_at)
    values (tg_table_name, new.id::uuid, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new), now());
    return new;
  end if;
end;
$$;

-- ====================================================================
-- Triggers
-- ====================================================================

create trigger trg_profiles_updated_at
before update on profiles
for each row execute function public.set_updated_at();

create trigger trg_properties_updated_at
before update on properties
for each row execute function public.set_updated_at();

create trigger trg_rooms_updated_at
before update on rooms
for each row execute function public.set_updated_at();

create trigger trg_guests_updated_at
before update on guests
for each row execute function public.set_updated_at();

create trigger trg_bookings_before_insert_update
before insert or update on bookings
for each row execute function public.calculate_booking_final_amount();

create trigger trg_bookings_overlap_check
before insert or update on bookings
for each row execute function public.booking_overlap_check();

create trigger trg_bookings_generate_number
before insert on bookings
for each row execute function public.generate_booking_number();

create trigger trg_bookings_room_availability
after insert or update on bookings
for each row execute function public.update_room_availability_on_booking();

create trigger trg_bookings_updated_at
before update on bookings
for each row execute function public.set_updated_at();

create trigger trg_payments_updated_at
before update on payments
for each row execute function public.set_updated_at();

create trigger trg_expenses_updated_at
before update on expenses
for each row execute function public.set_updated_at();

create trigger trg_staff_updated_at
before update on staff
for each row execute function public.set_updated_at();

create trigger trg_notifications_updated_at
before update on notifications
for each row execute function public.set_updated_at();

create trigger trg_audit_profiles
after insert or update or delete on profiles
for each row execute function public.audit_log_trigger();

create trigger trg_audit_properties
after insert or update or delete on properties
for each row execute function public.audit_log_trigger();

create trigger trg_audit_rooms
after insert or update or delete on rooms
for each row execute function public.audit_log_trigger();

create trigger trg_audit_guests
after insert or update or delete on guests
for each row execute function public.audit_log_trigger();

create trigger trg_audit_bookings
after insert or update or delete on bookings
for each row execute function public.audit_log_trigger();

create trigger trg_audit_payments
after insert or update or delete on payments
for each row execute function public.audit_log_trigger();

create trigger trg_audit_expenses
after insert or update or delete on expenses
for each row execute function public.audit_log_trigger();

create trigger trg_audit_staff
after insert or update or delete on staff
for each row execute function public.audit_log_trigger();

create trigger trg_audit_notifications
after insert or update or delete on notifications
for each row execute function public.audit_log_trigger();

-- ====================================================================
-- Views
-- ====================================================================

create or replace view active_bookings as
select b.*
from bookings b
where b.booking_status in ('reserved','checked_in')
  and b.deleted_at is null;

create or replace view todays_check_ins as
select b.*
from bookings b
where b.check_in_date = current_date
  and b.deleted_at is null;

create or replace view todays_check_outs as
select b.*
from bookings b
where b.check_out_date = current_date
  and b.deleted_at is null;

create or replace view pending_payments as
select b.id as booking_id,
       b.booking_number,
       b.room_id,
       b.guest_id,
       b.created_by,
       b.total_price,
       b.advance_paid,
       b.discount,
       b.tax,
       b.final_amount,
       coalesce(sum(p.amount) filter (where p.payment_status = 'completed'), 0) as paid_amount,
       b.final_amount - coalesce(sum(p.amount) filter (where p.payment_status = 'completed'), 0) as amount_due,
       b.booking_status,
       b.check_in_date,
       b.check_out_date
from bookings b
left join payments p on p.booking_id = b.id and p.deleted_at is null
where b.deleted_at is null
group by b.id;

create or replace view occupied_rooms as
select r.*
from rooms r
where r.availability_status = 'occupied'
  and r.deleted_at is null;

create or replace view available_rooms as
select r.*
from rooms r
where r.availability_status = 'available'
  and r.deleted_at is null;

create or replace view revenue_summary as
select date_trunc('month', p.created_at) as month,
       count(distinct p.booking_id) as booking_count,
       sum(p.amount) filter (where p.payment_status = 'completed') as revenue,
       count(*) filter (where p.payment_status = 'failed') as failed_payments
from payments p
where p.deleted_at is null
group by date_trunc('month', p.created_at)
order by month desc;

create or replace view booking_summary as
select b.booking_status,
       count(*) as booking_count,
       sum(b.final_amount) as total_revenue
from bookings b
where b.deleted_at is null
group by b.booking_status;

-- ====================================================================
-- Row Level Security
-- ====================================================================

alter table profiles enable row level security;
alter table properties enable row level security;
alter table rooms enable row level security;
alter table guests enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table staff enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- Profiles policies
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_select_admin on profiles for select using (public.is_admin());
create policy profiles_insert_own on profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_update_admin on profiles for update using (public.is_admin()) with check (public.is_admin());

-- Properties policies
create policy properties_select_admin on properties for select using (public.is_admin());
create policy properties_select_owner_manager on properties for select using (
  public.can_manage_property(id)
  and deleted_at is null
);
create policy properties_insert_owner on properties for insert with check (
  (public.is_admin() and owner_id is not null)
  or (public.is_owner() and owner_id = auth.uid())
);
create policy properties_update_admin_owner on properties for update using (
  public.is_admin() or (public.is_owner() and owner_id = auth.uid())
) with check (
  public.is_admin() or (public.is_owner() and owner_id = auth.uid())
);

-- Rooms policies
create policy rooms_select_admin on rooms for select using (public.is_admin() and deleted_at is null);
create policy rooms_select_property_access on rooms for select using (
  public.can_manage_property(property_id)
  and deleted_at is null
);
create policy rooms_insert_admin_owner_manager on rooms for insert with check (
  public.is_admin() or public.can_manage_property(property_id)
);
create policy rooms_update_admin_owner_manager on rooms for update using (
  public.is_admin() or public.can_manage_property(property_id)
) with check (
  public.is_admin() or public.can_manage_property(property_id)
);

-- Guests policies
create policy guests_select_admin on guests for select using (public.is_admin() and deleted_at is null);
create policy guests_select_creator on guests for select using (
  exists (
    select 1 from bookings b
    where b.guest_id = guests.id
      and b.created_by = auth.uid()
      and b.deleted_at is null
  )
  and deleted_at is null
);
create policy guests_select_property_access on guests for select using (
  exists (
    select 1 from bookings b
    join rooms r on r.id = b.room_id
    where b.guest_id = guests.id
      and b.deleted_at is null
      and public.can_manage_property(r.property_id)
  )
  and deleted_at is null
);
create policy guests_insert_authenticated on guests for insert with check (auth.role() = 'authenticated');
create policy guests_select_receptionist on guests for select using (
  exists (
    select 1 from profiles pr
    where pr.id = auth.uid()
      and pr.role in ('receptionist', 'manager')
      and pr.status = 'active'
  )
);
create policy guests_update_admin on guests for update using (public.is_admin()) with check (public.is_admin());
create policy guests_update_receptionist on guests for update using (
  exists (
    select 1 from profiles pr
    where pr.id = auth.uid()
      and pr.role in ('receptionist', 'manager')
      and pr.status = 'active'
  )
) with check (
  exists (
    select 1 from profiles pr
    where pr.id = auth.uid()
      and pr.role in ('receptionist', 'manager')
      and pr.status = 'active'
  )
);

-- Bookings policies
create policy bookings_select_admin on bookings for select using (public.is_admin() and deleted_at is null);
create policy bookings_select_owner_manager_receptionist on bookings for select using (
  public.can_access_booking(id)
);
create policy bookings_select_owner_self on bookings for select using (
  created_by = auth.uid()
  and deleted_at is null
);
create policy bookings_insert_authenticated on bookings for insert with check (
  created_by = auth.uid() and auth.role() = 'authenticated'
);
create policy bookings_update_owner_manager_receptionist on bookings for update using (
  public.is_admin() or public.can_access_booking(id)
) with check (
  public.is_admin() or public.can_access_booking(id)
);
create policy bookings_delete_admin on bookings for delete using (public.is_admin());

-- Payments policies
create policy payments_select_admin on payments for select using (public.is_admin());
create policy payments_select_booking_access on payments for select using (
  exists (
    select 1 from bookings b
    join rooms r on r.id = b.room_id
    where b.id = payments.booking_id
      and b.deleted_at is null
      and (b.created_by = auth.uid() or public.can_manage_property(r.property_id))
  )
);
create policy payments_insert_booking_owner_manager_receptionist on payments for insert with check (
  auth.role() = 'authenticated'
  and exists (
    select 1 from bookings b
    join rooms r on r.id = b.room_id
    where b.id = payments.booking_id
      and b.deleted_at is null
      and (b.created_by = auth.uid() or public.can_manage_property(r.property_id))
  )
);
create policy payments_update_admin on payments for update using (public.is_admin()) with check (public.is_admin());

-- Expenses policies
create policy expenses_select_admin on expenses for select using (public.is_admin());
create policy expenses_select_property_access on expenses for select using (
  public.can_manage_property(property_id)
  and deleted_at is null
);
create policy expenses_insert_property_access on expenses for insert with check (
  public.is_admin() or public.can_manage_property(property_id)
);
create policy expenses_update_property_access on expenses for update using (
  public.is_admin() or public.can_manage_property(property_id)
) with check (
  public.is_admin() or public.can_manage_property(property_id)
);

-- Staff policies
create policy staff_select_admin on staff for select using (public.is_admin());
create policy staff_select_property_access on staff for select using (
  public.can_manage_property(property_id)
  and deleted_at is null
);
create policy staff_insert_admin_owner on staff for insert with check (
  public.is_admin() or exists (select 1 from properties p where p.id = staff.property_id and p.owner_id = auth.uid())
);
create policy staff_update_admin_owner on staff for update using (
  public.is_admin() or exists (select 1 from properties p where p.id = staff.property_id and p.owner_id = auth.uid())
) with check (
  public.is_admin() or exists (select 1 from properties p where p.id = staff.property_id and p.owner_id = auth.uid())
);

-- Notifications policies
create policy notifications_select_owner on notifications for select using (
  (profile_id = auth.uid() or public.is_admin())
  and deleted_at is null
);
create policy notifications_insert_owner_or_admin on notifications for insert with check (
  profile_id = auth.uid() or public.is_admin()
);
create policy notifications_update_owner_or_admin on notifications for update using (
  profile_id = auth.uid() or public.is_admin()
) with check (
  profile_id = auth.uid() or public.is_admin()
);

-- Audit logs policies
create policy audit_logs_select_admin on audit_logs for select using (public.is_admin());
create policy audit_logs_insert_trigger on audit_logs for insert with check (
  auth.uid() = performed_by
  and action in ('INSERT', 'UPDATE', 'DELETE')
);

-- ====================================================================
-- Comments for views and functions
-- ====================================================================

comment on view active_bookings is 'Bookings currently reserved or checked in.';
comment on view todays_check_ins is 'Bookings starting today.';
comment on view todays_check_outs is 'Bookings ending today.';
comment on view pending_payments is 'Booking payment status including amount due.';
comment on view occupied_rooms is 'Rooms currently marked as occupied.';
comment on view available_rooms is 'Rooms currently marked as available.';
comment on view revenue_summary is 'Monthly revenue summary from completed payments.';
comment on view booking_summary is 'Booking counts and revenue aggregated by status.';

comment on function public.is_admin is 'Returns true when current authenticated user has admin role.';
comment on function public.can_manage_property is 'Returns true when current user may manage the given property.';
comment on function public.generate_booking_number is 'Generates a formatted booking number based on current date.';
comment on function public.booking_overlap_check is 'Prevents overlapping bookings for the same room.';
comment on function public.calculate_booking_final_amount is 'Calculates booking final amount from total, discount, and tax.';
comment on function public.update_room_availability_on_booking is 'Updates room availability status after booking status changes.';
comment on function public.audit_log_trigger is 'Records audit log entries for insert, update, and delete operations.';

-- ====================================================================
-- USER MANAGEMENT UPDATES (2026)
-- ====================================================================

-- 1. Alter profiles table to allow null roles (initially pending)
alter table public.profiles alter column role drop not null;

-- 2. Trigger function to handle new user registration from Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    null,
    'pending'
  );
  return new;
end;
$$;

-- 3. Recreate the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Allow delete operations for properties and rooms to enable deletion consent executions
create policy properties_delete_admin_owner on public.properties for delete using (
  public.is_admin() or (public.is_owner() and owner_id = auth.uid())
);

create policy rooms_delete_admin_owner on public.rooms for delete using (
  public.is_admin() or public.can_manage_property(property_id)
);

create policy guests_delete_admin on public.guests for delete using (
  public.is_admin()
);

create policy payments_delete_admin on public.payments for delete using (
  public.is_admin()
);