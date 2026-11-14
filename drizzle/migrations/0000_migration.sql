-- Roles
create type public.app_role as enum ('organizer');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
for each row execute function public.handle_user_email_change();

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.activate_organizer()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'organizer')
  on conflict (user_id, role) do nothing;
end;
$$;
revoke execute on function public.activate_organizer() from public, anon;
grant execute on function public.activate_organizer() to authenticated;

create or replace function public.find_user_id_by_email(_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
  where public.has_role(auth.uid(), 'organizer')
    and lower(p.email) = lower(trim(_email))
  limit 1
$$;
revoke execute on function public.find_user_id_by_email(text) from public, anon;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Venues
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid,
  name text not null,
  street text not null,
  neighborhood text not null,
  city text not null,
  latitude double precision not null,
  longitude double precision not null,
  about text,
  tagline text,
  slogan text,
  since_year int,
  created_at timestamptz not null default now()
);
grant select on public.venues to anon;
grant select, insert, update, delete on public.venues to authenticated;
grant all on public.venues to service_role;
alter table public.venues enable row level security;
create policy "Venues are public" on public.venues for select to anon, authenticated using (true);
create policy "Organizers create venues" on public.venues for insert to authenticated
  with check (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'));
create policy "Owners update venues" on public.venues for update to authenticated
  using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy "Owners delete venues" on public.venues for delete to authenticated using (organizer_id = auth.uid());

-- Artists
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid,
  user_id uuid,
  name text not null,
  art_type text not null,
  subgenre text not null,
  about text,
  tagline text,
  created_at timestamptz not null default now()
);
grant select on public.artists to anon;
grant select, insert, update, delete on public.artists to authenticated;
grant all on public.artists to service_role;
alter table public.artists enable row level security;
create policy "Artists are public" on public.artists for select to anon, authenticated using (true);
create policy "Organizers create artists" on public.artists for insert to authenticated
  with check (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'));
create policy "Owners update artists" on public.artists for update to authenticated
  using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy "Owners delete artists" on public.artists for delete to authenticated using (organizer_id = auth.uid());

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid,
  venue_id uuid not null references public.venues(id) on delete restrict,
  name text not null,
  headline text,
  starts_at timestamptz not null,
  ticket_url text,
  price numeric(10,2),
  description text,
  status text not null default 'published' check (status in ('published', 'cancelled')),
  created_at timestamptz not null default now()
);
create index events_venue_idx on public.events(venue_id);
create index events_starts_idx on public.events(starts_at);
grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "Published events are public" on public.events for select to anon, authenticated
  using (status = 'published' or organizer_id = auth.uid());
create policy "Organizers create events" on public.events for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and public.has_role(auth.uid(), 'organizer')
    and exists (select 1 from public.venues v where v.id = venue_id and v.organizer_id = auth.uid())
  );
create policy "Owners update events" on public.events for update to authenticated
  using (organizer_id = auth.uid())
  with check (
    organizer_id = auth.uid()
    and exists (select 1 from public.venues v where v.id = venue_id and v.organizer_id = auth.uid())
  );
create policy "Owners delete events" on public.events for delete to authenticated using (organizer_id = auth.uid());

-- Event artists
create table public.event_artists (
  event_id uuid not null references public.events(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  primary key (event_id, artist_id)
);
create index event_artists_artist_idx on public.event_artists(artist_id);
grant select on public.event_artists to anon;
grant select, insert, delete on public.event_artists to authenticated;
grant all on public.event_artists to service_role;
alter table public.event_artists enable row level security;
create policy "Event artists are public" on public.event_artists for select to anon, authenticated using (true);
create policy "Owners link artists" on public.event_artists for insert to authenticated
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
    and exists (select 1 from public.artists a where a.id = artist_id and a.organizer_id = auth.uid())
  );
create policy "Owners unlink artists" on public.event_artists for delete to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));

