export function imprimirRemision(pedido) {
  const items = pedido.items_pedido ?? []
  const nombreDest = [pedido.destinatario_nombre, pedido.destinatario_apellido].filter(Boolean).join(' ')
  const direccion  = [pedido.direccion_entrega, pedido.numero_casa].filter(Boolean).join(', ')
  const ciudad     = [pedido.ciudad_entrega, pedido.provincia_entrega].filter(Boolean).join(', ')
  const fecha      = new Date(pedido.created_at).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const hoy = new Date().toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const filas = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${it.productos?.nombre ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:12px;color:#6b7280;">${it.productos?.sku ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;font-size:13px;color:#111827;">${it.cantidad}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Remisión ${pedido.numero_pedido}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111827; background:#fff; padding:40px; }
    @media print {
      body { padding:20px; }
      .no-print { display:none !important; }
    }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1d4ed8; padding-bottom:20px; margin-bottom:24px; }
    .logo { font-size:26px; font-weight:800; color:#1d4ed8; }
    .doc-info { text-align:right; }
    .doc-number { font-size:18px; font-weight:700; color:#111827; }
    .doc-date { font-size:12px; color:#6b7280; margin-top:4px; }
    .section { margin-bottom:20px; }
    .section-title { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:#9ca3af; margin-bottom:8px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .info-box { background:#f8fafc; border-radius:8px; padding:14px; }
    .info-label { font-size:10px; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
    .info-value { font-size:13px; color:#111827; font-weight:500; line-height:1.4; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#f8fafc; }
    th { padding:8px 12px; text-align:left; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; }
    th:last-child { text-align:right; }
    .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600;
             background:#dbeafe; color:#1d4ed8; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
    .footer-text { font-size:11px; color:#9ca3af; }
    .sign-box { border:1px solid #d1d5db; border-radius:8px; padding:10px 40px; text-align:center; }
    .sign-label { font-size:10px; color:#9ca3af; margin-top:6px; }
    .btn { display:inline-block; margin-bottom:20px; padding:8px 16px; background:#1d4ed8; color:#fff; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; border:none; }
  </style>
</head>
<body>
  <button class="no-print btn" onclick="window.print()">Imprimir / Guardar PDF</button>

  <div class="header">
    <div>
      <div class="logo">P-Box</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Guía de remisión</div>
    </div>
    <div class="doc-info">
      <div class="doc-number">${pedido.numero_pedido}</div>
      <div class="doc-date">Emitida: ${hoy}</div>
      <div style="margin-top:6px;"><span class="badge">${pedido.estado ?? ''}</span></div>
    </div>
  </div>

  <div class="info-grid" style="margin-bottom:20px;">
    <div class="info-box">
      <div class="info-label">Cliente</div>
      <div class="info-value">${pedido.cliente_nombre ?? '—'}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Pedido creado: ${fecha}</div>
    </div>
    <div class="info-box">
      ${pedido.courrier ? `
      <div class="info-label">Courier</div>
      <div class="info-value">${pedido.courrier}</div>
      ${pedido.numero_guia ? `<div style="font-size:12px;color:#6b7280;font-family:monospace;margin-top:4px;">Guía: ${pedido.numero_guia}</div>` : ''}
      ` : `<div class="info-label">Courier</div><div class="info-value" style="color:#d1d5db;">Sin asignar</div>`}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Destinatario</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Nombre</div>
        <div class="info-value">${nombreDest || '—'}</div>
        ${pedido.destinatario_cedula ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">C.I.: ${pedido.destinatario_cedula}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-label">Contacto</div>
        <div class="info-value">${pedido.destinatario_telefono ?? '—'}</div>
        ${pedido.destinatario_telefono2 ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${pedido.destinatario_telefono2}</div>` : ''}
      </div>
      <div class="info-box" style="grid-column:1/-1;">
        <div class="info-label">Dirección de entrega</div>
        <div class="info-value">${[direccion, ciudad].filter(Boolean).join(' · ') || '—'}</div>
        ${pedido.referencias_entrega ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">Ref: ${pedido.referencias_entrega}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Productos</div>
    <table>
      <thead>
        <tr><th>Producto</th><th>SKU</th><th style="text-align:right;">Cant.</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  </div>

  ${pedido.notas ? `
  <div class="section">
    <div class="section-title">Notas</div>
    <div style="background:#fffbeb;border-radius:8px;padding:12px;font-size:13px;color:#92400e;">${pedido.notas}</div>
  </div>` : ''}

  <div class="footer">
    <div>
      <div class="footer-text">P-Box · Guía de remisión</div>
      <div class="footer-text">${pedido.numero_pedido} · ${hoy}</div>
    </div>
    <div>
      <div class="sign-box" style="min-width:160px;min-height:40px;"></div>
      <div class="sign-label">Firma de recepción</div>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}
