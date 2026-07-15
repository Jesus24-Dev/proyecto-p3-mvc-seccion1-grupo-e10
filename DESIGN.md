---
name: Dr-Logistics CA
description: Panel de operaciones courier con la limpieza de un producto de Google y el rojo Domesa como única voz de acción
colors:
  rojo-domesa: "oklch(0.55 0.2 21)"
  blanco-superficie: "oklch(1 0 0)"
  gris-panel: "oklch(0.985 0.003 260)"
  gris-borde: "oklch(0.922 0.003 260)"
  tinta: "oklch(0.145 0 0)"
  tinta-suave: "oklch(0.5 0.01 260)"
  rojo-alerta: "oklch(0.505 0.14 25)"
  verde-exito: "#d1fae5"
  ambar-pendiente: "#fef3c7"
typography:
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
rounded:
  control: "0.625rem"
  card: "0.875rem"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.rojo-domesa}"
    textColor: "oklch(0.985 0 0)"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.blanco-superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "0.5rem"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "oklch(0.94 0.02 21)"
    textColor: "oklch(0.35 0.12 21)"
    rounded: "{rounded.pill}"
    height: "40px"
  badge:
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: Dr-Logistics CA

## 1. Overview

**Creative North Star: "El Mostrador Despejado"**

El panel se comporta como el mostrador de una oficina courier bien administrada: superficie blanca, todo a la vista, nada de ruido, y un solo sello rojo que marca dónde actuar. La referencia es la limpieza de los productos de Google (Workspace/Drive): barra lateral gris claro, contenido blanco, bordes finísimos, botones en píldora y aire generoso — con el rojo Domesa ocupando el lugar del azul de Google, para que la identidad courier venezolana no se pierda en la neutralidad.

Se construye sobre shadcn/ui (variante Base UI) + Tailwind v4: los componentes viven en `frontend/src/components/ui/` y los tokens en `frontend/src/index.css` como variables OKLCH. El sistema rechaza la plantilla AI/SaaS (degradados, tarjetas idénticas, métricas-héroe decoradas), el gris corporativo sin marca y la informalidad de consumo.

**Key Characteristics:**
- Superficie blanca + barra lateral gris claro: la segunda capa neutral separa navegación de contenido.
- El rojo Domesa (`--primary`) solo en acción primaria, navegación activa, foco y el sello de marca.
- Botones en píldora (rounded-full): la firma visual heredada del lenguaje Google.
- Una sola familia (Geist) en pesos 400/500/600; los números dinámicos siempre tabulares.

## 2. Colors

Neutrales casi puros con un grado de frialdad (hue 260) y un solo acento saturado.

