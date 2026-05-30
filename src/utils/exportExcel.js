import * as XLSX from 'xlsx'

function descargar(wb, nombre) {
  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${nombre}_${fecha}.xlsx`)
}

// Exporta un arreglo de objetos ya etiquetados (clave = encabezado de columna).
export function exportarResumen(filas, nombreArchivo = 'resumen', hoja = 'Resumen') {
  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  descargar(wb, nombreArchivo)
}

// Exporta un libro con múltiples hojas. `sheets` = { 'NombreHoja': [filas...] }
export function exportarLibro(sheets, nombreArchivo = 'respaldo') {
  const wb = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(filas && filas.length ? filas : [{ '(sin datos)': '' }])
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31))
  }
  descargar(wb, nombreArchivo)
}

export function exportarInventario(productos, rotacion = {}) {
  const filas = productos.map(p => ({
    'SKU':            p.sku,
    'Nombre':         p.nombre,
    'Categoría':      p.categoria ?? '',
    'Descripción':    p.descripcion ?? '',
    'Stock':          p.cantidad,
    'Stock mínimo':   p.stock_minimo,
    'Bajo mínimo':    p.stock_bajo ? 'Sí' : 'No',
    'Peso (kg)':      p.peso_kg ?? '',
    'Largo (cm)':     p.largo_cm ?? '',
    'Ancho (cm)':     p.ancho_cm ?? '',
    'Alto (cm)':      p.alto_cm ?? '',
    'm² por unidad':  p.m2_por_unidad,
    'm² total':       p.m2_total,
    'm³ por unidad':  p.m3_por_unidad,
    'm³ total':       p.m3_total,
    'Rot. 30d (u)':   rotacion[p.producto_id]?.unidades_30d ?? 0,
    'Rot. 30d (ped)': rotacion[p.producto_id]?.pedidos_30d  ?? 0,
    'Última actualización': p.ultima_actualizacion
      ? new Date(p.ultima_actualizacion).toLocaleDateString('es-EC')
      : '',
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  descargar(wb, 'inventario')
}

export function exportarPedidos(pedidos) {
  const filas = pedidos.flatMap(p => {
    const base = {
      'N° Pedido':      p.numero_pedido,
      'Fecha':          new Date(p.created_at).toLocaleDateString('es-EC'),
      'Estado':         p.estado,
      'Cliente':        p.cliente_nombre ?? '',
      'Destinatario':   [p.destinatario_nombre, p.destinatario_apellido].filter(Boolean).join(' '),
      'Cédula':         p.destinatario_cedula ?? '',
      'Teléfono':       p.destinatario_telefono ?? '',
      'Ciudad':         p.ciudad_entrega ?? '',
      'Provincia':      p.provincia_entrega ?? '',
      'Dirección':      p.direccion_entrega ?? '',
      'Referencias':    p.referencias_entrega ?? '',
      'Courrier':       p.courrier ?? '',
      'N° Guía':        p.numero_guia ?? '',
    }
    if (!p.items_pedido?.length) return [{ ...base, 'SKU': '', 'Producto': '', 'Cantidad': '' }]
    return p.items_pedido.map(it => ({
      ...base,
      'SKU':      it.productos?.sku  ?? '',
      'Producto': it.productos?.nombre ?? '',
      'Cantidad': it.cantidad,
    }))
  })

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')
  descargar(wb, 'pedidos')
}

export function exportarUsuarios(usuarios) {
  const filas = usuarios.map(u => ({
    'Nombre':    u.nombre,
    'Email':     u.email,
    'Rol':       u.rol,
    'Negocio':   u.clientes?.nombre_negocio ?? '',
    'Estado':    u.activo ? 'Activo' : 'Inactivo',
    'Registro':  new Date(u.created_at).toLocaleDateString('es-EC'),
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
  descargar(wb, 'usuarios')
}

export function exportarMovimientos(movimientos) {
  const filas = movimientos.map(m => ({
    'Fecha':      new Date(m.created_at).toLocaleDateString('es-EC'),
    'Hora':       new Date(m.created_at).toLocaleTimeString('es-EC'),
    'SKU':        m.productos?.sku  ?? '',
    'Producto':   m.productos?.nombre ?? '',
    'Categoría':  m.productos?.categoria ?? '',
    'Tipo':       m.tipo,
    'Cantidad':   m.cantidad,
    'Referencia': m.referencia ?? '',
    'Notas':      m.notas ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
  descargar(wb, 'movimientos_inventario')
}
