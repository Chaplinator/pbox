# Phase D: Translation Guide - Text Extraction & Translation

## Overview
This guide shows how to extract hardcoded Spanish strings and replace them with i18n keys. The i18n infrastructure is fully configured and ready to use.

## Pattern

### Before (Hardcoded Spanish)
```javascript
import { useState } from 'react'

export default function MyPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div>
      <h1>Mi página</h1>
      <p>Cargando datos...</p>
      <button>{loading ? 'Guardando...' : 'Guardar'}</button>
    </div>
  )
}
```

### After (With i18n)
```javascript
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function MyPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  return (
    <div>
      <h1>{t('perfil.title')}</h1>
      <p>{t('common.loading')}</p>
      <button>{loading ? t('common.saving') : t('common.save')}</button>
    </div>
  )
}
```

## Step-by-Step Process

1. **Add import at top of file:**
   ```javascript
   import { useTranslation } from 'react-i18next'
   ```

2. **Get translation function in component:**
   ```javascript
   const { t } = useTranslation()
   ```

3. **Replace hardcoded strings with t() calls:**
   - Use appropriate namespace: `t('common.xxx')`, `t('auth.xxx')`, `t('nav.xxx')`, etc.
   - Check translation files at `src/i18n/es.json` and `src/i18n/en.json`

## Files to Translate (Priority Order)

### Critical Pages (1-2 hours)
- [x] `src/pages/auth/Login.jsx` - DONE
- [ ] `src/pages/auth/Registro.jsx`
- [ ] `src/pages/auth/Recovery.jsx`
- [ ] `src/pages/cliente/Perfil.jsx` - PARTIALLY DONE (add more)
- [ ] `src/pages/cliente/Dashboard.jsx`

### Core Operations (2-3 hours)
- [ ] `src/pages/cliente/Inventario.jsx`
- [ ] `src/pages/cliente/Pedidos.jsx`
- [ ] `src/pages/cliente/Ingresos.jsx`
- [ ] `src/pages/operador/PanelOperativo.jsx`
- [ ] `src/pages/operador/RecepcionInventario.jsx`
- [ ] `src/pages/operador/Usuarios.jsx`

### Admin & Support (1-2 hours)
- [ ] `src/pages/admin/SuperAdmin.jsx`
- [ ] `src/pages/admin/AdminGM.jsx`
- [ ] `src/pages/admin/AdminCuenta.jsx`
- [ ] `src/pages/cliente/Destinatarios.jsx`
- [ ] `src/pages/cliente/Canastas.jsx`
- [ ] `src/pages/cliente/Planes.jsx`
- [ ] `src/pages/operador/Reportes.jsx`
- [ ] `src/pages/public/Track.jsx`

### Layout Components (30 min)
- [x] `src/components/layout/AppShell.jsx` - DONE
- [ ] `src/components/layout/ProtectedRoute.jsx`

### UI Components (if hardcoded text) (30 min)
- [ ] `src/components/ui/*` - Check for hardcoded strings

## Common Keys to Use

### Common UI
```
t('common.loading')      // "Cargando..."
t('common.saving')       // "Guardando..."
t('common.cancel')       // "Cancelar"
t('common.save')         // "Guardar"
t('common.delete')       // "Eliminar"
t('common.edit')         // "Editar"
t('common.logout')       // "Cerrar sesión"
```

### Auth
```
t('auth.login_title')    // "Iniciar Sesión"
t('auth.email')          // "Email"
t('auth.password')       // "Contraseña"
t('auth.invalid_credentials') // "Email o contraseña incorrectos"
```

### Navigation
```
t('nav.inventario')      // "Inventario"
t('nav.pedidos')         // "Pedidos"
t('nav.usuarios')        // "Usuarios"
```

### Forms
```
t('forms.required_field') // "Campo requerido"
t('forms.save_success')   // "Guardado correctamente"
t('forms.save_error')     // "Error al guardar"
```

## Searching for Hardcoded Strings

Find all hardcoded Spanish strings in a file:
```bash
# Find common loading messages
grep -r "Cargando" src/pages --include="*.jsx"

# Find "Guardar" strings
grep -r "Guardar" src/pages --include="*.jsx"

# Find all Spanish error messages
grep -r "Error al" src/pages --include="*.jsx"
```

## Testing Your Translations

1. **Change language in app:**
   - Go to Mi Perfil → Language selector
   - Switch between Español and English
   - Verify text changes on the page

2. **Check browser console:**
   - No i18n errors
   - Namespace loads correctly

3. **Verify fallback:**
   - If translation key missing, should show key name, not error

## Adding New Translations

If you need a new translation key:

1. Add to both `src/i18n/es.json` and `src/i18n/en.json`:
```json
{
  "myNamespace": {
    "my_key": "Spanish text here"
  }
}
```

2. Use in component:
```javascript
t('myNamespace.my_key')
```

## Translation Namespaces Available

- `common` - Shared UI elements
- `auth` - Login, registration, password recovery
- `nav` - Navigation labels
- `inventory` - Inventory management
- `orders` - Orders and shipments
- `users` - User management
- `forms` - Form labels and validation
- `errors` - Error messages
- `admin` - Admin panels
- `perfil` - User profile

## Tips

1. **Keep translations SHORT** - Long text wraps on mobile
2. **Use consistent terminology** - "Guardar" not "Graba" or "Almacena"
3. **Test both languages** - Ensure English translations make sense
4. **Don't translate brand names** - P-Box stays P-Box
5. **Use existing keys first** - Check translations file before creating new ones
6. **Lazy load languages** - i18next is already configured for this

## Completion Checklist

- [ ] All auth pages translated (Login, Registro, Recovery)
- [ ] All client pages translated (Dashboard, Inventario, Pedidos, etc.)
- [ ] All operador pages translated (Panel, Recepcion, Usuarios, Reportes)
- [ ] All admin pages translated (SuperAdmin, AdminGM, AdminCuenta)
- [ ] All support pages translated (Destinatarios, Canastas, Planes, Track)
- [ ] All layout components translated (AppShell, ProtectedRoute)
- [ ] Language switching tested (UI updates on change)
- [ ] Both languages verified (ES and EN)
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)

## Estimated Time
- **Critical pages**: 1-2 hours
- **Core operations**: 2-3 hours  
- **Admin & support**: 1-2 hours
- **Components**: 30 minutes
- **Testing**: 30 minutes

**Total: 5-8 hours for complete Phase D**

---

## Example: Full Component Translation

### Original (Before)
```javascript
export default function MyComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  return (
    <div className="p-8">
      <h1>Mis Datos</h1>
      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {data && <p>Datos cargados correctamente</p>}
    </div>
  )
}
```

### Translated (After)
```javascript
import { useTranslation } from 'react-i18next'

export default function MyComponent() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  return (
    <div className="p-8">
      <h1>{t('perfil.title')}</h1>
      {loading && <p>{t('common.loading')}</p>}
      {error && <p className="text-red-600">{t('errors.generic_error')}: {error}</p>}
      {data && <p>{t('forms.save_success')}</p>}
    </div>
  )
}
```

---

## Next Steps

1. Start with critical pages (Login, Registro, Recovery, Dashboard)
2. Move to core operations (Inventario, Pedidos, Ingresos)
3. Complete admin and support pages
4. Test language switching thoroughly
5. Build and verify no errors

Good luck! 🚀
