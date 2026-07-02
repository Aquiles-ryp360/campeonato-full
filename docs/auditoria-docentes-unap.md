# Auditoria tecnica controlada de Plana Docente UNA Puno

Fecha de auditoria: 2026-07-02
Proyecto: `campeonato-full`
Fuente revisada: `https://sictransparencia.unap.edu.pe/plana-docente`

## Resumen ejecutivo

La pagina publica de Plana Docente UNA Puno expone una tabla DataTables server-side con docentes por periodo academico. La fuente permite consultar listados filtrados por nombre o apellido usando el parametro global `search`, y cada fila publica devuelve `id`, `name`, `dni`, `condition` y `dedication`.

En las pruebas controladas no se confirmo busqueda por DNI. Un DNI exacto visible en la propia tabla devolvio cero resultados con busqueda global, y la busqueda por columna `dni` fue ignorada por el backend. Tampoco se encontro un codigo docente publico en HTML, JS ni JSON.

Conclusion practica: para `campeonato-full`, esta fuente puede usarse de forma limitada para busqueda asistida de docentes UNA por nombre/apellido y seleccion manual. No debe usarse como autollenado directo por DNI ni como fuente para docentes externos.

## Alcance y restricciones aplicadas

Solo se consultaron paginas y endpoints publicos observados por el frontend. No se probaron payloads ofensivos, no se enumeraron IDs, no se hizo crawler y no se guardaron respuestas completas con DNI. Las evidencias persistidas se sanitizaron con DNI enmascarado.

Se usaron solicitudes pequenas (`length=1` a `length=5`) y un numero total de requests menor a 30. Los IDs usados para el boton Info salieron de filas visibles en la primera pagina de resultados.

## Reconocimiento pasivo

HTML guardado localmente durante la auditoria:

- `/tmp/campeonato-docentes-audit/plana-docente.html`

Script principal identificado:

- `/js/areas/portal/teachingplan/index.js`
- Copia de auditoria: `/tmp/campeonato-docentes-audit/teachingplan-index.js`

Cadenas relevantes encontradas en el JS publico:

- Endpoint de lista: `/plana-docente/docente/lista`
- Endpoint de periodos: `/periodos/get?yearDifference=2`
- Parametros enviados por la tabla: `search` y `termId`
- Columnas de la tabla principal: `name`, `dni`, `condition`, `dedication`
- Boton Info: clase `btn-informacion`, usa `data-id`
- Endpoint Info principal: `/plana-docente/docente/cargar/informacion-laboral/{id}`
- Endpoint Info DataTable: `/plana-docente/docente/cargar/informacion-laboral/datatable`

No se encontro campo publico `codigo`, `code`, `codigo_docente`, `faculty`, `school`, `facultad`, `escuela` o `departamento_laboral` en la respuesta base.

## Periodos academicos

El `termId` no esta hardcodeado en la tabla. El frontend carga periodos desde:

```text
GET /periodos/get?yearDifference=2
```

Periodos observados:

| Periodo | termId | Seleccionado |
| --- | --- | --- |
| 2026-II | `08ded76d-7c7c-4bdc-82a1-c037081bca0e` | No |
| 2026-I | `08de416c-dede-444c-83dd-ff3ee6aedfdf` | Si |
| 2025-NIV | `08de5436-117c-44fa-85cc-83d1473c10e6` | No |
| 2025-II | `08ddb7e6-fea0-44ff-8603-52afa7027caf` | No |
| 2025-I | `08dd2fe6-c9cc-4565-8b60-6463cb78c577` | No |
| 2024-NIV | `08dd2e4e-b397-407e-84f6-5b71c84ac11f` | No |
| 2024-II | `08dcb15f-9547-4af7-8b67-0acd031f90e6` | No |
| 2024-I | `08dc2258-9bc3-45e5-8959-157a81a146e5` | No |

Recomendacion: resolver siempre el `termId` desde el endpoint de periodos o desde configuracion interna actualizable; no hardcodearlo en el frontend.

## Consulta base reproducida

Endpoint:

```text
GET https://sictransparencia.unap.edu.pe/plana-docente/docente/lista
```