-- Follows and attendances
create table public.artist_follows (
  user_id uuid not null,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
grant select, insert, delete on public.artist_follows to authenticated;
grant all on public.artist_follows to service_role;
alter table public.artist_follows enable row level security;
create policy "Own artist follows read" on public.artist_follows for select to authenticated using (auth.uid() = user_id);
create policy "Own artist follows insert" on public.artist_follows for insert to authenticated with check (auth.uid() = user_id);
create policy "Own artist follows delete" on public.artist_follows for delete to authenticated using (auth.uid() = user_id);

create table public.venue_follows (
  user_id uuid not null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
grant select, insert, delete on public.venue_follows to authenticated;
grant all on public.venue_follows to service_role;
alter table public.venue_follows enable row level security;
create policy "Own venue follows read" on public.venue_follows for select to authenticated using (auth.uid() = user_id);
create policy "Own venue follows insert" on public.venue_follows for insert to authenticated with check (auth.uid() = user_id);
create policy "Own venue follows delete" on public.venue_follows for delete to authenticated using (auth.uid() = user_id);

create table public.attendances (
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
grant select, insert, delete on public.attendances to authenticated;
grant all on public.attendances to service_role;
alter table public.attendances enable row level security;
create policy "Own attendances read" on public.attendances for select to authenticated using (auth.uid() = user_id);
create policy "Own attendances insert" on public.attendances for insert to authenticated with check (auth.uid() = user_id);
create policy "Own attendances delete" on public.attendances for delete to authenticated using (auth.uid() = user_id);

-- Demo content
insert into public.venues (id, name, street, neighborhood, city, latitude, longitude, about, tagline, slogan, since_year) values
('11111111-1111-4111-8111-000000000001', 'Bar do Zé', 'Rua das Flores, 120', 'Centro', 'São Paulo / SP', -23.5458, -46.6362,
 'Um espaço para descobrir artistas de perto. O Bar do Zé reúne música ao vivo e cultura local em uma programação que vai do jazz ao samba, sempre com lugar para novas histórias.',
 'Boa música, mesa cheia e encontros no Centro.', 'Cultura à mesa.', 1998),
('11111111-1111-4111-8111-000000000002', 'Casa Aurora', 'Rua do Sol, 48', 'Vila Nova', 'São Paulo / SP', -23.5570, -46.6520,
 'Casarão de portas abertas para a música instrumental, saraus e encontros de domingo à tarde.',
 'Música instrumental e tardes de domingo na Vila Nova.', 'Portas abertas.', 2012),
('11111111-1111-4111-8111-000000000003', 'Galeria Estação', 'Praça da Estação, 10', 'Centro', 'São Paulo / SP', -23.5395, -46.6340,
 'Galeria independente dedicada às artes visuais da cidade, com exposições de coletivos e artistas locais.',
 'Artes visuais no coração do Centro.', 'Arte de passagem.', 2005);

insert into public.artists (id, name, art_type, subgenre, about, tagline) values
('22222222-2222-4222-8222-000000000001', 'Lia Costa', 'Música', 'Jazz',
 'Pianista e compositora, Lia transforma referências brasileiras em encontros cheios de improviso. Dos pequenos bares aos palcos da cidade, cada apresentação conta uma nova história.',
 'Jazz brasileiro que encontra novos caminhos.'),
('22222222-2222-4222-8222-000000000002', 'Roda do Centro', 'Música', 'Samba',
 'Roda de samba que nasceu nos quintais do Centro e leva a cultura popular para bares, praças e festas da cidade.',
 'Samba e cultura popular.'),
('22222222-2222-4222-8222-000000000003', 'Coletivo Vértice', 'Artes visuais', 'Arte urbana',
 'Coletivo de artistas visuais que investiga a cidade, suas ruas e seus encontros por meio de pintura, colagem e fotografia.',
 'Artes visuais que ocupam a cidade.');

insert into public.events (id, venue_id, name, headline, starts_at, ticket_url, price, description) values
('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000001', 'Noite de jazz no Zé',
 'Uma noite de jazz, um encontro com a cidade.', '2026-11-21 20:00:00-03', 'https://ingressos.exemplo.com/jazz-no-ze', 30.00,
 'O Bar do Zé recebe Lia Costa e seu trio para uma noite de jazz brasileiro, improviso e boas conversas. Chegue cedo e encontre seu lugar.'),
('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-000000000001', 'Samba de quintal',
 'Samba de roda, quintal cheio e a cidade cantando junto.', '2026-11-28 16:00:00-03', null, null,
 'A Roda do Centro transforma o Bar do Zé em quintal para uma tarde de samba, cultura popular e muita gente cantando junto.'),
('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-000000000002', 'Domingo instrumental',
 'Uma tarde de domingo feita de improviso.', '2026-11-29 17:00:00-03', null, null,
 'Lia Costa apresenta composições autorais em formato intimista na Casa Aurora.'),
('33333333-3333-4333-8333-000000000004', '11111111-1111-4111-8111-000000000003', 'Exposição Entre Ruas',
 'A cidade vista de perto, entre muros e encontros.', '2026-12-05 14:00:00-03', null, null,
 'O Coletivo Vértice apresenta pinturas, colagens e fotografias que nasceram das ruas do Centro.');

insert into public.event_artists (event_id, artist_id) values
('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001'),
('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000002'),
('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000001'),
('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000003');