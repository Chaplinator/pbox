import { supabase } from '@/supabase/client'

async function invoke(body) {
  try {
    await supabase.functions.invoke('send-alert', { body })
  } catch (_) {
    // No critico — no interrumpe el flujo principal
  }
}

export function alertaStock(clienteId) {
  return invoke({ type: 'stock', payload: { cliente_id: clienteId } })
}

export function alertaPedido(pedidoId, estadoAnterior, estadoNuevo) {
  return invoke({ type: 'pedido', payload: { pedido_id: pedidoId, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo } })
}

export function alertaM2(clienteId) {
  return invoke({ type: 'm2', payload: { cliente_id: clienteId } })
}
