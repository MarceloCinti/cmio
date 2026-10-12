# Plan de pruebas

## Resumen de la última ejecución

| Suite | Herramienta | Resultado |
|---|---|---|
| Unidad e integración (base PostgreSQL real `cmio_test`) | Vitest | **77 pruebas, 77 aprobadas** |
| Punta a punta contra el build de producción (escritorio 1440 px y móvil 390 px) | Playwright + Chromium | **24 pruebas, 24 aprobadas** |
| Punta a punta con el rol de base de datos de mínimo privilegio | Playwright | 24 de 24 aprobadas |
| Lint y tipos | ESLint, TypeScript | Sin errores |
| Revisión visual en 360, 390, 768, 1024 y 1440 px | Capturas automáticas por rol | Sin desbordes horizontales tras correcciones |
| Respaldo y restauración | Scripts | Verificado (ver RESPALDOS.md) |

## Cómo ejecutar

```bash
pnpm lint && pnpm typecheck
pnpm test                                   # requiere la base cmio_test
pnpm build
PW_CHROMIUM_PATH=/ruta/a/chromium pnpm test:e2e   # requiere la base cmio_e2e_test
# Opcional: E2E con un rol limitado
E2E_APP_DATABASE_URL=postgresql://cmio_app:…@localhost:5432/cmio_e2e_test pnpm test:e2e
```

Las suites vacían sus bases antes de cada prueba o ejecución y se niegan a correr sobre bases
cuyo nombre no termine en `_test`.

## Cobertura por área

| Área | Pruebas automáticas (archivo → casos) |
|---|---|
| 1. Registro e ingreso | `auth.test.ts`: registro con rol paciente, consentimientos y verificación; contraseñas débiles; sesión con hash; respuesta igual ante credenciales o correos inexistentes; bloqueo tras 5 intentos (también para correos sin cuenta); cuentas desactivadas. E2E: credenciales incorrectas, cookie segura, cierre de sesión |
| 2. Recuperación de contraseña | `auth.test.ts`: enlace de un solo uso, vencido, no revela si el correo existe, cierra sesiones; cambio de contraseña |
| 3. Roles y permisos | `admin.test.ts`: escalada de privilegios, último propietario, límites de permisos, vinculación de cuentas a perfiles profesionales. `auth.test.ts`: rol privilegiado en el registro. E2E: áreas privadas, paciente fuera del panel, secretaría sin historia ni usuarios |
| 4. Disponibilidad | `slots.test.ts` (9 casos): duración, días sin reglas, vigencias, bloques incompletos, ocupación, cancelaciones, feriados, anticipación, capacidad. `appointments.test.ts`: turnos reales y feriados |
| 5. Reservas y doble reserva | `appointments.test.ts`: reserva con trazabilidad, a nombre de otro paciente, fuera de agenda, **solicitudes simultáneas**, restricción de base, superposición del paciente, sobreturnos, límite de citas. E2E: reserva desde el portal |
| 6. Cancelación y reprogramación | `appointments.test.ts`: plazos, motivo obligatorio, transiciones inválidas, flujo del día, reprogramación con revalidación |
| 7. Historia clínica | `clinical.test.ts`: acceso solo con relación de atención (auditado), relación no creada por citas canceladas o autoagendadas, antecedentes versionados, consulta completa y bloqueo al finalizar, contenido mínimo, recetas anulables solo por su autor, seguimiento visible solo si se habilita |
| 8. Documentos | `clinical.test.ts`: la secretaría sube para revisión y solo ve lo que subió, el paciente accede solo tras publicación, otro paciente no accede, archivos falsos y tamaño |
| 9. Notificaciones y fallos de integraciones | `messaging.test.ts`: sin simulación sin credenciales, WhatsApp no configurado, reintentos con espera creciente, la falla del proveedor no impide agendar, consentimiento, deduplicación, plantillas de seguridad fijas, webhook firmado |
| 10. Auditoría | `admin.test.ts`: registros inmutables; accesos y exportaciones auditados en varias pruebas |
| 11. Informes y exportaciones | `admin.test.ts`: indicadores con datos reales, CSV sin teléfonos y protegido contra fórmulas; `clinical.test.ts`: exportación clínica con permiso, relación y motivo |
| 12. Sitio público, móvil y seguridad web | E2E: portada en español con CSP y sin errores de consola, contacto, 8 páginas sin desbordes en 5 anchos, consentimiento obligatorio, 404. Unidad: redirección segura, IP de origen |

## Verificación manual recomendada antes de publicar

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Correo real | Registrarse con un correo propio; usar "¿Olvidaste tu contraseña?" | Llegan ambos correos, en español, desde el dominio de la clínica |
| WhatsApp real | Con plantillas aprobadas, agendar una cita para un paciente con consentimiento | Llega el mensaje; Panel → Mensajes muestra "entregado" |
| Recordatorios | Cita para mañana; esperar la tarea periódica | Un único recordatorio por canal habilitado |
| Celular real | Recorrido completo del paciente en Android (Chrome) e iPhone (Safari) | Sin desbordes; teclado numérico en teléfono; botones cómodos |
| Accesibilidad | Navegar con teclado y con NVDA o VoiceOver la portada, el ingreso y la reserva | Foco visible, etiquetas leídas, errores anunciados |
| Impresión | Imprimir una receta y una orden | Datos del profesional, código de verificación, sin firma inventada |
| Restauración | Restaurar el último respaldo en una base vacía | Conteos iguales y sitio funcional |
| Permisos | Con cada rol, intentar abrir URLs de otros roles | Redirección a "Sin permiso" o al ingreso |
