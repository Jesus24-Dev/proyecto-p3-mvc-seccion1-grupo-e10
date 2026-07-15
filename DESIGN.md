---
name: Dr-Logistics CA
description: Panel de operaciones para una red courier venezolana, con disciplina de guía de despacho
colors:
  rojo-domesa: "#cf2338"
  rojo-lacre: "#9f1828"
  azul-despacho: "#0d2f57"
  azul-ruta: "#1d4e89"
  papel-manifiesto: "#fffdf8"
  crema-fondo: "#f4eee2"
  tinta: "#1b2840"
  tinta-suave: "#5c6b81"
  verde-entregado: "#18794e"
  rojo-alerta: "#b23434"
typography:
  display:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 1.8vw, 1.6rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.16em"
rounded:
  control: "8px"
  card: "12px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.rojo-domesa}"
    textColor: "#fff7ef"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.rojo-lacre}"
  button-secondary:
    backgroundColor: "{colors.azul-despacho}"
    textColor: "#fff7ef"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.76)"
    textColor: "{colors.azul-despacho}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.9)"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  nav-chip:
    backgroundColor: "rgba(255, 255, 255, 0.76)"
    textColor: "{colors.azul-despacho}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "42px"
  nav-chip-active:
    backgroundColor: "{colors.rojo-domesa}"
    textColor: "#fff8ef"
  pill-role:
    rounded: "{rounded.pill}"
    padding: "5px 12px"
---

# Design System: Dr-Logistics CA

## 1. Overview

**Creative North Star: "La Guía de Despacho"**

Todo el sistema se comporta como una guía de despacho courier bien impresa: papel cálido, tinta azul marino que carga la estructura, y un sello rojo que se estampa solo donde hay una decisión (la acción primaria, la ruta activa, el inicio de una sección). La densidad es de herramienta de trabajo: tablas legibles, formularios de una columna, jerarquía tipográfica que ordena sin gritar.

El sistema rechaza explícitamente la plantilla AI/SaaS (degradados morado-azul, rejillas de tarjetas idénticas, métricas-héroe), el gris corporativo sin marca y la informalidad de app de consumo. La familiaridad es una virtud: un administrador que conoce buenas herramientas debe confiar en cada control sin pensarlo.

**Key Characteristics:**
- Un solo acento: el rojo Domesa señala acción y estado activo, nunca decora.
- Papel cálido + tinta navy como base neutral con identidad propia.
- Numerales tabulares y reglas finas: la estructura codifica información.
- Radios contenidos (8/12px) y una sola sombra ambiental suave.

## 2. Colors

Paleta de manifiesto courier: papel cálido, tinta navy y un rojo de sello usado con avaricia.

