# Consulta nacional de DNI con proxy seguro

Proveedor configurado para Vercel: `DNI_PROXY_URL`
Endpoint externo usado por backend: `POST /dni`
Endpoint interno del proyecto: `POST /api/identity/dni`

## Variables de entorno

```env
DNI_LOOKUP_ENABLED=true
DNI_PROXY_URL=https://server-juliaca.tailb6baea.ts.net
DNI_PROXY_SECRET=
DNI_PROXY_TIMEOUT_MS=8000
DNI_LOOKUP_CACHE_TTL_DAYS=30
DNI_LOOKUP_RATE_LIMIT_PER_MINUTE=5
```

`DNI_PROXY_SECRET` debe existir solo en `.env.local`, Vercel o el entorno seguro del servidor. No debe ser `NEXT_PUBLIC_`, no debe imprimirse en logs y no debe enviarse al navegador.

## Script de prueba

```bash
node scripts/test_dni_proxy.js <DNI_8_DIGITOS>
```

El script prueba el endpoint interno de la app (`/api/identity/dni`) por POST. No necesita conocer el secreto del proxy; el secreto lo usa el proceso Next.js server-side.

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

- El frontend llama solo a `/api/identity/dni`.
- El backend de Vercel llama a `${DNI_PROXY_URL}/dni` por HTTPS.
- El backend usa `X-Proxy-Secret`; el navegador no recibe ese header ni el secreto.
- La API key real del proveedor nacional no vive en Vercel.
- No se consulta por GET interno.
- No se consulta mientras el usuario escribe.
- El backend valida exactamente 8 dígitos.
- Rate limit: 5 consultas por minuto por IP.
- Caché en memoria por hash SHA-256 del DNI, TTL 30 días.
- No se imprime la respuesta cruda del proveedor.
- El registro manual sigue disponible si falla la consulta.

## Errores normalizados

- `400`: DNI inválido.
- `401`: `Consulta DNI no autorizada`.
- `404`: `DNI no encontrado`.
- `429`: `Límite de consultas alcanzado`.
- `503`: `Servicio DNI no disponible`.
- `504`: `Tiempo de espera agotado`.
