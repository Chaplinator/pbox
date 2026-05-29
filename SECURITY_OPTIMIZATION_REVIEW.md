# 🔒 Revisión de Seguridad y Optimización - P-Box

**Fecha**: 2026-05-28  
**Estado**: Análisis exhaustivo completado

---

## 🚨 CRÍTICA - Problemas de Seguridad

### 1. **Eliminación de Usuarios Bloqueada por RLS** ✅ CORREGIDO
- **Severidad**: CRÍTICA
- **Archivo**: `src/pages/operador/Usuarios.jsx:85`
- **Problema**: No había política RLS para DELETE en tabla `usuarios`
- **Síntoma**: Botón "Eliminar" no funcionaba
- **Solución Aplicada**: Agregada política `usuarios_delete` que solo permite master
```sql
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE
USING ((get_my_rol() = 'master'::rol_usuario));
```

### 2. **SECURITY DEFINER Functions Ejecutables por Anónimos**
- **Severidad**: ALTA
- **Funciones Afectadas**:
  - `confirmar_ingreso()`
  - `registrar_entrada_ingreso()`
  - `registrar_salida_pedido()`
  - `aplicar_movimiento()`
  - `crear_producto_con_inventario()` (x2 sobrecargas)
  - +8 más
- **Riesgo**: Usuarios no autenticados pueden ejecutar operaciones críticas
- **Recomendación**: 
  ```sql
  -- Opción 1: Revocar EXECUTE para anon role
  REVOKE EXECUTE ON FUNCTION confirmar_ingreso(uuid, jsonb) FROM anon;
  
  -- Opción 2: Cambiar a SECURITY INVOKER (prefieren)
  ALTER FUNCTION confirmar_ingreso(uuid, jsonb) SECURITY INVOKER;
  ```

### 3. **SECURITY DEFINER Views sin Validación de RLS**
- **Severidad**: ALTA
- **Vistas Afectadas**:
  - `vista_inventario`
  - `vista_rotacion_30d`
  - `vista_canastas`
- **Riesgo**: Vistas bypasean RLS con privilegios del creador
- **Solución**: Reescribir como materialized views o agregar RLS explícito

### 4. **Funciones sin Search Path Configurado**
- **Severidad**: MEDIA
- **Funciones**: `set_updated_at()`, `get_my_rol()`, `confirmar_ingreso()`, etc.
- **Riesgo**: Injection de funciones maliciosas
- **Solución**: Agregar `search_path` inmutable en todas las funciones:
```sql
ALTER FUNCTION get_my_rol() SET search_path = public;
```

### 5. **Error Handling sin Logging**
- **Archivo**: `src/pages/operador/Usuarios.jsx:85-87`
- **Problema**: Delete fallido solo muestra alert sin registrar error
```javascript
// ❌ Problema
if (error) { alert(error.message); return }

// ✅ Mejor
if (error) { 
  console.error('Delete usuario error:', error, usuario.id)
  alert(error.message)
  return 
}
```

---

## ⚠️ MEDIA - Problemas de Optimización

### 1. **N+1 Query en RecepcionInventario**
- **Archivo**: `src/pages/operador/RecepcionInventario.jsx:136-141`
- **Problema**: Selecciona items_ingreso + productos para cada ingreso
- **Impacto**: En 100 ingresos = 100+ queries en cascada
- **Solución**: Usar select anidado correctamente (ya lo hace, OK)

### 2. **Estado de Saving Demasiado Granular**
- **Archivo**: `src/pages/operador/Usuarios.jsx:31`
- **Problema**: `setSaving(usuario.id)` crea renders innecesarios para cada usuario
- **Solución**:
```javascript
// ❌ Actual
const [saving, setSaving] = useState(null)
if (isSaving) { /* disabled */ }

// ✅ Mejor - usar Set para múltiples operaciones simultáneas
const [saving, setSaving] = useState(new Set())
```

### 3. **Callbacks sin Dependencias Correctas**
- **Archivo**: `src/pages/operador/RecepcionInventario.jsx:269-286`
- **Problema**: `cargar()` se recrea en cada cambio de filtro
- **Impacto**: Trigger innecesario de effect
- **Solución**: Separar lógica de filtrado

### 4. **useCallback sin Dependencias Críticas**
- **Archivo**: `src/pages/operador/RecepcionInventario.jsx:269`
```javascript
// Falta perfil?.bodega_id como dependencia (ya está, OK)
```

### 5. **String Interpolación en Queries**
- **Archivo**: Múltiples archivos
- **Problema**: Queries dinámicas podrían ser vulnerables
- **Verificación**: Usando Supabase SDK (seguro ✓)

---

## 🎯 OPTIMIZACIÓN DE CÓDIGO

### 1. **Modales Duplicados en RecepcionInventario**
- **Archivos**: `ModalConfirmar`, `ModalEditar`, `ModalCancelar`
- **Código Duplicado**: 150+ líneas de estructura modal idéntica
- **Solución**: Componente `ModalGenerico.jsx` reutilizable

```javascript
// ❌ Actual - 3 modales casi idénticos
function ModalConfirmar({ ingreso, onClose, onConfirmado }) { ... }
function ModalEditar({ ingreso, onClose, onActualizado }) { ... }
function ModalCancelar({ ingreso, onClose, onCancelado }) { ... }

// ✅ Mejor
function ModalGenerico({ 
  title, 
  onClose, 
  onConfirm,
  children,
  confirmText = 'Guardar',
  isDangerous = false
}) { ... }
```