Headers seguros usados:

```text
Accept: application/json, text/javascript, */*; q=0.01
X-Requested-With: XMLHttpRequest
Referer: https://sictransparencia.unap.edu.pe/plana-docente
User-Agent: campeonato-full-audit/1.0
```

Parametros importantes:

| Parametro | Uso |
| --- | --- |
| `draw` | contador DataTables |
| `start` | offset |
| `length` | cantidad de filas |
| `search` | busqueda global del frontend |
| `termId` | periodo academico seleccionado |
| `columns[0][data]` | `name` |
| `columns[1][data]` | `dni` |
| `columns[2][data]` | `condition` |
| `columns[3][data]` | `dedication` |

Resultado base:

| Dato | Resultado |
| --- | --- |
| HTTP | 200 |
| Content-Type | `application/json; charset=utf-8` |
| `recordsTotal` | 1511 |
| `recordsFiltered` | 1511 |
| Campos devueltos | `id`, `name`, `dni`, `condition`, `dedication` |

Ejemplo sanitizado de fila:

```json
{
  "id": "0f48b1ef-6d56-4aab-91ee-1dea720568ff",
  "name": "COA SERRANO PEGGY GRISELDA",
  "condition": "-",
  "dedication": "-",
  "dni": "******16"
}
```

Nota TLS: `curl` con validacion normal fallo por cadena de certificado local incompleta del portal. Para auditoria se uso `curl -k`. En produccion no se recomienda desactivar validacion TLS; se debe corregir la cadena CA del entorno o fallar con mensaje controlado.

## Busqueda global

Pruebas con `length=5`, `start=0` y `search=<valor>`.

| Prueba | Resultado | Interpretacion |
| --- | --- | --- |
| Apellido visible | `recordsFiltered=15` | Funciona por apellido/nombre parcial |
| Nombre visible | `recordsFiltered=1` | Funciona por nombre especifico |
| DNI exacto de ejemplo | `recordsFiltered=0` | No se confirmo busqueda por DNI |
| DNI parcial visible | `recordsFiltered=0` | No se confirmo busqueda parcial por DNI |
| Texto inexistente | `recordsFiltered=0` | Filtrado global activo |

El parametro `search` se comporta como busqueda global de la UI, pero en las pruebas parece orientado a nombres. No debe asumirse que busca DNI.

## Busqueda por columna

Se probaron parametros DataTables `columns[x][search][value]` con `regex=false`.

| Columna | Prueba | Resultado |
| --- | --- | --- |
| `dni` | DNI exacto visible | Ignorado, `recordsFiltered=1511` |
| `name` | Nombre visible | Ignorado, `recordsFiltered=1511` |
| `condition` | `NOMBRADO` | Ignorado, `recordsFiltered=1511` |
| `dedication` | `T.C.` | Ignorado, `recordsFiltered=1511` |

Conclusion: el backend no respeta busqueda por columna en este endpoint, al menos con los parametros DataTables publicos probados.

## Campos adicionales

Campos base confirmados por JSON publico:

- `id`
- `name`
- `dni`
- `condition`
- `dedication`

Campos adicionales revisados solo porque aparecen en JS publico del boton Info o tabla laboral:

- `category`
- `laborPosition`
- `department`

Al agregarlos como columnas adicionales en la consulta de lista, el endpoint siguio devolviendo solamente los campos base. No se confirmo exposicion de facultad, escuela, departamento laboral, categoria o codigo docente por el endpoint de lista.

No se probaron campos delicados como telefono, celular, direccion, domicilio, correo personal, cuenta, salario o sueldo.

## Boton Info

El boton Info de cada fila usa el `id` publico de la fila y llama:

```text
GET /plana-docente/docente/cargar/informacion-laboral/{id}
```

La respuesta principal fue JSON con campos:

- `fullName`
- `specialty`
- `institutionType`
- `institution`
- `expeditionDate`
- `country`
- `department`
- `province`
- `district`

Ejemplo sanitizado de datos utiles observados:

