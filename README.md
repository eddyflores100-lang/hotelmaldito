<div align="center">

# 🎮 GameLab by AliceLabs

### Hotel ∞ Infinito — GDD completo + demo jugable 3D · Un proyecto de AliceLabs LLC

*GameLab by AliceLabs: sitio interactivo de investigación y diseño — radiografía del mercado Roblox 2025, tres conceptos jugables en nichos vacíos, GDD completo del proyecto estrella, roadmap de producción y código Luau de referencia.*

[![CI](https://github.com/eddyflores100-lang/hotelmaldito/actions/workflows/ci.yml/badge.svg)](https://github.com/eddyflores100-lang/hotelmaldito/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/eddyflores100-lang/hotelmaldito/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/eddyflores100-lang/hotelmaldito/actions/workflows/deploy-pages.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/Licencia-AliceLabs_LLC-C9A227)](LICENSE)

**🌐 Ver demo en vivo → [eddyflores100-lang.github.io/hotelmaldito](https://eddyflores100-lang.github.io/hotelmaldito/)**

</div>

---

## 🎮 JUEGO JUGABLE 3D — HOTEL ∞: GRAND HOTEL · NOCHE INFINITA (action-survival)

**El juego ya se juega dentro del sitio.** Pulsa **▶ JUGAR** (es la vista principal). v4.2 añade auto-ajuste de rendimiento y protección anti-bloqueo: **nada de cubos crudos** — avatares con extremidades de cápsula y cabezas esféricas, mobiliario biselado y torneado (camas con cojines, sofás con apoyacodos, vasijas y lámparas de tornamesa, bañeras curvas, cofres de tapa abombada) — y un **arsenal de 6 herramientas recogibles** con estadísticas propias. El hotel sigue siendo GRAND: **lobby con fuente dorada, 3 alas, 12 habitaciones enormes (91 m²), salas especiales con tesoros, 9 clases de monstruos y 5 construcciones defensivas**. Sobrevive 3 oleadas por noche, elige mejoras roguelite y sube — **los pisos nunca terminan**.

| | |
|---|---|
| ![Lobby con fuente](docs/screenshots/game-lobby.jpg) | ![Salón de baile](docs/screenshots/game-salon.jpg) |
| *Lobby ∞: escoba de cerdas al hombro, fuente torneada y minimapa en vivo* | *Salón de Baile: parqué, columnas, piano y oro (+150 pts)* |
| ![La Bóveda](docs/screenshots/game-boveda.jpg) | ![Noche en el ala oeste](docs/screenshots/game-noche.jpg) |
| *La BÓVEDA: doble cerradura, lingotes y gemas — jackpot 240+* | *Oleada nocturna: barrido de plumero entre 9 clases de anomalías* |
| ![Tu botones](docs/screenshots/game-avatar.jpg) | ![Móvil](docs/screenshots/game-mobile.jpg) |
| *Tu botones: cápsulas, cabeza esférica y escoba de cerdas de verdad* | *Joystick + 5 construcciones + chip de herramienta equipada* |

**El loop completo (90–120 s por piso):**

1. 🏗️ **FASE DE DÍA (60 s)** — explora con el **minimapa en vivo**: 8 habitaciones temáticas (dobles, king, baños con espejos, almacenes con cofres garantizados) + 4 salas especiales: **Salón de Baile** (piano y columnas), **Cocina** (platos rompibles), **Suite ∞** (jacuzzi y dosel) y la **BÓVEDA** con doble cerradura: lingotes, gemas y cofre de 240+ monedas. Rompe jarrones y platos para conseguir monedas extra. En cada piso hay **3 herramientas brillando** en salas lejanas: pasa por encima para equiparlas.
2. 🌙 **NOCHE — 3 OLEADAS** — **9 clases de anomalías**: Sombra, Maleta veloz, Altísimo, Fantasma que atraviesa muros, **Cucarachas en enjambres de 3**, **Camarista** que lanza botellas de lejía a distancia, **Gólem de equipaje** blindado que destroza barricadas, **Niño perdido** que se teletransporta y, cada 3 pisos, **EL GERENTE** con esbirras. Desde el piso 3 aparecen **ÉLITES dorados** con 1,9× de vida y botín extra.
3. 🔨 **5 CONSTRUCCIONES** — Barricada de maletas (25 🪙), Torreta automática (60 🪙), Botiquín (40 🪙), **Trampa de pinchos** (35 🪙, 12 usos) y **Velador Santo** (50 🪙, aura que ralentiza enemigos y te cura).
4. ⚔️ **COMBATE CON 6 HERRAMIENTAS** — empiezas con la **escoba de cerdas** y encuentras por el hotel (o te sueltan élites y el Gerente): **Plumero** rápido (13 dmg · 0,24 s), **Sartén** contundente (34 dmg · empuje ×1,7), **Bate** de alcance (27 dmg · ⇢2,5 · empuje ×2,1), **Hacha de bombero** brutal (44 dmg) y **Varita ∞** etérea (arco de 180°). Cada una con su malla estilizada, color de destellos y cadencia propia. Dash con invulnerabilidad (`Shift`), combos ×8, daño flotante, screen-shake y partículas octaédricas.
5. 📋 **MISIONES DINÁMICAS** — 3 activas por piso de un pool de 13: saquear la BÓVEDA, exterminar cucarachas, romper muebles, derrotar élites…
6. 🎴 **MEJORAS ROGUELITE** — al llegar las 6:00 AM elige 1 de 3 entre 12 mejoras y sube al siguiente piso procedural.

**Controles:** `WASD` mover · ratón cámara · `clic`/`J` golpear · `Shift` dash · `Espacio` saltar · `E` puertas/cofres/bóveda/ascensor · `1–5` construir · `Q` cancelar · `P` pausa. **Móvil:** joystick + botones + barra de construcción.

**Bajo el capó:** motor propio sobre [Three.js](https://threejs.org/) (~4.600 líneas de TypeScript en `src/game/`): generador de GRAND HOTEL con 3 alas, 12 habitaciones de 91 m² y 4 salas especiales (`world.ts`), kit de geometría estilizada — `RoundedBoxGeometry`, tornamesas y cápsulas — (`shapes.ts`), 6 herramientas con mallas y stats propios (`tools.ts`), 9 enemigos con IA de navegación por alas y rutas por puertas, ataques melee/rango y teletransporte (`enemy.ts`), 5 construcciones colocables con validación de rejilla (`builds.ts`), director de oleadas con jefes y esbirras, sistema de misiones por eventos (`missions.ts`), mejoras roguelite, minimapa en vivo, cámara 3ª persona con raycast anti-muros, iluminación día/noche dinámica, audio 100% sintetizado con WebAudio (sin assets) y récord en `localStorage`.

> La demo demuestra el loop de acción descrito en el GDD. El juego completo vive en Roblox Studio — el código Luau de referencia está en la vista CÓDIGO.

## 📖 Sobre el proyecto

**GameLab by AliceLabs** es el laboratorio de preproducción de AliceLabs LLC para crear juegos *únicos para niños y adolescentes en Roblox*. En lugar de copiar fórmulas de moda, este laboratorio analiza los datos reales del mercado (Q3–Q4 2025), identifica **nichos vacíos** y propone tres conceptos completos con su loop de juego, escenarios, monetización y referencias.

El concepto ganador — **Hotel ∞ Infinito**, terror cómico cooperativo con pisos procedurales infinitos — cuenta con un **GDD (Game Design Document) completo**: pilares de diseño, roles jugables, economía de propinas, generador de pisos, integración técnica en Roblox Studio y plan de live-ops.

> ⚠️ Proyecto conceptual no oficial, sin afiliación con Roblox Corporation. Cifras de mercado tomadas de reportes públicos (2025).

## 📸 Vista previa

| | |
|---|---|
| ![Landing del Game Lab](docs/screenshots/hero-1200x630.jpg) | ![Radiografía del mercado](docs/screenshots/mercado.jpg) |
| *Landing — «Tres juegos que aún no existen»* | *Radiografía del mercado con métricas animadas* |
| ![Ficha del concepto Hotel ∞ Infinito](docs/screenshots/gdd-full.jpg) | ![Vista de código Luau](docs/screenshots/code-full.jpg) |
| *GDD completo — Hotel ∞ Infinito* | *Referencia técnica Luau con resaltado propio* |

## ✨ Qué incluye

| Vista | Contenido |
|---|---|
| 🔬 **LAB** | Radiografía del mercado con métricas animadas, 5 insights de diseño, 3 conceptos con loop y escenarios, tabla comparativa y veredicto razonado |
| 🏨 **HOTEL ∞** | GDD completo: pilares, roles, economia de propinas, escenarios firma (Piscina Sin Fin, Piso Espejo, La Caldera), sistemas y UI |
| 🗺️ **PLAN** | Roadmap de 12 semanas en 4 fases: prototipo vertical → generador procedural → beta cerrada → lanzamiento y live-ops |
| 🎮 **JUGAR** | GRAND HOTEL jugable v4.1: hotel estilizado (cero cubos crudos), 6 herramientas recogibles, lobby + 3 alas + 12 habitaciones grandes, 4 salas especiales, Bóveda, 9 monstruos, 5 construcciones, oleadas, misiones, mejoras y pisos infinitos |
| 💻 **CÓDIGO** | Referencia técnica en Luau: arquitectura cliente/servidor, sistema de gráficos y patrón de generación procedural |

## 🧩 Los tres conceptos

| # | Concepto | Género | Nicho | Potencial viral |
|---|---|---|---|---|
| 01 | **Chatarra Cósmica** | Tycoon físico en gravedad cero | Vacío en Roblox | ● ● ○ |
| 02 | **Hotel ∞ Infinito** ⭐ | Terror cómico procedural co-op | Dores adultos → 13+ | ● ● ● |
| 03 | **Hormiguero: Guerra del Jardín** | Estrategia de colonias macro | Escala micro sin explotar | ● ● ○ |

**Veredicto del laboratorio:** *Hotel ∞ Infinito* — riesgo bajo con techo altísimo, contenido infinito por diseño (un piso nuevo cada 2 semanas sin mapear a mano) y encaje perfecto con la demográfica 13+ que Roblox está empujando.

## 🛠️ Stack tecnológico

| Tecnología | Uso |
|---|---|
| [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) | UI declarativa con tipado estricto |
| [Three.js](https://threejs.org/) | Motor 3D de la demo jugable (avatares, hotel, luces y sombras) |
| [Vite 6](https://vite.dev/) | Dev server y build de producción |
| [Tailwind CSS 4](https://tailwindcss.com/) | Sistema de diseño con tokens (`@theme`) |
| Lucide React | Iconografía |
| WebAudio API | Audio de la demo 100% sintetizado, sin assets |
| IntersectionObserver API | Animaciones scroll-reveal y contadores (sin dependencias externas) |
| CSS keyframes propios | Marquee, flotación, scan-sweep, reveals — respetando `prefers-reduced-motion` |

## 🚀 Empezar

### Requisitos

- [Node.js](https://nodejs.org/) ≥ 20 o [Bun](https://bun.sh/) ≥ 1.1

### Instalación

```bash
# Clona el repositorio
git clone https://github.com/eddyflores100-lang/hotelmaldito.git
cd hotelmaldito

# Instala dependencias
bun install        # o: npm install
```

### Desarrollo

```bash
bun run dev        # http://localhost:3000
```

### Producción

```bash
bun run build      # genera dist/ (usa BASE_PATH si despliegas en subcarpeta)
bun run preview    # sirve el build localmente
bun run typecheck  # verificación de tipos
```

## 📦 Despliegue

### GitHub Pages (automático)

El repo incluye un workflow que despliega a **GitHub Pages** en cada push a `main`:

1. Ve a **Settings → Pages** en tu repositorio.
2. En **Source**, selecciona **GitHub Actions**.
3. Haz push a `main` — el sitio quedará en `https://<usuario>.github.io/hotelmaldito/`.

El workflow compila con `BASE_PATH=/<repo>/` automáticamente, así que no hay que tocar nada.

### Otras plataformas (Vercel, Netlify…)

Build estático puro: comando `bun run build`, directorio de salida `dist/`, base `/`. Sin configuración extra.

## 🗂️ Estructura del proyecto

```
hotelmaldito/
├── .github/workflows/     # CI (typecheck+build) y deploy a Pages
├── public/                # favicon, robots.txt, og-image
├── src/
│   ├── components/        # Vistas: Gdd, Roadmap, Codebase + iconos SVG propios
│   ├── data/              # Contenido: concepts, gdd, roadmap, codebase (Luau)
│   ├── App.tsx            # Shell SPA: navegación LAB / HOTEL∞ / PLAN / CÓDIGO
│   ├── hooks.ts           # useInView, useCountUp
│   ├── index.css          # Tema Tailwind 4 + animaciones propias
│   └── main.tsx           # Entry point
├── index.html             # Meta SEO + Open Graph + fuentes
└── vite.config.js         # Base path configurable + preview
```

**Punto clave de la arquitectura:** todo el contenido (conceptos, GDD, roadmap, snippets) vive en `src/data/` como TypeScript tipado — editar el documento no toca ningún componente.

## 🤝 Contribuir

Las contribuciones son bienvenidas, especialmente al GDD y a los conceptos de juego:

1. Haz fork del repo y crea tu rama: `git checkout -b feature/nueva-idea`
2. Edita los datos en `src/data/` (tipados, autocompletado garantizado)
3. Verifica localmente: `bun run typecheck && bun run build`
4. Abre un Pull Request describiendo la mejora

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las convenciones de commits y estilo de código.

## 📄 Licencia

© 2026 **AliceLabs LLC**. Todos los derechos reservados — distribuido bajo la [Licencia AliceLabs LLC](LICENSE) (propietaria). Uso, copia o redistribución no autorizados prohibidos.

---

<div align="center">
<sub>GameLab by AliceLabs · © 2026 AliceLabs LLC · Hecho con 🧡 y mucho café de madrugada · turno de noche en el Hotel ∞</sub>
</div>
