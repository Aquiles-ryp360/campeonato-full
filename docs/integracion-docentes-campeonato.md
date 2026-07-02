# Integracion segura de docentes UNA en campeonato-full

Este documento propone el diseno de integracion despues de auditar la fuente publica de Plana Docente UNA Puno.

## Decision de diseno

Usar Plana Docente UNA solo para busqueda asistida por nombre/apellido y seleccion manual. No usarla como autollenado directo por DNI, porque la auditoria no confirmo que el endpoint publico filtre por DNI.

Para docentes externos, no usar Plana Docente UNA. El flujo debe ser manual o mediante un proveedor DNI configurado por el sistema.

## Flujo recomendado para docentes UNA

1. El usuario marca el participante como `Docente UNA`.
2. El sistema usa un periodo configurado, por ejemplo `2026-I`, o permite seleccionarlo si el campeonato lo requiere.
3. El usuario ingresa nombre o apellido, minimo 3 caracteres.
4. El usuario presiona `Buscar`; no se consulta mientras escribe.
5. El backend consulta la fuente publica con `length=5`.
6. El frontend muestra hasta 5 coincidencias.
7. Cada coincidencia muestra:
   - nombre completo
   - DNI enmascarado
   - condicion
   - dedicacion
   - periodo
8. El delegado selecciona el docente correcto.
9. El sistema copia al formulario solo los campos confirmados.
10. Si no aparece, se permite registro manual.

Campos recomendados para autollenado despues de seleccion:

- nombre completo
- DNI, solo despues de consentimiento/confirmacion
- condicion
- dedicacion
- periodo academico
- `sourceId` tecnico, solo server-side si se necesita trazabilidad

Campos no recomendados:

- codigo docente
- facultad
- escuela
- departamento academico
- telefono
- celular
- direccion
- domicilio
- correo personal
- cuenta
- salario o sueldo

## Flujo recomendado para docentes externos

1. El usuario marca el participante como `Docente externo` o `Invitado`.
2. El sistema no consulta Plana Docente UNA.
3. El usuario registra datos manualmente.
4. Si hay proveedor DNI configurado, puede usarse solo para nombres/apellidos y bajo las reglas de ese proveedor.
5. El sistema exige confirmacion del delegado antes de enviar.

## Endpoint interno propuesto

```text
POST /api/identity/unap-teacher
```

Entrada para busqueda recomendada:

```json
{
  "periodo": "2026-I",
  "query": "PEREZ"
}
```

Entrada opcional futura, no habilitada contra Plana Docente UNA hasta confirmar soporte real:

```json
{
  "periodo": "2026-I",
  "dni": "<DNI_8_DIGITOS>"
}
```

Reglas:

- `query` debe tener minimo 3 caracteres.
- `dni` debe tener exactamente 8 digitos si se habilita en el futuro.
- Si viene `dni`, no prometer busqueda UNA mientras el portal no lo soporte.
- Si `query` devuelve varias coincidencias, devolver maximo 5.
- Si `query` devuelve una coincidencia, igual pedir confirmacion visual.
- No consultar mientras el usuario escribe cada tecla.
- Consultar solo al presionar boton Buscar.
- Permitir registro manual siempre.

## Respuesta normalizada recomendada

Respuesta con coincidencias:

```json
{
  "ok": true,
  "source": "sictransparencia_unap_plana_docente",
  "mode": "name_search",
  "periodo": "2026-I",
  "results": [
    {
      "participantType": "TEACHER_UNAP",
      "periodo": "2026-I",
      "fullName": "NOMBRE DOCENTE",
      "dniMasked": "******78",
      "condition": "NOMBRADO",
      "dedication": "TIEMPO COMPLETO",
      "faculty": null,
      "school": null,
      "department": null,
      "teacherCode": null,
      "sourceId": "UUID"
    }
  ],
  "message": "Selecciona el docente correcto y verifica los datos antes de continuar."
}
```

Respuesta sin coincidencias:

```json
{
  "ok": false,
  "source": "sictransparencia_unap_plana_docente",
  "message": "No se encontro docente en la plana docente del periodo seleccionado. Puedes registrar manualmente."
}
```

Respuesta si se intenta DNI contra esta fuente antes de tener soporte confirmado:

```json
{
  "ok": false,
  "source": "sictransparencia_unap_plana_docente",
  "message": "La fuente publica auditada no permite validar docentes UNA por DNI de forma confiable. Busca por nombre o registra manualmente."
}
```

## Rate limit y cache

Rate limit recomendado:

- maximo 5 consultas por minuto por IP
- maximo 20 consultas por hora por usuario/delegado autenticado, si aplica
- bloqueo suave con mensaje claro y posibilidad de registro manual

Cache recomendado:

- clave: `periodo + query_normalizada`
- TTL: 7 dias
- guardar solo resultados necesarios
- no guardar listados completos en archivos publicos
- no precargar los 1511 docentes si no hay una necesidad operativa justificada

La mejor opcion inicial es consumir el endpoint en vivo desde el backend, con cache server-side por busqueda. Si el campeonato requiere alta disponibilidad, se puede cachear solo consultas ya realizadas o registros seleccionados/confirmados.

## Consentimiento

Texto corto recomendado:

> Autorizo el uso de los datos ingresados para la inscripcion y verificacion de participantes del campeonato. Entiendo que el sistema podra consultar fuentes publicas institucionales o servicios configurados unicamente para autocompletar y verificar nombres, apellidos, documento de identidad, condicion docente, dedicacion, escuela, facultad o dependencia cuando corresponda. Declaro que cuento con autorizacion de los participantes de mi equipo para registrar sus datos y que verificare que la informacion autocompletada sea correcta antes de enviarla.

Texto aclaratorio:

> No se solicitaran contrasenas institucionales. No se accedera a intranet, campus ni sistemas privados. No se realizaran busquedas masivas. Si el participante no aparece en la fuente publica, sus datos podran registrarse manualmente.

## Seguridad y privacidad

- Consultar siempre desde backend, nunca directo desde el navegador.
- No exponer el endpoint externo como proxy libre.
- Enmascarar DNI en resultados de busqueda.
- Guardar DNI completo solo al confirmar la inscripcion.
- Registrar fuente y fecha de consulta si se guarda trazabilidad.
- No guardar respuestas crudas completas del portal.
- No usar campos que no aparezcan publicamente o que sean sensibles.
- No inferir facultad/escuela/departamento desde nombres o especialidades.

## Fallback manual

El formulario debe permitir completar manualmente:

- nombres
- apellidos
- DNI
- condicion o rol, si corresponde
- dedicacion, si corresponde
- documento/ficha requerida por el campeonato

El fallback manual no debe sentirse como error. Debe presentarse como camino normal cuando la fuente publica no tiene datos, el docente pertenece a otra institucion o hay ambiguedad por homonimos.
