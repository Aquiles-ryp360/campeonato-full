# Autollenado y validación de identidad

Este módulo agrega autollenado individual de participantes desde el formulario de inscripción y el panel del delegado.

## Flujo

1. El delegado acepta el consentimiento de uso de datos.
2. En `Búsqueda estudiante`, selecciona Escuela Profesional e ingresa el código de matrícula UNA.
3. Presiona `Buscar estudiante`.
4. El backend consulta server-side el endpoint público de trámites UNA:
   `https://tramites.unap.edu.pe/tramite/estudiante/{codigo}?carrera={codigoCarrera}`.
5. La UI muestra nombre, escuela, código y DNI enmascarado si existe.
6. El delegado confirma que los datos corresponden al participante.
7. El sistema copia los datos al formulario. El semestre queda siempre manual.
8. Al guardar, se persisten consentimiento y metadatos de verificación en `players`.

En `Búsqueda docente`, el delegado escribe nombre o apellido. La UI muestra sugerencias mientras escribe usando caché local; la consulta real se dispara con debounce, mínimo 3 letras y cache server-side para evitar consultar la fuente pública en cada tecla. El backend consulta:

`https://sictransparencia.unap.edu.pe/plana-docente/docente/lista`

El resultado docente se guarda con `identitySource=unap_docentes`, `documentType=DNI` y una referencia técnica `DOC-...` derivada del `id` público de la fila. No se inventa ni se muestra como código docente real.

En `Búsqueda nacional`, el delegado ingresa un DNI y presiona `Buscar DNI`. El backend consulta Perú API usando `X-API-KEY`, nunca desde el navegador. No se consulta mientras escribe.

## Variables de entorno

```env
IDENTITY_LOOKUP_ENABLED=true
UNAP_LOOKUP_ENABLED=true
UNAP_LOOKUP_BASE_URL=https://tramites.unap.edu.pe
UNAP_LOOKUP_TIMEOUT_MS=8000
UNAP_TEACHER_LOOKUP_ENABLED=true
UNAP_TEACHER_LOOKUP_BASE_URL=https://sictransparencia.unap.edu.pe
UNAP_TEACHER_LOOKUP_PERIOD=2026-I
UNAP_TEACHER_LOOKUP_TERM_ID=08de416c-dede-444c-83dd-ff3ee6aedfdf
UNAP_TEACHER_LOOKUP_RATE_LIMIT_PER_MINUTE=5
UNAP_TEACHER_LOOKUP_ALLOW_INSECURE_TLS=false
DNI_LOOKUP_ENABLED=true
DNI_PROVIDER=peruapi
PERUAPI_BASE_URL=https://peruapi.com
PERUAPI_API_KEY=
PERUAPI_TIMEOUT_MS=8000
DNI_API_BASE_URL=
DNI_API_TOKEN=
IDENTITY_LOOKUP_CACHE_TTL_DAYS=7
DNI_LOOKUP_CACHE_TTL_DAYS=30
IDENTITY_LOOKUP_RATE_LIMIT_PER_MINUTE=5
DNI_LOOKUP_RATE_LIMIT_PER_MINUTE=5
```

## Seguridad y límites

- No se piden contraseñas institucionales.
- No se accede a intranet, campus, correos ni cuentas privadas.
- No hay scraping runtime de listas ni enumeración de códigos.
- Estudiantes se consultan solo por botón.
- Docentes se consultan con debounce, mínimo 3 letras, máximo 5 resultados y caché.
- DNI nacional se consulta solo por botón, con caché por hash del DNI.
- Rate limit actual: 5 consultas UNA/minuto/IP, 5 consultas docentes/minuto/IP y 5 consultas DNI/minuto/IP.
- El backend construye internamente la URL y solo permite `tramites.unap.edu.pe` por HTTPS.
- Para docentes, el backend solo permite `sictransparencia.unap.edu.pe` por HTTPS.
- Para DNI nacional, el backend solo permite `peruapi.com` por HTTPS y usa header `X-API-KEY`.
- El DNI se muestra enmascarado en tarjetas de resultado.
- La tabla `identity_lookup_cache` queda cerrada por RLS; el endpoint usa cache en memoria y la tabla queda lista para una cache persistente/Redis.

## Agregar escuelas UNA

Editar `src/data/unapCareers.ts` y agregar objetos:

```ts
{ code: "36", name: "INGENIERÍA MECÁNICA ELÉCTRICA" }
```

El frontend usa esta lista para el selector y el backend la usa como lista blanca. No se debe consultar ni scrapear esa lista en producción.

## Proveedor DNI

El contrato está preparado en `IdentityLookupService.lookupDni`.

Valores previstos:

- `DNI_PROVIDER=none`
- `DNI_PROVIDER=peruapi`
- `DNI_PROVIDER=peru_consult`
- `DNI_PROVIDER=external_api`

Para Perú API, definir `PERUAPI_API_KEY` en el entorno seguro. En desarrollo también se acepta el alias `API_Key_PERUAPI`. Para conectar otro proveedor, implementar el adaptador del contrato elegido y mantener el mismo formato público de respuesta. No se debe hardcodear un proveedor inseguro ni enviar datos a terceros sin configuración explícita.
