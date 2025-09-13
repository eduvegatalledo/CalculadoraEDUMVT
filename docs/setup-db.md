# Configuración de la base de datos

Este proyecto **no ejecuta automáticamente** ningún script SQL. Para que el frontend funcione, es necesario crear las tablas y vista que espera en tu proyecto de Supabase.

## Pasos
1. Abre el panel de [Supabase](https://supabase.com/) de tu proyecto.
2. Ve a **SQL Editor**.
3. Copia el contenido de [`/db/schema.sql`](../db/schema.sql) y pégalo en una nueva consulta.
4. Ejecuta la consulta.

El script es idempotente, por lo que puedes ejecutarlo varias veces sin efectos secundarios.

## Notas sobre RLS y permisos
- Las tablas `goals` y `meals` tienen **Row Level Security** habilitado. Cada política limita el acceso a filas cuyo `user_id` coincide con `auth.uid()`.
- La vista `v_daily_totals` se expone con `security_invoker` y se concede `SELECT` al rol `authenticated`.

## Pruebas rápidas
En la consola SQL puedes validar la creación con algunos `SELECT` sencillos:
```sql
select * from public.goals limit 5;
select * from public.meals limit 5;
select * from public.v_daily_totals limit 5;
```
Si recibes mensajes de "relation does not exist" o errores de permisos, verifica que ejecutaste el script y que estás autenticado con un usuario válido.
