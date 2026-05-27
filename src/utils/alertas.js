import { supabase } from '@/supabase/client'

export async function alertaStock(clienteId) {
  try {
    await supabase.functions.invoke('send-alert', {
      body: { type: 'stock', payload: { cliente_id: clienteId } },
    })
  } catch (_) {
    // No critico — no interrumpe el flujo principal
  }
}

export async function alertaPedido(pedidoId, estadoAnterior, estadoNuevo) {
  try {
    await supabase.functions.invoke('send-alert', {
      body: { type: 'pedido', payload: { pedido_id: pedidoId, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo } },
    })
  } catch (_) {
    // No critico — no interrumpe el flujo principal
  }
}
