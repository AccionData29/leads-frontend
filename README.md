# Leads Frontend

Frontend Angular para la plataforma de priorización de leads.

## Stack objetivo

- Angular CLI 22.1.8
- Angular 22.1.8
- Node.js 24.21.0
- npm 12.0.2
- TypeScript 5.9
- Backend .NET + PostgreSQL

## Decisión funcional: compañía y sede

El frontend **no maneja perfiles ni login** en esta versión.

La navegación y el dashboard se segmentan siempre por:

1. Compañía (`empresaId`)
2. Sede / punto de venta (`puntoVentaId`), opcional para ver todas las sedes de una compañía.

Las 15 sedes del dataset están distribuidas así:

- EMP-01: PV-001 a PV-005
- EMP-02: PV-006 a PV-010
- EMP-03: PV-011 a PV-015

El selector de sede solo muestra las sedes pertenecientes a la compañía seleccionada.

### Importante sobre seguridad

El selector de compañía es un **contexto funcional**, no un mecanismo de seguridad. Como el requisito del assessment indica que una comercializadora solo puede ver sus propios clientes, el backend debe validar/forzar `empresaId` en producción. Sin login/perfiles, una alternativa para despliegue real es un contexto de compañía configurado por ambiente/deployment; no se debe confiar únicamente en un `empresaId` enviado por el navegador.

## Integración actual con .NET

El frontend consume el contrato disponible:

- `GET /api/v1/leads`
- `GET /api/v1/leads/{leadId}`
- `GET /api/v1/leads/{leadId}/score`
- `GET /api/v1/leads/{leadId}/assignment`
- `GET /api/v1/advisors`
- `GET /api/v1/motorcycles`
- `GET /api/v1/pipeline-runs`

El interceptor agrega automáticamente `empresaId` y, cuando se selecciona, `puntoVentaId` a las consultas `/api/v1/*`.

## Ejecución

```powershell
npm install
npm start
```

Abrir `http://localhost:4200`.

Para desarrollo con backend en otro puerto se recomienda agregar un proxy de Angular (`proxy.conf.json`) o cambiar `apiBaseUrl` en `src/app/core/config/app.config.ts`.

## Dashboard

Incluye:

- contexto de compañía y sede;
- KPIs;
- distribución por prioridad;
- distribución por canal;
- cola de leads prioritarios;
- vista de gestión diaria;
- filtros por estado.

## Nota sobre métricas del dashboard

El dashboard solicita todas las páginas del endpoint `/leads` para calcular los KPIs del contexto seleccionado. Esto permite que la vista de compañía o sede no quede limitada a los primeros 50 registros del backend.

Para producción, la evolución recomendada es agregar en .NET un endpoint de dashboard con agregaciones SQL (`/api/v1/dashboard`) y devolver las métricas ya calculadas, manteniendo la validación de `empresaId`/`puntoVentaId` en servidor.