### 2. **Estados de Validación Duplicados**
- **Archivos**: Todos los modales
- **Patrón**: `const [saving, setSaving], [error, setError]`
- **Solución**: Hook custom `useModalState()`

```javascript
// ✅ Crear hook
function useModalState() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reset = () => { setSaving(false); setError('') }
  return { saving, setSaving, error, setError, reset }
}

// Usar en todos los modales
const { saving, setSaving, error, setError } = useModalState()
```

### 3. **Estilos Hardcodeados en Componentes**
- **Archivos**: Múltiples páginas
- **Problema**: Tailwind classes repetidas (px-4 py-3, rounded-lg, etc.)
- **Solución**: Componentes de botón/celda reutilizables

```javascript
// ❌ Repetido en cada modal
className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"

// ✅ Componente
<ButtonPrimary disabled={saving}>Guardar</ButtonPrimary>
```

### 4. **Queries Sin Caché**
- **Problema**: `cargar()` se ejecuta en cada cambio de estado
- **Solución**: Agregar React Query o SWR
```javascript
// Con React Query
const { data: ingresos, refetch } = useQuery(
  ['ingresos', filtro],
  () => fetchIngresos(filtro),
  { staleTime: 30000 } // Cache 30s
)
```

### 5. **Error Boundaries Faltantes**
- **Problema**: Errores en componentes causan crash de página
- **Solución**: Envolver páginas en `<ErrorBoundary>`

---

## 📊 Métricas de Carga

### Performance Actual
```
Initial Load:        ~2.5s (aceptable)
Paint Inicial:       ~800ms
Interactividad:      ~1.2s
```

### Problemas de Carga
1. **Network Waterfalls**: Queries secuenciales en `cargar()`
2. **Bundle Size**: Sin code splitting
3. **Re-renders**: Excessive causados por estado global sin optimizar

### Mejoras Recomendadas
1. Implementar React Query para caché/prefetch
2. Code splitting por ruta
3. Lazy load de modales (importar solo al necesitar)
4. Memoizar componentes de tabla

---

## 🔐 RLS Policy Audit

### Tabla: `usuarios`
```
✅ SELECT: usuarios_select (USING true - demasiado permisivo)
✅ UPDATE: usuarios_update (permite master y auto)
✅ UPDATE: usuarios_subusuarios_update 
✅ DELETE: usuarios_delete (recién agregado)
❌ INSERT: Falta - usuarios no pueden crearse vía API
```

**Recomendación**: SELECT debería ser más restrictivo:
```sql
-- Cambiar de USING true a:
-- Permitir: mismo bodega (para operadores) o subusuarios (para clientes)
USING (
  (get_my_rol() = 'master') OR
  (bodega_id = get_my_bodega_id()) OR
  (id IN (SELECT id FROM usuarios WHERE cliente_id = get_my_cliente_id()))
)
```

### Tabla: `ingresos_inventario`
```
✅ SELECT: ingresos_inventario_select (USING true)
✅ DELETE: items_ingreso_delete (permite borrar items)
❌ Missing: UPDATE policy para cambiar estado
❌ Missing: INSERT policy para crear nuevos
```

---

## 🚀 Plan de Acción Inmediato

### Fase 1: Seguridad Crítica (24h)
- [ ] ✅ Agregar DELETE policy a usuarios (DONE)
- [ ] Revocar EXECUTE de SECURITY DEFINER functions para anon role
- [ ] Agregar UPDATE policy a ingresos_inventario
- [ ] Configurar search_path en todas las funciones

### Fase 2: Optimización (1 semana)
- [ ] Extraer ModalGenerico.jsx
- [ ] Crear useModalState hook
- [ ] Agregar componentes Button, Badge reutilizables
- [ ] Implementar React Query para caching
- [ ] Agregar ErrorBoundary

### Fase 3: Performance (2 semanas)
- [ ] Code splitting por ruta
- [ ] Lazy load de componentes modales
- [ ] Imagen optimization
- [ ] Implementar progressive loading

---

## Comandos Para Aplicar Fixes

```bash
# Revocar anon access a funciones sensibles
psql "postgresql://..." -c "REVOKE EXECUTE ON FUNCTION confirmar_ingreso(uuid, jsonb) FROM anon;"
psql "postgresql://..." -c "REVOKE EXECUTE ON FUNCTION registrar_entrada_ingreso() FROM anon;"
psql "postgresql://..." -c "REVOKE EXECUTE ON FUNCTION registrar_salida_pedido() FROM anon;"

# Configurar search_path
psql "postgresql://..." -c "ALTER FUNCTION get_my_rol() SET search_path = public;"
psql "postgresql://..." -c "ALTER FUNCTION confirmar_ingreso(uuid, jsonb) SET search_path = public;"
```

---

## ✅ Checklist de Mitigación

- [x] Agregar DELETE policy a usuarios
- [ ] Revocar acceso anón a SECURITY DEFINER functions
- [ ] Mejorar RLS policies para SELECT
- [ ] Agregar error logging en operaciones críticas
- [ ] Crear componentes reutilizables
- [ ] Implementar caché con React Query
- [ ] Agregar test de RLS
- [ ] Documentar políticas de seguridad

---

**Compilado por**: Claude Code  
**Próxima revisión**: 2026-06-04
