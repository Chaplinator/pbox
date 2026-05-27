-- ============================================================
-- P-Box — Esquema inicial de base de datos
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

create type rol_usuario as enum ('cliente', 'operador');

create type estado_pedido_enum as enum (
  'recibido',
  'en_proceso',
  'despachado',
  'entregado',
  'cancelado'
);

-- ============================================================
-- TABLA: usuarios
-- Extiende auth.users de Supabase con datos del perfil
-- ============================================================

create table public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null unique,
  rol         rol_usuario not null default 'cliente',
  telefono    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.usuarios is 'Perfiles de usuario vinculados a auth.users';

-- ============================================================
-- TABLA: clientes
-- Empresa / negocio del emprendedor que usa P-Box
-- ============================================================

create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  nombre_negocio  text not null,
  ruc             text,
  direccion       text,
  ciudad          text not null default 'Guayaquil',
  provincia       text not null default 'Guayas',
  pais            text not null default 'Ecuador',
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(usuario_id)
);

comment on table public.clientes is 'Datos del negocio del cliente emprendedor';

-- ============================================================
-- TABLA: productos
-- Catálogo de productos por cliente
-- ============================================================

create table public.productos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  sku          text not null,
  nombre       text not null,
  descripcion  text,
  peso_kg      numeric(8,3),
  alto_cm      numeric(8,2),
  ancho_cm     numeric(8,2),
  largo_cm     numeric(8,2),
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(cliente_id, sku)
);

comment on table public.productos is 'Catálogo de productos registrados por cada cliente';

-- ============================================================
-- TABLA: inventario
-- Stock actual por producto en bodega P-Box
-- ============================================================

create table public.inventario (
  id                  uuid primary key default gen_random_uuid(),
  producto_id         uuid not null references public.productos(id) on delete cascade,
  cantidad            integer not null default 0 check (cantidad >= 0),
  stock_minimo        integer not null default 5,
  ubicacion_bodega    text,
  ultima_actualizacion timestamptz not null default now(),
  unique(producto_id)
);

comment on table public.inventario is 'Stock actual en bodega P-Box por producto';

-- ============================================================
-- TABLA: pedidos
-- Órdenes de despacho creadas por los clientes
-- ============================================================

create table public.pedidos (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id),
  numero_pedido       text not null unique,
  estado              estado_pedido_enum not null default 'recibido',

  -- Destinatario
  destinatario_nombre  text not null,
  destinatario_telefono text,
  direccion_entrega    text not null,
  ciudad_entrega       text not null,
  provincia_entrega    text not null default 'Guayas',

  -- Courrier (para integración futura)
  courrier            text,
  numero_guia         text,

  -- Totales calculados
  peso_total_kg       numeric(10,3),
  costo_envio         numeric(10,2),

  -- Metadata
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.pedidos is 'Pedidos de despacho. número_pedido puede ser el de Shopify/WooCommerce';

-- ============================================================
-- TABLA: items_pedido
-- Líneas de productos dentro de un pedido
-- ============================================================

create table public.items_pedido (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  cantidad    integer not null check (cantidad > 0),
  created_at  timestamptz not null default now()
);

comment on table public.items_pedido is 'Productos incluidos en cada pedido';

-- ============================================================
-- TABLA: historial_estados
-- Auditoría de cambios de estado de pedidos
-- ============================================================

create table public.historial_estados (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references public.pedidos(id) on delete cascade,
  estado_anterior estado_pedido_enum,
  estado_nuevo  estado_pedido_enum not null,
  operador_id   uuid references public.usuarios(id),
  nota          text,
  created_at    timestamptz not null default now()
);

comment on table public.historial_estados is 'Log de cambios de estado para tracking visible al cliente';

-- ============================================================
-- ÍNDICES
-- ============================================================

create index idx_productos_cliente    on public.productos(cliente_id);
create index idx_inventario_producto  on public.inventario(producto_id);
create index idx_pedidos_cliente      on public.pedidos(cliente_id);
create index idx_pedidos_estado       on public.pedidos(estado);
create index idx_pedidos_numero       on public.pedidos(numero_pedido);
create index idx_items_pedido_pedido  on public.items_pedido(pedido_id);
create index idx_historial_pedido     on public.historial_estados(pedido_id);

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_usuarios_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

create trigger trg_pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ============================================================
-- FUNCIÓN: registrar cambio de estado automáticamente
-- ============================================================

create or replace function public.log_cambio_estado()
returns trigger language plpgsql security definer as $$
begin
  if old.estado is distinct from new.estado then
    insert into public.historial_estados (pedido_id, estado_anterior, estado_nuevo)
    values (new.id, old.estado, new.estado);
  end if;
  return new;
end;
$$;

create trigger trg_pedidos_log_estado
  after update on public.pedidos
  for each row execute function public.log_cambio_estado();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.usuarios         enable row level security;
alter table public.clientes         enable row level security;
alter table public.productos        enable row level security;
alter table public.inventario       enable row level security;
alter table public.pedidos          enable row level security;
alter table public.items_pedido     enable row level security;
alter table public.historial_estados enable row level security;

-- Helper: obtener rol del usuario autenticado
create or replace function public.get_my_rol()
returns rol_usuario language sql security definer stable as $$
  select rol from public.usuarios where id = auth.uid();
$$;

-- usuarios: cada uno ve y edita su propio perfil; operadores ven todos
create policy "usuarios: ver propio perfil"
  on public.usuarios for select
  using (id = auth.uid() or public.get_my_rol() = 'operador');

create policy "usuarios: editar propio perfil"
  on public.usuarios for update
  using (id = auth.uid());

-- clientes: el dueño o cualquier operador
create policy "clientes: acceso propio o operador"
  on public.clientes for all
  using (usuario_id = auth.uid() or public.get_my_rol() = 'operador');

-- productos: del propio cliente o cualquier operador
create policy "productos: acceso propio o operador"
  on public.productos for all
  using (
    cliente_id in (select id from public.clientes where usuario_id = auth.uid())
    or public.get_my_rol() = 'operador'
  );

-- inventario: igual que productos
create policy "inventario: acceso propio o operador"
  on public.inventario for all
  using (
    producto_id in (
      select p.id from public.productos p
      join public.clientes c on c.id = p.cliente_id
      where c.usuario_id = auth.uid()
    )
    or public.get_my_rol() = 'operador'
  );

-- pedidos: del propio cliente o cualquier operador
create policy "pedidos: acceso propio o operador"
  on public.pedidos for all
  using (
    cliente_id in (select id from public.clientes where usuario_id = auth.uid())
    or public.get_my_rol() = 'operador'
  );

-- items_pedido: heredado por pedido
create policy "items_pedido: acceso propio o operador"
  on public.items_pedido for all
  using (
    pedido_id in (
      select ped.id from public.pedidos ped
      join public.clientes c on c.id = ped.cliente_id
      where c.usuario_id = auth.uid()
    )
    or public.get_my_rol() = 'operador'
  );

-- historial_estados: lectura para el dueño del pedido; escritura solo operador (via trigger)
create policy "historial: lectura propia o operador"
  on public.historial_estados for select
  using (
    pedido_id in (
      select ped.id from public.pedidos ped
      join public.clientes c on c.id = ped.cliente_id
      where c.usuario_id = auth.uid()
    )
    or public.get_my_rol() = 'operador'
  );

-- ============================================================
-- FUNCIÓN: crear perfil en usuarios al registrarse
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.usuarios (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'cliente')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