### Primary
- **Rojo Domesa** (#cf2338): acción primaria, navegación activa, sello de sección y anillo de foco. Es el color de la marca courier; su escasez es su autoridad.
- **Rojo Lacre** (#9f1828): estado hover/pressed del rojo primario y texto de marca sobre fondos claros.

### Secondary
- **Azul Despacho** (#0d2f57): titulares, botón secundario, panel narrativo del login y tarjeta CTA de usuarios. Carga la estructura para que el rojo no tenga que hacerlo.
- **Azul Ruta** (#1d4e89): eyebrows y acentos informativos menores.

### Neutral
- **Papel Manifiesto** (#fffdf8): superficie de tarjetas y paneles.
- **Crema Fondo** (#f4eee2): fondo del body (degradado #f8f3e9 → #f1e9da) con una retícula de papel milimetrado casi imperceptible.
- **Tinta** (#1b2840): texto de cuerpo y datos.
- **Tinta Suave** (#5c6b81): texto secundario, cabeceras de tabla, copys de apoyo.
- **Verde Entregado** (#18794e): éxito, estado "Activa".
- **Rojo Alerta** (#b23434): errores y acciones destructivas. Distinto del rojo de marca a propósito.

### Named Rules
**The One Stamp Rule.** El rojo Domesa ocupa ≤10% de cualquier pantalla. Si dos elementos rojos compiten en un mismo bloque visual, uno está mal.

**The Two Reds Rule.** El rojo de marca (#cf2338) y el rojo de error (#b23434) nunca se intercambian: la marca invita, el error advierte.

## 3. Typography

**Display Font:** Aptos (con Segoe UI, system-ui, sans-serif de respaldo)
**Body Font:** la misma familia; una sola voz tipográfica
**Label/Mono Font:** Consolas (solo para IDs técnicos en tablas)

**Character:** Una sans humanista única en varios pesos: 700 ordena, 600 etiqueta, 400 narra. La personalidad sale de la escala y el espaciado, no de fuentes decorativas.

### Hierarchy
- **Display** (700, clamp(1.9rem, 3.2vw, 2.8rem), 1.15): título de página en hero de login y panel.
- **Headline** (700, clamp(1.3rem, 1.8vw, 1.6rem), 1.15): títulos de panel y sección, siempre en Azul Despacho.
- **Title** (700, 1.1rem): tarjetas CTA y asides de ayuda.
- **Body** (400, 1rem, 1.5): copys y celdas de tabla; máximo 65–75ch en prosa.
- **Label** (700, 0.72rem, +0.16em, MAYÚSCULAS): eyebrows de sección, cabeceras de tabla (+0.10em), etiquetas de estadística (+0.12em).
- **Datos** (700, 2.25rem, `font-variant-numeric: tabular-nums`): cifras de estadísticas.

### Named Rules
**The Tabular Rule.** Toda cifra que pueda cambiar (contadores, totales) usa numerales tabulares para que el layout no baile.

## 4. Elevation

Sistema casi plano con una sola sombra ambiental: las superficies descansan sobre el papel con un borde fino (`1px rgba(13,47,87,0.08)`) y una sombra suave de dos capas. La profundidad la comunican el borde y el contraste de superficie, no la sombra.

### Shadow Vocabulary
- **Ambiental** (`box-shadow: 0 1px 2px rgba(24,37,59,0.05), 0 10px 30px rgba(24,37,59,0.07)`): todas las tarjetas y paneles en reposo.
- **Acción primaria** (`0 6px 16px rgba(207,35,56,0.22)`): solo bajo botones primarios, como tinta que traspasa el papel.

### Named Rules
**The One Shadow Rule.** Una sola sombra ambiental para todas las superficies. Sombras nuevas requieren justificación de estado (hover, foco), nunca de decoración.

## 5. Components

### Buttons
- **Shape:** esquinas contenidas (8px), altura mínima 44px, peso 700.
- **Primary:** Rojo Domesa sobre texto crema (#fff7ef), padding 0 20px; hover → Rojo Lacre.
- **Secondary:** Azul Despacho sólido; hover → #123c6b.
- **Ghost:** borde fino navy translúcido sobre blanco al 76%; hover aclara a blanco pleno.
- **Focus:** anillo `outline: 2px solid #cf2338; outline-offset: 2px` en todos.

### Chips
- **Nav-chip:** píldora (999px) con borde fino, peso 600; la activa se rellena de Rojo Domesa con texto crema y peso 700.
- **Píldoras de rol/estado:** píldora pequeña (0.72rem, MAYÚSCULAS, +0.04em) con fondo al 12% del color semántico y texto al 100%.

### Cards / Containers
- **Corner Style:** 12px en tarjetas y paneles.
- **Background:** Papel Manifiesto; paneles oscuros (login, CTA) usan Azul Despacho o Rojo Domesa sólidos.
- **Shadow Strategy:** la ambiental única (ver Elevation).
- **Border:** siempre 1px `rgba(13,47,87,0.08)`.
- **Internal Padding:** 20–40px según jerarquía.

### Inputs / Fields
- **Style:** borde `1px rgba(13,47,87,0.14)`, fondo blanco al 90%, radio 8px, padding 12px 14px.
- **Focus:** borde Rojo Domesa + halo `0 0 0 3px rgba(207,35,56,0.16)`.
- **Labels:** 0.9rem, peso 600, en Tinta.

### Navigation
- Chips de ruta en el hero del panel; la ruta activa es el único relleno rojo de la zona. Sesión activa en banda propia con el correo del usuario y su rol en píldora.

### El Sello de Sección (signature)
Cada eyebrow lleva una regla roja de 18×2px antes del texto en mayúsculas trackeadas: el "sello" que marca dónde empieza un campo del manifiesto. Es el elemento de firma del sistema; no se decora más allá de él.

## 6. Do's and Don'ts

### Do:
- **Do** gastar el rojo (#cf2338) solo en acción primaria, ruta activa, sello de sección y foco.
- **Do** usar numerales tabulares en toda cifra dinámica.
- **Do** mantener una sola sombra ambiental y bordes de 1px en todas las superficies.
- **Do** escribir copys operativos en español venezolano del mundo courier (agencias, responsables, guías).
- **Do** cumplir WCAG 2.1 AA: 4.5:1 en texto de cuerpo, foco visible, `prefers-reduced-motion`.

### Don't:
- **Don't** usar la plantilla AI/SaaS genérica: degradados morado-azul, Inter en todo, rejillas de tarjetas idénticas ni métricas-héroe con acento degradado (anti-referencia de PRODUCT.md).
- **Don't** caer en el gris corporativo sin vida estilo SAP/Oracle antiguo (anti-referencia de PRODUCT.md).
- **Don't** deslizarse a la informalidad de app de consumo: nada de pasteles, emojis ni todo-redondeado (anti-referencia de PRODUCT.md).
- **Don't** usar `border-left` mayor a 1px como franja decorativa en tarjetas o alertas.
- **Don't** usar texto degradado (`background-clip: text`) ni glassmorphism decorativo.
- **Don't** mezclar el rojo de marca con el rojo de error; cada uno tiene su trabajo.
