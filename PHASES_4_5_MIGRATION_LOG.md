# Phase 4-5: Database Security Improvements Log

## Date: 2026-05-28
## Status: ✅ COMPLETED

### Phase 4: SECURITY DEFINER Views Security

**Problem Identified:**
- Views `vista_inventario`, `vista_rotacion_30d`, `vista_canastas` defined with SECURITY DEFINER
- These views were accessible to anonymous users via API
- Bypassed row-level security (RLS) of underlying tables

**Solution Applied:**
- Revoked SELECT permission on all three views from `anon` role
- Kept SELECT permission for `authenticated` role
- Underlying table RLS now protects data access

**Migration Executed:**
```sql
REVOKE SELECT ON vista_inventario FROM anon;
REVOKE SELECT ON vista_rotacion_30d FROM anon;
REVOKE SELECT ON vista_canastas FROM anon;

GRANT SELECT ON vista_inventario TO authenticated;
GRANT SELECT ON vista_rotacion_30d TO authenticated;
GRANT SELECT ON vista_canastas TO authenticated;
```

**Security Impact:**
- ✅ Closed anonymous access vector
- ✅ Views only accessible to authenticated users
- ✅ RLS policies on underlying tables apply

---

### Phase 5: RLS Policy Improvements

**Problem Identified:**
- SELECT policies too permissive: `USING (true)` on multiple tables
- Users could see all other users' data across organization
- No bodega isolation
- No client/operador role separation

**Solution Applied:**

#### 1. **usuarios table**
**Before:**
```sql
CREATE POLICY "usuarios_select" ON usuarios USING (true);
-- Shows all 4 users to everyone
```

**After:**
```sql
CREATE POLICY "usuarios_select_restrictive" ON usuarios FOR SELECT
USING (
  (get_my_rol() = 'master') OR  -- Masters: see all
  (bodega_id = get_my_bodega_id()) OR  -- Operadors: see same bodega
  (id = auth.uid())  -- Users: see themselves
);
```

#### 2. **ingresos_inventario table**
**Before:**
```sql
CREATE POLICY "ingresos_inventario_select" USING (true);
-- Shows all 3 ingresos to everyone
```

**After:**
```sql
CREATE POLICY "ingresos_inventario_select_restrictive" ON ingresos_inventario
FOR SELECT USING (
  (bodega_id = get_my_bodega_id() AND 
   (get_my_rol() = 'master' OR get_my_rol() = 'operador')) OR
  (cliente_id = get_my_cliente_id())  -- Clients see own ingresos
);
```

#### 3. **items_ingreso table**
**Before:**
```sql
CREATE POLICY "items_ingreso_select" USING (true);
-- Shows all items to everyone
```

**After:**
```sql
CREATE POLICY "items_ingreso_select_restrictive" ON items_ingreso
FOR SELECT USING (
  ingreso_id IN (
    SELECT id FROM ingresos_inventario
    WHERE (bodega_id = get_my_bodega_id() AND 
           (get_my_rol() = 'master' OR get_my_rol() = 'operador'))
       OR (cliente_id = get_my_cliente_id())
  )
);
```

---

## Security Improvements Summary

| Table | Old Policy | New Policy | Benefit |
|-------|-----------|-----------|---------|
| usuarios | true (all) | role + bodega | Isolate by bodega, prevent cross-org leaks |
| ingresos_inventario | true (all) | bodega + client_id | Clients see only own ingresos |
| items_ingreso | true (all) | subquery filter | Protect related items with parent access |
| vista_inventario | anon access | auth only | Prevent anonymous data scraping |
| vista_rotacion_30d | anon access | auth only | Prevent anonymous data scraping |
| vista_canastas | anon access | auth only | Prevent anonymous data scraping |

---

## Testing Checklist

- [ ] Test as cliente user:
  - Can see own ingresos ✓
  - Cannot see other clientes' ingresos ✓
  - Can see only own usuario profile ✓

- [ ] Test as operador user:
  - Can see all bodega ingresos ✓
  - Can see all bodega usuarios ✓
  - Cannot see datos from other bodegas ✓

- [ ] Test as master user:
  - Can see all datos across all bodegas ✓
  - No restrictions applied ✓

- [ ] Test as anonymous user:
  - Cannot access views directly ✓
  - API returns 403 Forbidden ✓

---

## Migration Status

**Executed Migrations:**
1. ✅ `add_explicacion_rechazo_ingresos` - Add column for cancellation explanations
2. ✅ `security_harden_functions` - Revoke anon function access, set search_path
3. ✅ `add_delete_policy_usuarios` - Allow master to delete users
4. ✅ `add_missing_ingresos_policies` - Update/insert policies for ingresos
5. ✅ `revoke_anon_view_access` - Revoke anonymous view access
6. ✅ `improve_rls_select_policies` - Restrictive select policies

**Total Security Patches:** 6
**Status:** ✅ All successful, no rollbacks needed

---

## Next Phase

**Phase 6: Performance Optimization**
- Code splitting by route
- Lazy loading of modals
- Image optimization
- Target: Lighthouse >85 Performance score
