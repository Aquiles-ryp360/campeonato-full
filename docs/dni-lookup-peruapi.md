# Consulta nacional de DNI con Perú API

Proveedor configurado: `https://peruapi.com`
Endpoint externo usado por backend: `GET /api/dni/{dni}`
Endpoint interno del proyecto: `POST /api/identity/dni`

## Variables de entorno

```env
DNI_LOOKUP_ENABLED=true
DNI_PROVIDER=peruapi
PERUAPI_BASE_URL=https://peruapi.com
PERUAPI_API_KEY=
PERUAPI_TIMEOUT_MS=8000
DNI_LOOKUP_CACHE_TTL_DAYS=30
DNI_LOOKUP_RATE_LIMIT_PER_MINUTE=5
```

`PERUAPI_API_KEY` debe configurarse solo en `.env.local`, Vercel o el entorno seguro del servidor. Por compatibilidad local, el backend también acepta el alias `API_Key_PERUAPI`. Ninguna key debe ir en frontend, documentación pública ni commits.

## Script de prueba

```bash
node scripts/test_peruapi_dni.js <DNI_8_DIGITOS>
```

El script lee `.env` y `.env.local`, exige DNI de 8 dígitos, usa header `X-API-KEY`, aplica timeout, enmascara el DNI y no guarda respuesta cruda. No usa `?api_token=`.

Mensajes esperados:

- `PERUAPI_API_KEY no configurado.`
- `API Key inválida o sin permisos.`
- `Límite de consultas alcanzado.`
- `No se encontraron datos para el DNI consultado.`

## Endpoint interno

```bash
curl -X POST http://localhost:3000/api/identity/dni \
  -H "Content-Type: application/json" \
  -d '{"dni":"<DNI_8_DIGITOS>","consentAccepted":true}'
```

Respuesta normalizada:

```json
{
  "ok": true,
  "source": "peruapi",
  "data": {
    "codigoMatricula": "NAC-REFERENCIA",
    "dniMasked": "******78",
    "dni": "<DNI_8_DIGITOS>",
    "nombres": "JUAN CARLOS",
    "apellidoPaterno": "PEREZ",
    "apellidoMaterno": "QUISPE",
    "fullName": "JUAN CARLOS PEREZ QUISPE",
    "escuela": "Consulta nacional DNI"
  },
  "message": "Datos encontrados. Verifica que correspondan al participante."
}
```

## Seguridad

- La API key nunca llega al navegador.
- No se usa scraping ni RENIEC.
- No se consulta por GET interno.
- No se consulta mientras el usuario escribe.
- El usuario debe presionar `Buscar DNI`.
- El backend valida exactamente 8 dígitos.
- El backend usa `X-API-KEY`, no query string.
- Rate limit: 5 consultas por minuto por IP.
- Caché en memoria por hash SHA-256 del DNI, TTL 30 días.
- No se imprime la respuesta cruda del proveedor.
- El registro manual sigue disponible si falla la consulta.

## Frontend

El bloque de búsqueda tiene tres modos:

- `Búsqueda estudiante`: código de matrícula + carrera UNA.
- `Búsqueda docente`: nombre/apellido contra Plana Docente UNA, con debounce y sugerencias.
- `Búsqueda nacional`: DNI contra Perú API, solo al presionar botón.

En `Búsqueda nacional`, el usuario ingresa DNI, acepta consentimiento, presiona `Buscar DNI`, revisa la tarjeta con nombre completo y DNI enmascarado, confirma y presiona `Usar estos datos`.

## Cambio futuro de proveedor

La integración queda encapsulada en `IdentityLookupService.lookupDni`. Para cambiar de proveedor, agregar un valor nuevo en `DNI_PROVIDER`, implementar su adaptador server-side y mantener la misma respuesta normalizada para el frontend.
