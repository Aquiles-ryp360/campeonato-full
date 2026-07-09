# Guia de grabacion - Capacitacion de arbitros

Esta guia sirve para grabar un tutorial corto del flujo de arbitraje en vivo usando el campeonato de practica.

## Datos del campeonato

- Campeonato: Capacitacion Arbitros - 12 Equipos
- Slug publico: `/c/capacitacion-arbitros-12-equipos`
- Fecha oficial de practica: jueves 09 de julio de 2026
- Inicio: 08:00 America/Lima
- Fin estimado: 11:25 America/Lima
- Canchas: Cancha Capacitacion A y Cancha Capacitacion B
- Formato: eliminacion directa con tercer puesto
- Objetivo: practicar inicio de partido, goles, tarjetas, descanso, segundo tiempo, penales, envio de resultado y avance automatico en llaves.

## Fixture base para mostrar en video

| Hora | Cancha A | Cancha B |
| --- | --- | --- |
| 08:00 | P1 | P2 |
| 08:35 | P3 | P4 |
| 09:10 | C1 | C2 |
| 09:45 | C3 | C4 |
| 10:20 | S1 | S2 |
| 10:55 | Final | Tercer lugar |

## Preparacion antes de grabar

1. Abrir la pagina publica y mostrar el fixture:
   `https://campeonato-full.vercel.app/c/capacitacion-arbitros-12-equipos/fixture`
2. Ingresar con un correo de arbitro asignado.
3. Verificar que en `/arbitro` aparezcan los partidos de capacitacion.
4. Elegir un partido programado que tenga equipos completos.
5. Tener otra pestana abierta en el fixture publico para mostrar como se actualiza el resultado.

## Guion sugerido para la grabacion

1. Presentacion

   Mostrar la pagina publica del campeonato y decir:
   "Este es el campeonato de capacitacion para arbitros. Aqui practicamos el flujo completo antes de usarlo en un partido real."

2. Ingreso del arbitro

   Entrar a `/arbitro` y mostrar:
   - correo asignado;
   - lista de partidos;
   - fecha, cancha y campeonato;
   - boton `Partido en vivo`.

3. Inicio del partido

   Abrir un partido y presionar `Iniciar partido`.
   Explicar que el cronometro, marcador y acciones quedan controlados por el arbitro asignado.

4. Registro de eventos

   Grabar estas acciones:
   - gol del equipo local;
   - gol del equipo visitante;
   - tarjeta amarilla;
   - tarjeta roja;
   - observacion simple si corresponde;
   - anulacion del ultimo evento para mostrar correccion rapida.

5. Descanso y segundo tiempo

   Presionar la accion principal para terminar primer tiempo, luego iniciar segundo tiempo.
   Explicar que el sistema mantiene el historial y el marcador.

6. Cierre del partido

   Terminar el partido.
   Si hay empate en eliminacion directa, mostrar `Ir a penales`, registrar penales y finalizar la tanda.
   Si no hay empate, enviar el resultado directamente.

7. Resultado publico y llaves

   Volver al fixture publico y mostrar:
   - marcador final;
   - estado `Resultado oficial`;
   - ganador avanzando a la siguiente llave.

8. Revision admin opcional

   Entrar al panel admin en `/admin/resultados` y mostrar que el resultado queda visible para correccion o revision si hubiera reclamo.

## Toma corta recomendada

- Duracion ideal: 4 a 6 minutos.
- Pantalla: grabar en 90% o 100% de zoom.
- No mostrar `.env.local`, claves, tokens ni consola con credenciales.
- Usar un partido de practica, no un partido real del campeonato.
- Si se comete un error durante la grabacion, usar `Anular ultimo evento` y explicar que queda como correccion controlada.

## Frase de cierre

"Con este flujo el arbitro registra el partido en vivo, el resultado se publica como oficial y las llaves avanzan automaticamente."