```json
{
  "fullName": "MERCADO PORTAL JORGE LUIS",
  "specialty": "Dr.En Ciencias (...)",
  "institutionType": "No Especifica",
  "institution": "UNIVERSIDAD NACIONAL DE SAN AGUSTIN",
  "country": "Peru",
  "department": "-",
  "province": "-",
  "district": "-"
}
```

Estos campos parecen corresponder a informacion academica o de especialidad, no a facultad, escuela o departamento laboral actual. El campo `department` no debe interpretarse como departamento academico sin confirmacion adicional.

El JS tambien declara un DataTable laboral por `GET`:

```text
GET /plana-docente/docente/cargar/informacion-laboral/datatable
```

Columnas declaradas en JS:

- `resolutionNumber`
- `scaleResolutionType`
- `beginDate`
- `endDate`
- `documentType`
- `laborPosition`
- `category`
- `observations`

En pruebas controladas con IDs visibles, este endpoint respondio HTTP 500. Por tanto no se considera fuente estable ni recomendable para autollenado.

## Matriz de capacidades

| Consulta | Funciona | Fuente | Riesgo | Recomendacion |
| --- | --- | --- | --- | --- |
| Buscar por DNI exacto | No confirmado | Lista DataTables | Alto si se asume que funciona | No usar para autollenado por DNI |
| Buscar por nombre | Si | `search` global | Medio por homonimos | Usar como busqueda asistida |
| Buscar por apellido | Si | `search` global | Medio por multiples resultados | Usar con seleccion manual |
| Buscar por codigo docente | No | No aparece campo publico | Alto si se inventa mapeo | No implementar |
| Obtener condicion | Si | Campo `condition` | Bajo/medio, dato personal laboral | Mostrar y guardar solo con consentimiento |
| Obtener dedicacion | Si | Campo `dedication` | Bajo/medio, dato personal laboral | Mostrar y guardar solo con consentimiento |
| Obtener facultad | No confirmado | No aparece en lista ni Info util | Alto por inferencia incorrecta | No usar |
| Obtener escuela/departamento | No confirmado | Info devuelve `department` geografico/no laboral | Alto por ambiguedad | No usar |
| Obtener informacion laboral por Info | Parcial/no estable | Info principal 200, datatable 500 | Medio | No usar para autollenado automatico |
| Obtener docentes externos | No | Plana Docente UNA | Alto por cobertura falsa | Usar registro manual o proveedor DNI |
| Obtener periodo academico | Si | `/periodos/get?yearDifference=2` | Bajo | Usar server-side/configurable |
| Obtener codigo docente publico | No | No aparece en HTML/JS/JSON | Alto | No usar |

## Riesgos

- Datos personales: el endpoint devuelve DNI en filas publicas. Aunque sea publico, debe tratarse como dato personal.
- Busqueda por DNI no confirmada: usarla en produccion generaria falsos negativos.
- Homonimos: la busqueda por nombre puede devolver varias coincidencias; requiere seleccion humana.
- Estabilidad: endpoints publicos pueden cambiar sin aviso.
- TLS: se observo problema de cadena de certificado al usar herramientas CLI con validacion estricta.
- Sobrecarga: no se debe consultar en cada tecla ni importar masivamente la plana.
- Ambiguedad de Info: `department` no representa necesariamente facultad/departamento academico.

## Recomendacion de integracion

Para docentes UNA, usar la fuente solo como buscador asistido por periodo y nombre/apellido:

1. El delegado selecciona o el sistema fija el periodo.
2. El usuario ingresa al menos 3 caracteres del nombre/apellido.
3. El backend consulta la fuente con `length<=5`.
4. El frontend muestra tarjetas con nombre, DNI enmascarado, condicion y dedicacion.
5. El delegado selecciona y confirma que corresponde al participante.
6. El sistema guarda datos completos solo al enviar la inscripcion y con consentimiento.

No usar la fuente para:

- Autollenado directo por DNI.
- Codigo docente.
- Facultad, escuela o departamento laboral.
- Docentes externos.
- Consultas masivas o crawler.

## Decision final

La fuente es legitima y tecnicamente util como apoyo de busqueda publica de docentes UNA por nombre/apellido. No es suficiente, con la evidencia actual, para verificacion por DNI ni para recuperar codigo docente o dependencia academica.
