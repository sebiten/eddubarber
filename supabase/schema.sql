-- Eddu Barber: ejecutar una vez en SQL Editor de un proyecto Supabase.
-- Tablas aisladas con prefijo barber_. No modifica tablas existentes.
begin;

create table public.barber_settings (
 id integer primary key check (id=1),
 name text not null default 'EDDU BARBER', address text not null default 'Tu barbería de confianza',
 phone text not null default '', start text not null default '09:00', "end" text not null default '20:00',
 days integer[] not null default array[1,2,3,4,5,6],
 check(start ~ '^([01][0-9]|2[0-3]):[03]0$' and "end" ~ '^([01][0-9]|2[0-3]):[03]0$' and start<"end"),
 check(days <@ array[0,1,2,3,4,5,6])
);
create table public.barber_services (
 id text primary key, name text not null check(length(name) between 2 and 60),
 description text not null default '' check(length(description)<=120),
 duration integer not null check(duration in(30,60,90,120)),
 price integer not null check(price between 0 and 1000000), active boolean not null default true
);
create table public.barber_blocks (
 date date primary key, reason text not null check(length(reason) between 3 and 200)
);
create table public.barber_bookings (
 id uuid primary key default gen_random_uuid(), token uuid unique not null default gen_random_uuid(),
 date date not null, time time not null, duration integer not null check(duration in(30,60,90,120)),
 service_id text not null references public.barber_services(id), service_name text not null,
 price integer not null check(price>=0), name text not null check(length(name) between 2 and 80),
 phone text not null check(length(phone) between 8 and 22),
 status text not null default 'confirmed' check(status in('confirmed','completed','cancelled','no_show')),
 created_at timestamptz not null default now(),
 reserved_range tsrange generated always as (tsrange(date+time,date+time+make_interval(mins=>duration),'[)')) stored,
 constraint barber_no_overlap exclude using gist (reserved_range with &&) where (status<>'cancelled')
);
create index barber_bookings_date_idx on public.barber_bookings(date);
create index barber_bookings_phone_idx on public.barber_bookings(phone) where status='confirmed';

alter table public.barber_settings enable row level security;
alter table public.barber_services enable row level security;
alter table public.barber_blocks enable row level security;
alter table public.barber_bookings enable row level security;
-- Denegación por defecto: toda lectura/escritura pasa por Next.js.
revoke all on public.barber_settings,public.barber_services,public.barber_blocks,public.barber_bookings from anon,authenticated;
grant all on public.barber_settings,public.barber_services,public.barber_blocks,public.barber_bookings to service_role;

insert into public.barber_settings(id) values(1);
insert into public.barber_services(id,name,description,duration,price) values
 ('corte','Corte de pelo','Un buen corte. Tu propio estilo.',30,12000),
 ('barba','Perfilado de barba','Líneas prolijas, terminación impecable.',30,8000),
 ('combo','Corte + barba','El servicio completo para renovar tu look.',60,18000);

