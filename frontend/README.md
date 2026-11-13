# pluvIA · Frontend (Coladera Inteligente)

Dashboard web en **React + Vite** del proyecto IoT *Coladera Inteligente* (TC1004B.504, Tec de Monterrey).
Lee la base de datos de **Supabase** y muestra en tiempo real el estado de cada coladera: obstrucción,
sensores, alertas y limpiezas automáticas.

> Mientras la base de datos no esté lista, la app funciona con **datos de demostración** que usan
> exactamente las mismas 8 tablas y columnas del diccionario de datos, e incluso simulan telemetría en vivo.

## Cómo correrlo

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

- `npm run build` genera la versión final en `dist/` (para subirla a Vercel, Netlify, etc.).

## Diseño

Concepto **señalización vial + ficha técnica**: concreto, asfalto y amarillo vial (señal preventiva), con el
azul del logo (señal informativa) para los datos de agua. Tipografías: *Barlow Condensed* (inspirada en
letreros de carretera), *IBM Plex Sans/Mono* y *Caveat* para las notas a mano. Los colores están en
`src/styles/base.css` como variables (`--signal`, `--accent`, etc.).

## Páginas

| Ruta | Qué muestra | Requerimiento |
|---|---|---|
| `/` | Portada del proyecto: problema, cómo funciona, arquitectura, hardware, modelo de datos (con número de registros por tabla) y equipo | — |
| `/panel` | KPIs, tarjeta por coladera (% de obstrucción, lecturas, mini gráfica 24 h), pronóstico de llenado, gráfica de obstrucción 24 h, microclima, alertas y limpiezas recientes | RF03, RNF01 |
| `/panel/coladeras/:id` | Ilustración animada de la coladera dibujada con los datos reales, estado de seguridad del PIR, 5 sensores, gráficas por variable (6 h / 24 h / 7 d), **lluvia vs. basura**, componentes y actividad | RF03, RF04 |
| `/panel/alertas` | Alertas con filtros, gráfica por día, tiempo de atención y exportación CSV | RF05 |
| `/panel/limpiezas` | Activaciones del rastrillo, pospuestas por PIR, tasa de éxito, duración | RF04, RF05 |
| `/panel/historial` | Todas las mediciones paginadas con filtros (coladera, variable, calidad, fechas) y CSV | RF03, RNF02 |

## Conectar con Supabase

1. Copia `.env.example` como `.env` y pega los datos de **Supabase → Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   (La *anon key* es pública; **nunca** pongas la `service_role` key en el frontend.)
2. Reinicia `npm run dev`. En la barra lateral debe decir **Supabase** en vez de *Datos de demostración*.
3. Si sale un aviso rojo de error, revisa lo siguiente con quien hizo la base de datos.

### Lo que hay que confirmar con quien hizo la BD

- **Nombres de las tablas** → `src/config/db.js` (`TABLAS`). Por defecto están como en el diagrama
  (`"Coladera"`, `"Medicion"`, …). Si en Supabase están en minúsculas, cámbialos ahí y listo.
- **Valores de texto** → `src/config/db.js` (`VALORES`): qué texto usan para una lectura válida en
  `calidad_dato`, una alerta abierta en `estado_alerta`, una limpieza exitosa en `resultado`, etc.
- **Nombres de variables** en `TipoVariable.nombre_variable`: la app reconoce cualquier texto que contenga
  `dist`, `temp`, `hum`, `luz`/`lum` y `pres`/`mov`/`pir`.
- **Permisos de lectura (RLS)**. Si RLS está activado, la anon key necesita poder leer. En el SQL Editor:
  ```sql
  -- repetir para cada tabla
  create policy "lectura dashboard" on "Medicion" for select to anon using (true);
  ```
- **Tiempo real (opcional, recomendado)**. Para que el panel se actualice solo (RNF01):
  ```sql
  alter publication supabase_realtime
    add table "Medicion", "Alerta", "AccionLimpieza", "Actuador", "Dispositivo", "Coladera";
  ```
  Sin esto la app igual funciona: vuelve a consultar cada 15 s.
- **Zona horaria**: si `fecha_hora` es `timestamp` (sin zona), la app asume que está en UTC, que es lo que
  guarda `CURRENT_TIMESTAMP` en Supabase, y la muestra en hora local.

## Cómo está organizado

```
src/
├── config/db.js            ← nombres de tablas y valores de la BD (lo único que quizá tengas que cambiar)
├── lib/supabase.js         ← cliente de Supabase (lee el .env)
├── services/
│   ├── api.js              ← TODAS las consultas pasan por aquí (Supabase o demo)
│   ├── DatosContext.jsx    ← carga datos, escucha tiempo real y calcula el estado de cada coladera
│   ├── useDatos.js         ← hook para usar los datos en cualquier componente
│   └── mockData.js         ← base de datos de demostración + simulador
├── utils/
│   ├── dominio.js          ← % de obstrucción (atributo derivado), nivel de riesgo, variables
│   ├── reglas.js           ← lectura válida, alerta abierta, limpieza exitosa
│   └── format.js           ← fechas, números, CSV
├── components/             ← Layout, tarjetas, gráficas, ilustración de la coladera
│   ├── Logo.jsx            ← logo (archivos en public/logo-pluvia*.png)
│   └── landing.jsx         ← piezas de la portada: ciclo interactivo, mapa, Cerro de la Silla
└── pages/                  ← Inicio, Panel, ColaderaDetalle, Alertas, Limpiezas, Historial
```

**Cálculos que hace el frontend**

- **% de obstrucción** = `(distancia_referencia_cm − distancia) / distancia_referencia_cm × 100`.
- **Riesgo**: *crítico* si `distancia ≤ umbral_obstruccion_cm`; *precaución* si está en el 40 % más cercano
  al umbral; *sin señal* si no hay lecturas en 30 min.
- **Pronóstico**: regresión lineal de las lecturas del ultrasónico de las últimas 3 h (después de la
  última limpieza) para estimar cuándo llegará al umbral.
- **RNF02**: las mediciones cuyo `calidad_dato` no es válido se marcan y no cuentan en indicadores ni gráficas.

## Modo demostración y simulador

Sin `.env` (o con `VITE_USE_MOCK=true`) se usan datos de demo: 6 coladeras de Monterrey, 7 días de historial
con tormentas, limpiezas, bloqueos por PIR y lecturas inválidas. Cada 5 s llegan lecturas "en vivo".

El botón **Simulador** (arriba a la derecha) sirve para la presentación:
- **Tapar con basura** → la coladera pasa a crítica y el rastrillo se activa solo.
- **Persona cerca (20 s)** → el PIR detecta presencia; si la tapas en ese momento, la limpieza se pospone.
- **Tormenta intensa** → sube la humedad y la basura se acumula más rápido.

Al abrir la página, la coladera `CI-MTY-001` empieza en estado crítico con una persona cerca; unos
30 s después el PIR queda libre y se ve la limpieza automática completa.
