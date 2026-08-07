# My Fit Plan v3.8.1 — Auditoría de hotfix visual

## Correcciones solicitadas

### Móvil horizontal
El dock inferior ahora se centra con `left: 50%` y una anchura máxima
controlada. Se probó a 844×390 y 667×375 y queda completamente dentro del
viewport.

### Botón Entrenar
El botón ya no utiliza desplazamiento vertical ni márgenes negativos. El
contenedor de color queda completamente dentro del dock:
- 40×40 px en vertical.
- 35×35 px en horizontal.

### Iconos de PC
Todos los iconos principales del rail utilizan relación 1:1:
- contenedor: 42×42 px.
- SVG: 20–21×20–21 px.
- centrado mediante grid.
- sin deformación por flex o escalado.

### Espaciado de escritorio
El Inicio utiliza 20 px entre bloques principales. Se amplió el padding de
paneles, el rail y el área útil del dashboard para evitar la sensación de
interfaz apelotonada.

## Pruebas
- iPhone 390×844: superado.
- iPhone horizontal 844×390: superado.
- iPhone SE horizontal 667×375: superado.
- Tablet 1024×768: superado.
- Escritorio 1536×900: superado.
- Sin overflow horizontal.
- Inicio, Plan, Entrenar, Ejercicios y Perfil: superados en escritorio y móvil.
- 21 módulos JavaScript sin errores de sintaxis.
