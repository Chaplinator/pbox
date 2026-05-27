-- ============================================================
-- P-Box — Extensión módulo Inventario
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TIPO: movimiento de stock
-- ============================================================

create type public.tipo_movimiento as enum ('entrada', 'salida', 'ajuste');

-- ============================================================
-- TABLA: movimientos_inventario
-- Historial de entradas/salidas/ajustes de stock
-- ============================================================

create table public.movimientos_inventario (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id) on delete cascade,
  tipo          public.tipo_movimiento not null,
  cantidad      integer not null check (cantidad > 0),
  referencia    text,
  notas         text,
  operador_id   uuid references public.usuarios(id),
  created_at    timestamptz not null default now()
);

create index idx_mov_producto on public.movimientos_inventario(producto_id);
create index idx_mov_created  on public.movimientos_inventario(created_at desc);

alter table public.movimientos_inventario enable row level security;

create policy "movimientos: acceso propio o operador"
  on public.movimientos_inventario for all
  using (
    producto_id in (
      select p.id from public.productos p
      join public.clientes c on c.id = p.cliente_id
      where c.usuario_id = auth.uid()
    )
    or public.get_my_rol() = 'operador'
  );

-- ============================================================
-- TRIGGER: aplicar movimiento al stock
-- ============================================================

create or replace function public.aplicar_movimiento()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.tipo = 'entrada' then
    update inventario
    set cantidad = cantidad + new.cantidad,
        ultima_actualizacion = now()
    where producto_id = new.producto_id;
  else
    update inventario
    set cantidad = greatest(cantidad - new.cantidad, 0),
        ultima_actualizacion = now()
    where producto_id = new.producto_id;
  end if;
  return new;
end;
$$;

create trigger trg_aplicar_movimiento
  after insert on public.movimientos_inventario
  for each row execute function public.aplicar_movimiento();

-- ============================================================
-- VISTA: vista_inventario
-- Productos + stock + cálculos de m² y m³
-- ============================================================

create or replace view public.vista_inventario as
select
  p.id              as producto_id,
  p.cliente_id,
  p.sku,
  p.nombre,
  p.descripcion,
  p.peso_kg,
  p.alto_cm,
  p.ancho_cm,
  p.largo_cm,
  i.id              as inventario_id,
  i.cantidad,
  i.stock_minimo,
  i.ubicacion_bodega,
  i.ultima_actualizacion,
  -- m² pisada por unidad y total
  round((coalesce(p.largo_cm,0)/100.0 * coalesce(p.ancho_cm,0)/100.0)::numeric, 3)
    as m2_por_unidad,
  round((coalesce(p.largo_cm,0)/100.0 * coalesce(p.ancho_cm,0)/100.0
         * greatest(i.cantidad,0))::numeric, 3)
    as m2_total,
  -- m³ volumen por unidad y total
  round((coalesce(p.largo_cm,0)/100.0 * coalesce(p.ancho_cm,0)/100.0
         * coalesce(p.alto_cm,0)/100.0)::numeric, 4)
    as m3_por_unidad,
  round((coalesce(p.largo_cm,0)/100.0 * coalesce(p.ancho_cm,0)/100.0
         * coalesce(p.alto_cm,0)/100.0 * greatest(i.cantidad,0))::numeric, 4)
    as m3_total,
  (i.cantidad <= i.stock_minimo) as stock_bajo,
  p.activo
from public.productos p
join public.inventario i on i.producto_id = p.id;

grant select on public.vista_inventario to authenticated;

-- ============================================================
-- VISTA: vista_rotacion_30d
-- Unidades despachadas por producto en los últimos 30 días
-- ============================================================

create or replace view public.vista_rotacion_30d as
select
  ip.producto_id,
  sum(ip.cantidad)::integer             as unidades_30d,
  count(distinct ip.pedido_id)::integer as pedidos_30d
from public.items_pedido ip
join public.pedidos ped on ped.id = ip.pedido_id
where ped.estado in ('despachado', 'entregado')
  and ped.updated_at >= now() - interval '30 days'
group by ip.producto_id;

grant select on public.vista_rotacion_30d to authenticated;

-- ============================================================
-- FUNCIÓN RPC: crear_producto_con_inventario
-- Crea producto + registro de inventario en una transacción
-- ============================================================

create or replace function public.crear_producto_con_inventario(
  p_cliente_id    uuid,
  p_sku           text,
  p_nombre        text,
  p_descripcion   text    default null,
  p_peso_kg       numeric default null,
  p_largo_cm      numeric default null,
  p_ancho_cm      numeric default null,
  p_alto_cm       numeric default null,
  p_stock_inicial integer default 0,
  p_stock_minimo  integer default 5,
  p_ubicacion     text    default null
)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  v_producto_id uuid;
begin
  -- el cliente debe pertenecer al usuario autenticado
  if not exists (
    select 1 from clientes
    where id = p_cliente_id and usuario_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;

  insert into productos (cliente_id, sku, nombre, descripcion, peso_kg, largo_cm, ancho_cm, alto_cm)
  values (p_cliente_id, p_sku, p_nombre, p_descripcion, p_peso_kg, p_largo_cm, p_ancho_cm, p_alto_cm)
  returning id into v_producto_id;

  insert into inventario (producto_id, cantidad, stock_minimo, ubicacion_bodega)
  values (v_producto_id, p_stock_inicial, p_stock_minimo, p_ubicacion);

  return v_producto_id;
end;
$$;

grant execute on function public.crear_producto_con_inventario(
  uuid, text, text, text, numeric, numeric, numeric, numeric, integer, integer, text
) to authenticated;

-- ============================================================
-- PEDIDOS: columna para factura del cliente
-- ============================================================

alter table public.pedidos
  add column if not exists factura_url text;

-- ============================================================
-- PEDIDOS: columna para código de tracking Servientrega
-- (numero_guia ya existe — este campo guarda la URL directa)
-- ============================================================

alter table public.pedidos
  add column if not exists tracking_url text;
