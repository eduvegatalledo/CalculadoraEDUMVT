# Pruebas manuales

Asegura que la interfaz muestra correctamente caracteres especiales en los nombres de alimentos.

1. Abrir la aplicación en un navegador.
2. En el formulario **Agregar comida**, ingresar un nombre con caracteres especiales, por ejemplo:
   - `Té & galletas`
   - `Jamón "ahumado"`
   - `Piña colada (fría)`
3. Guardar el registro y verificar que el nombre se muestra sin alteraciones en la tabla de comidas de hoy.
4. Intentar enviar un nombre con etiquetas HTML, p. ej. `<script>alert(1)</script>`.
5. Confirmar que la aplicación muestra el mensaje de error *Nombre inválido* y no envía la información.

Estas pruebas ayudan a validar que los caracteres especiales se renderizan correctamente y que se evita la inserción de HTML malicioso.
