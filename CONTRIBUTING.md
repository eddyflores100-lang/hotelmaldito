# Guía de contribución

Gracias por tu interés en **Roblox Game Lab**. Este documento define las normas para proponer cambios al GDD, a los conceptos de juego o al sitio.

## 🧭 Filosofía del contenido

Todo lo que entra en este repo debe pasar el filtro del laboratorio:

- **Nicho real** — el concepto no puede copiar un juego top existente; debe cubrir un hueco demostrable.
- **Loop de 90 segundos** — cada mecánica propuesta debe encajar en un ciclo de recompensa corto.
- **Apto 12+** — terror cómico, nada explícito; en este hotel nadie muere, te «despiden».
- **Datos citados** — las cifras de mercado llevan fuente y periodo (ej.: «Q3 2025»).

## 📁 Dónde tocar

| Quieres… | Edita |
|---|---|
| Añadir un concepto de juego | `src/data/concepts.ts` (tipo `GameConcept`) |
| Ampliar el GDD | `src/data/gdd.ts` |
| Ajustar el plan de producción | `src/data/roadmap.ts` |
| Añadir código de referencia | `src/data/code-*.ts` (con tokenizador Luau incluido) |
| Estilo visual | `src/index.css` (tokens del tema) |

Todo el contenido es TypeScript tipado: el autocompletado te guiará y el typecheck detectará errores antes del build.

## 🔄 Flujo de trabajo

1. **Fork + rama**: `git checkout -b feature/mi-mejora` (nombres en kebab-case).
2. **Commits** con [Conventional Commits](https://www.conventionalcommits.org/es/):
   - `docs:` contenido del GDD/roadmap/conceptos
   - `feat:` funcionalidad del sitio
   - `fix:` correcciones
   - `style:` visual sin cambio de contenido
   - `chore:` build, CI, deps
3. **Antes del PR** verifica en local:
   ```bash
   bun run typecheck
   bun run build
   ```
4. **PR** con descripción clara: qué cambia y por qué. La CI debe pasar en verde.

## 🎨 Convenciones de código

- TypeScript estricto, sin `any` innecesarios.
- Componentes como funciones; estado local con hooks (`useInView`, `useCountUp` ya disponibles).
- Animaciones siempre con fallback en `@media (prefers-reduced-motion: reduce)`.
- Español para el contenido, inglés para identificadores de código.

## 💡 ¿Ideas de juego?

Abre primero un **Issue** con el formato: título del concepto, género, nicho que cubre, loop resumido y por qué es único. Lo valoramos antes de escribir el GDD completo.