### Primary
- **Rojo Domesa** (oklch(0.55 0.2 21), ≈#cf2338): botón primario, ítem de navegación activo (fondo al 6-10%), anillo de foco, sello del logo. Su escasez es su autoridad.

### Neutral
- **Blanco Superficie** (oklch(1 0 0)): fondo del contenido y las tarjetas.
- **Gris Panel** (oklch(0.985 0.003 260)): barra lateral y fondos de apoyo (`--sidebar`, `--muted`).
- **Gris Borde** (oklch(0.922 0.003 260)): todos los bordes; un solo grosor (1px).
- **Tinta** (oklch(0.145 0 0)): texto principal.
- **Tinta Suave** (oklch(0.5 0.01 260)): descripciones, metadatos, cabeceras de tabla.
- **Rojo Alerta** (oklch(0.505 0.14 25)): errores y acciones destructivas; distinto del rojo de marca a propósito.
- **Semánticos de estado**: esmeralda claro (éxito/activa/completada), ámbar claro (estados intermedios), rojo alerta al 10% (fallos), gris (neutro) — siempre como píldora con etiqueta de texto, nunca color solo.

### Named Rules
**The One Stamp Rule.** El rojo Domesa ocupa ≤10% de cualquier pantalla. Si dos elementos rojos compiten en un mismo bloque, uno está mal.

**The Two Reds Rule.** El rojo de marca y el rojo de error nunca se intercambian: la marca invita, el error advierte.

## 3. Typography

**Display Font:** Geist Variable (sans, con respaldo del sistema)
**Body Font:** la misma familia; una sola voz
**Label/Mono Font:** monoespaciada solo para IDs técnicos en tablas

**Character:** Sans geométrica-humanista en escala contenida de producto (ratio ~1.2): 500 con tracking -0.025em ordena, 400 narra. Nada de tamaños fluidos: el panel se usa a DPI constante.

### Hierarchy
- **Headline** (500, 1.5rem): título de página en el PageHeader.
- **Title** (500, 1.125rem): títulos de tarjeta y diálogo.
- **Body** (400, 0.875rem, 1.5): copys, celdas, formularios.
- **Label** (500, 0.875rem): etiquetas de campo; cabeceras de tabla en tinta suave.
- **Data** (500, 1.875rem, tabular-nums): cifras de los indicadores del dashboard.

### Named Rules
**The Tabular Rule.** Toda cifra que pueda cambiar usa `tabular-nums` para que el layout no baile.

## 4. Elevation

Sistema plano con una sombra mínima: las tarjetas descansan con borde de 1px y la sombra `shadow-sm` de shadcn. La jerarquía la dan el borde y las dos capas neutrales (gris panel / blanco), no la sombra. Los diálogos y menús usan la elevación por anillo (`ring-1 ring-foreground/10`) + sombra media de los componentes shadcn.

### Named Rules
**The Flat Counter Rule.** Ninguna superficie en reposo lleva sombra más fuerte que `shadow-sm`; la profundidad extra queda reservada a capas flotantes (diálogos, menús, popovers).

## 5. Components

### Buttons
- **Shape:** píldora completa (999px), altura 36px (44px en `lg`), peso 500.
- **Primary:** Rojo Domesa con texto casi blanco; hover aclara al 80%.
- **Outline / Ghost:** borde gris / transparente, texto tinta; hover a `--muted`.
- **Destructive:** tinte rojo alerta al 10% con texto rojo; se usa en confirmaciones de borrado.
- **Focus:** anillo `ring-3` en el color del anillo (rojo) en todos.

### Chips
- **Píldoras de estado/rol:** Badge en píldora, fondo semántico claro + texto oscuro del mismo tono, etiqueta siempre textual (Administrador, Activa, Completada…).

### Cards / Containers
- **Corner Style:** 14px (`rounded-xl` del tema).
- **Background:** blanco; **Border:** 1px gris borde; **Shadow:** `shadow-sm`.
- **Internal Padding:** 24px (compacto 20px); las tarjetas de tabla van a sangre (`px-0`) con la primera columna a 24px.

### Inputs / Fields
- **Style:** borde 1px, fondo transparente, radio 8px, altura 32-36px.
- **Focus:** borde + anillo rojo al 50%.
- **Error:** borde y anillo en rojo alerta (`aria-invalid`).

### Navigation
- Barra lateral fija de 240px en gris panel con ítems en píldora: inactivo texto suave, activo fondo rojo al 6% + texto rojo oscuro + peso 600. En móvil la misma lista vive en un Sheet lateral. Barra superior con título de página y menú de cuenta (avatar circular con iniciales sobre rojo al 10%).

### El Sello de Marca (signature)
El logo es una caja de paquete blanca sobre un cuadrado rojo redondeado; el mismo motivo se repite en el favicon y el login. Es el único elemento decorativo del sistema.

## 6. Do's and Don'ts

### Do:
- **Do** spend the red only on the primary action, active navigation, focus rings, and the brand mark.
- **Do** build every surface from tokens (`bg-background`, `text-muted-foreground`, `border-border`) — never loose hex values inside pages.
- **Do** give every non-happy state a designed treatment: skeletons while loading, EmptyState with icon and action, Alert carrying the real API message.
- **Do** use AlertDialog (never Dialog) to confirm destructive actions.
- **Do** keep `tabular-nums` on every dynamic figure and amount.

### Don't:
- **Don't** use the generic AI/SaaS template: purple-blue gradients, identical card grids, hero-metric cards with gradient accents (PRODUCT.md anti-reference).
- **Don't** slide into lifeless corporate gray, old SAP/Oracle style (PRODUCT.md anti-reference).
- **Don't** drift into consumer-app playfulness: no pastels, emoji, or decoration (PRODUCT.md anti-reference).
- **Don't** use `border-left` thicker than 1px as an accent stripe, gradient text, or glassmorphism.
- **Don't** nest cards inside cards or mix arbitrary radii.
- **Don't** communicate state with color alone: every pill carries its text label.
