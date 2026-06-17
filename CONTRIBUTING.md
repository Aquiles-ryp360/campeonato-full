# Guía de contribución

Gracias por tu interés en contribuir a **Campeonato**. Este documento describe el flujo de trabajo y las buenas prácticas que seguimos en el proyecto.

---

## 📦 Flujo de trabajo (Git Flow)

Usamos una adaptación simplificada de **Git Flow**:

```
main ──── merge ─────────────────────────►
            ▲
            │
develop ──── merge ──────────────────────► develop
  ▲          ▲
  │          │
feature/     fix/
```

1. Crea tus ramas a partir de `develop`.
2. Cuando termines, abre un **Pull Request** hacia `develop`.
3. Después de revisión, se fusiona a `develop`.
4. Periódicamente `develop` se fusiona a `main` para liberar una versión.

> **Nota:** Nunca trabajes directamente sobre `main` o `develop`.

---

## ✍️ Convención de commits

Usamos **Conventional Commits** para mantener un historial legible y generar changelogs automáticamente.

```
<tipo>(<alcance opcional>): <descripción>

[opcional: cuerpo]

[opcional: footer]
```

### Tipos permitidos

| Tipo       | Uso                                              |
| ---------- | ------------------------------------------------ |
| `feat`     | Nueva funcionalidad                              |
| `fix`      | Corrección de bug                                |
| `chore`    | Cambios en herramientas, config, CI/CD           |
| `docs`     | Documentación                                    |
| `refactor` | Cambio de código que no agrega funcionalidad ni corrige bugs |
| `test`     | Agregar o modificar tests                        |
| `style`    | Cambios de formato (espacios, comas, etc.)       |

### Ejemplos

```
feat(api): agregar endpoint de registro de usuarios
fix(backend): corregir validación de email en login
docs(readme): actualizar instrucciones de instalación
refactor(auth): simplificar lógica de tokens
chore(deps): actualizar Prisma a v5.18
```

---

## 🌿 Nomenclatura de ramas

| Tipo       | Formato                              | Ejemplo                        |
| ---------- | ------------------------------------ | ------------------------------ |
| Feature    | `feature/<nombre-corto>`             | `feature/login-social`         |
| Fix        | `fix/<nombre-del-bug>`               | `fix/error-login-email`        |
| Chore      | `chore/<descripción>`                | `chore/actualizar-deps`        |
| Docs       | `docs/<descripción>`                 | `docs/guia-despliegue`         |

Usa **kebab-case** y mantén los nombres descriptivos pero concisos.

---

## ✅ Checklist para Pull Requests

Antes de abrir un PR, verifica que:

- [ ] El código sigue los estándares del proyecto (ESLint + Prettier).
- [ ] La comprobación de tipos (`npm run typecheck`) pasa sin errores.
- [ ] Las pruebas pasan (`npm test`).
- [ ] El build se completa sin advertencias (`npm run build`).
- [ ] Los commits siguen la convención [Conventional Commits](#convención-de-commits).
- [ ] La rama está actualizada con `develop` (sin conflictos).
- [ ] Se agregaron tests para nueva funcionalidad (si aplica).
- [ ] La documentación se actualizó (si aplica).

---

## 🔍 Proceso de revisión

1. Cualquier miembro del equipo puede revisar un PR abierto.
2. Se requiere al menos **una aprobación** para fusionar.
3. Los cambios solicitados deben resolverse antes de fusionar.
4. El autor del PR es responsable de mantenerlo actualizado con `develop`.
5. Una vez aprobado, el PR se fusiona usando **Squash & Merge** para mantener un historial limpio.

---

## 🛠️ Configuración del entorno de desarrollo

Sigue estos pasos para preparar tu entorno local:

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/campeonato.git
   cd campeonato
   ```

2. **Ejecutar el setup**
   ```bash
   bash scripts/setup.sh --seed
   ```

   Esto instalará dependencias, configurará las variables de entorno, ejecutará migraciones y sembrará datos de ejemplo.

3. **Iniciar los servidores de desarrollo**
   ```bash
   # Backend (API)
   cd backend && npm run start:dev

   # Frontend (web)
   cd frontend && npm run dev
   ```

4. **Variables de entorno**

   Copia `.env.example` a `.env` y ajusta los valores según sea necesario. El archivo `.env.example` contiene valores por defecto funcionales para desarrollo local.

5. **Docker (opcional)**

   Si prefieres usar Docker:
   ```bash
   docker compose up -d
   ```

---

## 📚 Recursos adicionales

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)

---

¿Dudas? Abre un issue o pregunta en el canal del equipo. ¡Gracias por contribuir! 🎉