create function public.barber_book(p_date date,p_time time,p_service text,p_name text,p_phone text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.barber_services; cfg public.barber_settings; b public.barber_bookings;
 local_now timestamp := now() at time zone 'America/Argentina/Buenos_Aires'; normalized_phone text;
begin
 normalized_phone:=regexp_replace(p_phone,'[^0-9]','','g');
 if length(trim(p_name)) not between 2 and 80 or length(p_phone)>22 or length(normalized_phone) not between 8 and 15 then raise exception 'Revisá tu nombre y número de WhatsApp.'; end if;
 if p_date < local_now::date or p_date > local_now::date+60 or p_date+p_time<=local_now then raise exception 'Elegí un horario futuro dentro de los próximos 60 días.'; end if;
 if extract(minute from p_time)::int % 30<>0 or extract(second from p_time)<>0 then raise exception 'Horario inválido.'; end if;
 -- Todas las reservas y bloqueos del día comparten la misma cerradura transaccional.
 perform pg_advisory_xact_lock(7412,(p_date-date '2000-01-01')::integer);
 -- Serializa el límite por teléfono incluso si se reserva en diferentes días.
 perform pg_advisory_xact_lock(7413,hashtext(normalized_phone));
 select * into s from public.barber_services where id=p_service and active for share;
 if not found then raise exception 'Este servicio ya no está disponible.'; end if;
 select * into cfg from public.barber_settings where id=1 for share;
 if exists(select 1 from public.barber_blocks where date=p_date) then raise exception 'Este día no atendemos. Elegí otra fecha.'; end if;
 if not (extract(dow from p_date)::integer=any(cfg.days)) or p_time<cfg.start::time or p_date+p_time+make_interval(mins=>s.duration)>p_date+cfg."end"::time then raise exception 'El horario está fuera del horario de atención.'; end if;
 if (select count(*) from public.barber_bookings where phone=normalized_phone and status='confirmed' and date+time>local_now)>=3 then raise exception 'Ya tenés tres turnos pendientes. Contactá a la barbería para reservar más.'; end if;
 insert into public.barber_bookings(date,time,duration,service_id,service_name,price,name,phone)
 values(p_date,p_time,s.duration,s.id,s.name,s.price,trim(p_name),normalized_phone) returning * into b;
 return jsonb_build_object('id',b.id,'token',b.token,'date',b.date,'time',to_char(b.time,'HH24:MI'),'duration',b.duration,'service_id',b.service_id,'service_name',b.service_name,'price',b.price,'name',b.name,'phone',b.phone,'status',b.status);
 exception when exclusion_violation then raise exception 'Ese horario acaba de reservarse. Elegí otro.';
end;
$$;

create function public.barber_block(p_date date,p_reason text,p_cancel boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_date<(now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'No se pueden bloquear fechas pasadas.'; end if;
 perform pg_advisory_xact_lock(7412,(p_date-date '2000-01-01')::integer);
 insert into public.barber_blocks(date,reason) values(p_date,trim(p_reason)) on conflict(date) do update set reason=excluded.reason;
 if p_cancel then update public.barber_bookings set status='cancelled' where date=p_date and status='confirmed'; end if;
end;
$$;

create function public.barber_status(p_id uuid,p_status text)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.barber_bookings;
begin
 select * into b from public.barber_bookings where id=p_id;
 if not found then raise exception 'El turno ya no existe.'; end if;
 perform pg_advisory_xact_lock(7412,(b.date-date '2000-01-01')::integer);
 -- Releer luego del lock para no usar un estado anterior a una cancelación.
 select * into b from public.barber_bookings where id=p_id for update;
 if p_status not in('confirmed','completed','cancelled','no_show') then raise exception 'Estado inválido.'; end if;
 if b.status='cancelled' and p_status<>'cancelled' then
  if exists(select 1 from public.barber_blocks where date=b.date) then raise exception 'Habilitá el día antes de restaurar el turno.'; end if;
  if b.date+b.time<=now() at time zone 'America/Argentina/Buenos_Aires' then raise exception 'No se puede restaurar un turno pasado.'; end if;
 end if;
 update public.barber_bookings set status=p_status where id=p_id;
 exception when exclusion_violation then raise exception 'No se puede restaurar: el horario ya está ocupado.';
end;
$$;

create function public.barber_cancel(p_id uuid,p_token uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.barber_bookings;
begin
 select * into b from public.barber_bookings where id=p_id and token=p_token;
 if not found then raise exception 'El enlace del turno no es válido.'; end if;
 perform pg_advisory_xact_lock(7412,(b.date-date '2000-01-01')::integer);
 select * into b from public.barber_bookings where id=p_id and token=p_token for update;
 if b.status='cancelled' then return; end if;
 if b.status<>'confirmed' or b.date+b.time <= now() at time zone 'America/Argentina/Buenos_Aires' then raise exception 'Este turno ya no se puede cancelar. Contactá a la barbería.'; end if;
 update public.barber_bookings set status='cancelled' where id=p_id;
end;
$$;

revoke all on function public.barber_book(date,time,text,text,text),public.barber_block(date,text,boolean),public.barber_status(uuid,text),public.barber_cancel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.barber_book(date,time,text,text,text),public.barber_block(date,text,boolean),public.barber_status(uuid,text),public.barber_cancel(uuid,uuid) to service_role;
commit;
