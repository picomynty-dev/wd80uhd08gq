'use strict';

import { getPremiumMotionAsset } from './media-bundle-pro-v3222.js?v=39';
import { getRealMotionAsset, realMotionAssetIds } from './real-motion-bundle-v323a.js?v=39';

const media = (id) => getRealMotionAsset(id) || getPremiumMotionAsset(id) || ({
  video: new URL(`../assets/motion-pro/${id}.mp4`, import.meta.url).href,
  poster: new URL(`../assets/posters-pro/${id}.jpg`, import.meta.url).href
});

const premium = (id, data) => ({
  ...data,
  premium: true,
  premiumTier: realMotionAssetIds.includes(id) ? 'real-motion' : 'motion',
  realMotion: realMotionAssetIds.includes(id),
  media: media(id)
});

export const premiumExerciseData = {
  bird_dog: premium('bird_dog', {
    englishName: 'Bird Dog',
    level: 'Principiante',
    movementType: 'Estabilidad contralateral',
    primaryMuscles: ['Core'],
    secondaryMuscles: ['Glúteos', 'Deltoides'],
    summary: 'Ejercicio de estabilidad a cuatro apoyos que coordina brazo y pierna contrarios sin permitir que la pelvis rote.',
    steps: [
      'Coloca las manos debajo de los hombros y las rodillas debajo de las caderas.',
      'Activa el abdomen antes de separar una mano y la pierna contraria.',
      'Extiende brazo y pierna hasta formar una línea larga, sin arquear la zona lumbar.',
      'Regresa lentamente y repite con el lado contrario.'
    ],
    mistakes: [
      'Girar la pelvis al extender la pierna.',
      'Elevar la pierna por encima de la cadera.',
      'Perder la posición del abdomen y arquear la espalda.',
      'Realizar el movimiento demasiado rápido.'
    ],
    tips: [
      'Imagina que llevas un vaso sobre la zona lumbar y no quieres derramarlo.',
      'Alarga el cuerpo en lugar de buscar altura.',
      'Reduce el recorrido si no puedes mantener la pelvis estable.'
    ],
    breathing: 'Expulsa el aire mientras extiendes y respira de forma continua al mantener la postura.',
    tempo: 'Extensión lenta · pausa de 1 segundo · regreso controlado'
  }),

  barbell_bench_press: premium('barbell_bench_press', {
    englishName: 'Barbell Bench Press', level: 'Intermedio', movementType: 'Empuje horizontal',
    primaryMuscles: ['Pectoral mayor'], secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
    summary: 'Empuje horizontal con barra para desarrollar fuerza y masa en el pecho, manteniendo hombros y pies estables.',
    steps: ['Ajusta los ojos bajo la barra y apoya los pies con firmeza.', 'Retrae ligeramente las escápulas y toma un agarre estable.', 'Baja la barra con control hacia la zona media del pecho.', 'Empuja en diagonal suave hacia la posición inicial sin rebotar.'],
    mistakes: ['Abrir los codos en exceso.', 'Rebotar la barra sobre el pecho.', 'Perder el apoyo de los pies o elevar los glúteos.', 'Cargar más peso del que puedes controlar.'],
    tips: ['Usa seguros o ayuda cuando entrenes cerca del fallo.', 'Mantén las muñecas alineadas con los antebrazos.', 'La bajada debe ser controlada y repetible.'],
    breathing: 'Inspira al bajar y expulsa el aire mientras empujas.', tempo: '2–3 s de bajada · pausa breve · subida firme'
  }),
  dumbbell_press: premium('dumbbell_press', {
    englishName: 'Dumbbell Bench Press', level: 'Principiante', movementType: 'Empuje horizontal',
    primaryMuscles: ['Pectoral mayor'], secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
    summary: 'Variante con mancuernas que permite mover cada brazo de forma independiente y ajustar mejor el recorrido.',
    steps: ['Siéntate con las mancuernas sobre los muslos y túmbate con control.', 'Coloca los hombros estables y las mancuernas a los lados del pecho.', 'Empuja ambas cargas sin chocarlas arriba.', 'Baja de forma simétrica hasta un rango cómodo.'],
    mistakes: ['Bajar los codos demasiado por debajo del banco.', 'Juntar las mancuernas con un golpe.', 'Arquear excesivamente la zona lumbar.', 'Perder el control al terminar la serie.'],
    tips: ['Empieza con menos carga que en barra.', 'Mantén un agarre neutro si el hombro lo tolera mejor.', 'Sube y baja las mancuernas de forma coordinada.'],
    breathing: 'Inspira en la bajada y expulsa el aire al empujar.', tempo: '2 s de bajada · subida controlada'
  }),
  incline_dumbbell_press: premium('incline_dumbbell_press', {
    englishName: 'Incline Dumbbell Press', level: 'Intermedio', movementType: 'Empuje inclinado',
    primaryMuscles: ['Pectoral superior'], secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
    summary: 'Press inclinado orientado al pecho superior con un recorrido independiente para cada brazo.',
    steps: ['Ajusta el banco con una inclinación moderada.', 'Apoya espalda, cabeza y pies antes de iniciar.', 'Baja las mancuernas hacia la parte alta del pecho.', 'Empuja sin elevar los hombros hacia las orejas.'],
    mistakes: ['Usar una inclinación demasiado vertical.', 'Cerrar en exceso los codos.', 'Perder la estabilidad de las escápulas.', 'Acortar el recorrido por exceso de carga.'],
    tips: ['Una inclinación de 20–35° suele ser suficiente.', 'Controla la posición de las muñecas.', 'Busca tensión en el pecho, no solo en el hombro.'],
    breathing: 'Inspira al bajar; expulsa al superar la parte más difícil.', tempo: '2–3 s de bajada · subida firme'
  }),
  chest_press: premium('chest_press', {
    englishName: 'Machine Chest Press', level: 'Principiante', movementType: 'Empuje horizontal guiado',
    primaryMuscles: ['Pectoral mayor'], secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
    summary: 'Empuje guiado que facilita mantener la trayectoria y concentrarse en el esfuerzo del pecho.',
    steps: ['Ajusta el asiento para que las asas queden a la altura media del pecho.', 'Apoya la espalda y mantén los hombros bajos.', 'Empuja hasta casi extender los codos.', 'Regresa con control sin dejar caer el peso.'],
    mistakes: ['Asiento demasiado alto o bajo.', 'Despegar la espalda del respaldo.', 'Bloquear los codos con fuerza.', 'Dejar que las placas choquen.'],
    tips: ['Prueba agarres distintos si la máquina los ofrece.', 'Mantén las escápulas estables.', 'No necesitas cerrar por completo las asas.'],
    breathing: 'Expulsa el aire al empujar e inspira al regresar.', tempo: '2 s de regreso · 1 s de empuje'
  }),
  lat_pulldown: premium('lat_pulldown', {
    englishName: 'Lat Pulldown', level: 'Principiante', movementType: 'Tirón vertical',
    primaryMuscles: ['Dorsales', 'Espalda media'], secondaryMuscles: ['Bíceps', 'Antebrazos'],
    summary: 'Tirón vertical para desarrollar dorsales y aprender el patrón previo a las dominadas.',
    steps: ['Ajusta el apoyo de muslos y toma la barra con un agarre cómodo.', 'Eleva el pecho sin arquear en exceso.', 'Lleva los codos hacia abajo y acerca la barra al pecho alto.', 'Sube con control hasta estirar los dorsales.'],
    mistakes: ['Tirar detrás de la nuca.', 'Balancear el torso para mover más peso.', 'Convertir el ejercicio en un curl de bíceps.', 'Soltar la barra rápidamente arriba.'],
    tips: ['Piensa en bajar los codos, no en tirar con las manos.', 'Mantén el cuello relajado.', 'Usa straps solo si el agarre limita claramente la espalda.'],
    breathing: 'Expulsa al tirar e inspira al extender los brazos.', tempo: '2 s de subida · 1 s de tirón'
  }),
  assisted_pullup: premium('assisted_pullup', {
    englishName: 'Assisted Pull-Up', level: 'Principiante', movementType: 'Tirón vertical',
    primaryMuscles: ['Dorsales', 'Espalda media'], secondaryMuscles: ['Bíceps', 'Antebrazos'],
    summary: 'Dominada con asistencia para practicar el patrón completo reduciendo la carga corporal.',
    steps: ['Selecciona una ayuda que permita repeticiones limpias.', 'Empieza con brazos extendidos y hombros activos.', 'Lleva el pecho hacia la barra guiando con los codos.', 'Desciende sin perder el control.'],
    mistakes: ['Encoger los hombros al inicio.', 'Dar impulso con las piernas.', 'Acortar el recorrido.', 'Usar tan poca ayuda que se rompe la técnica.'],
    tips: ['Reduce la asistencia poco a poco.', 'Mantén el abdomen activo.', 'Prioriza repeticiones iguales entre sí.'],
    breathing: 'Expulsa al subir e inspira al bajar.', tempo: '2–3 s de bajada · subida firme'
  }),
  seated_row: premium('seated_row', {
    englishName: 'Seated Cable Row', level: 'Principiante', movementType: 'Tirón horizontal',
    primaryMuscles: ['Espalda media', 'Dorsales'], secondaryMuscles: ['Bíceps', 'Deltoides posterior'],
    summary: 'Remo en polea para trabajar espalda media manteniendo una tensión constante durante todo el recorrido.',
    steps: ['Siéntate estable con rodillas ligeramente flexionadas.', 'Empieza con brazos extendidos y pecho abierto.', 'Lleva el agarre hacia el abdomen juntando suavemente las escápulas.', 'Extiende los brazos sin redondear la espalda.'],
    mistakes: ['Balancear el torso en cada repetición.', 'Subir los hombros.', 'Tirar solo con los brazos.', 'Redondear la zona lumbar al extender.'],
    tips: ['Mantén el torso casi inmóvil.', 'Elige un agarre que permita llevar los codos atrás.', 'Pausa brevemente al final del tirón.'],
    breathing: 'Expulsa al remar e inspira al extender.', tempo: '2 s de extensión · pausa · tirón firme'
  }),
  one_arm_row: premium('one_arm_row', {
    englishName: 'One-Arm Dumbbell Row', level: 'Principiante', movementType: 'Tirón horizontal unilateral',
    primaryMuscles: ['Dorsales', 'Espalda media'], secondaryMuscles: ['Bíceps', 'Deltoides posterior'],
    summary: 'Remo unilateral que permite concentrarse en cada lado y ajustar el recorrido a la anatomía individual.',
    steps: ['Apoya una mano y adopta una postura estable.', 'Deja el brazo largo sin girar el torso.', 'Lleva el codo hacia la cadera.', 'Baja la mancuerna con control hasta estirar la espalda.'],
    mistakes: ['Girar el torso para ganar impulso.', 'Elevar el hombro hacia la oreja.', 'Llevar la mancuerna al pecho en vez de hacia la cadera.', 'Redondear la espalda.'],
    tips: ['Mantén la pelvis estable.', 'Usa straps si el agarre limita la serie.', 'Iguala repeticiones y técnica en ambos lados.'],
    breathing: 'Expulsa al subir la mancuerna e inspira al bajar.', tempo: '2 s de bajada · pausa · tirón firme'
  }),
  goblet_squat: premium('goblet_squat', {
    englishName: 'Goblet Squat', level: 'Principiante', movementType: 'Dominante de rodilla',
    primaryMuscles: ['Cuádriceps'], secondaryMuscles: ['Glúteos', 'Core'],
    summary: 'Sentadilla con carga frontal sencilla para aprender profundidad, equilibrio y control del tronco.',
    steps: ['Sujeta la mancuerna cerca del pecho.', 'Coloca los pies en una posición cómoda.', 'Desciende llevando rodillas y caderas de forma coordinada.', 'Empuja el suelo y vuelve manteniendo el tronco estable.'],
    mistakes: ['Despegar los talones.', 'Dejar caer las rodillas hacia dentro.', 'Alejar la mancuerna del cuerpo.', 'Perder tensión en la parte baja.'],
    tips: ['Ajusta ligeramente la apertura de pies.', 'Usa una cuña bajo los talones si mejora tu postura.', 'Detén el descenso antes de perder control.'],
    breathing: 'Inspira y crea tensión antes de bajar; expulsa al subir.', tempo: '3 s de bajada · subida estable'
  }),
  smith_squat: premium('smith_squat', {
    englishName: 'Smith Machine Squat', level: 'Intermedio', movementType: 'Dominante de rodilla guiado',
    primaryMuscles: ['Cuádriceps'], secondaryMuscles: ['Glúteos', 'Core'],
    summary: 'Sentadilla guiada que permite ajustar la posición de los pies y trabajar cerca del fallo con mayor estabilidad.',
    steps: ['Coloca la barra sobre la parte alta de la espalda.', 'Sitúa los pies donde puedas mantener equilibrio y profundidad.', 'Desbloquea la barra y desciende de forma controlada.', 'Empuja hasta volver sin bloquear las rodillas con fuerza.'],
    mistakes: ['Apoyar la barra sobre el cuello.', 'Usar una posición de pies incómoda.', 'Rebotar abajo.', 'Perder el apoyo completo del pie.'],
    tips: ['Prueba pequeñas variaciones de distancia de pies.', 'Usa topes de seguridad.', 'Mantén el torso estable contra la trayectoria guiada.'],
    breathing: 'Inspira antes de bajar y expulsa al superar el punto difícil.', tempo: '2–3 s de bajada · subida firme'
  }),
  leg_press: premium('leg_press', {
    englishName: 'Leg Press', level: 'Principiante', movementType: 'Empuje de piernas guiado',
    primaryMuscles: ['Cuádriceps'], secondaryMuscles: ['Glúteos', 'Isquiotibiales'],
    summary: 'Empuje de piernas con respaldo que facilita acumular trabajo de cuádriceps y glúteos.',
    steps: ['Apoya toda la espalda y coloca los pies de forma estable.', 'Libera los seguros manteniendo las rodillas alineadas.', 'Desciende hasta un rango que no despegue la pelvis.', 'Empuja sin bloquear las rodillas de golpe.'],
    mistakes: ['Bajar tanto que la pelvis se redondea.', 'Juntar las rodillas hacia dentro.', 'Despegar talones o espalda.', 'Bloquear completamente las rodillas.'],
    tips: ['La posición de pies cambia ligeramente el énfasis.', 'Usa un rango que puedas repetir igual.', 'Mantén las manos en las asas.'],
    breathing: 'Inspira al bajar y expulsa al empujar.', tempo: '3 s de bajada · subida controlada'
  }),
  romanian_deadlift: premium('romanian_deadlift', {
    englishName: 'Romanian Deadlift', level: 'Intermedio', movementType: 'Bisagra de cadera',
    primaryMuscles: ['Isquiotibiales'], secondaryMuscles: ['Glúteos', 'Erectores espinales'],
    summary: 'Bisagra de cadera para trabajar la cadena posterior manteniendo la carga cerca del cuerpo.',
    steps: ['Empieza erguido con rodillas ligeramente flexionadas.', 'Lleva la cadera hacia atrás manteniendo la espalda neutra.', 'Desliza la carga cerca de las piernas.', 'Vuelve extendiendo la cadera sin inclinarte hacia atrás.'],
    mistakes: ['Convertirlo en una sentadilla.', 'Alejar la carga del cuerpo.', 'Redondear la zona lumbar.', 'Bajar más allá del rango controlado.'],
    tips: ['Detén la bajada cuando notes máxima tensión sin perder postura.', 'Mantén el cuello alineado.', 'Practica primero con poca carga.'],
    breathing: 'Inspira antes de la bajada y expulsa al extender la cadera.', tempo: '3 s de bajada · subida firme'
  }),
  hip_thrust: premium('hip_thrust', {
    englishName: 'Hip Thrust', level: 'Intermedio', movementType: 'Extensión de cadera',
    primaryMuscles: ['Glúteos'], secondaryMuscles: ['Isquiotibiales', 'Core'],
    summary: 'Extensión de cadera con apoyo de espalda para desarrollar fuerza y masa en los glúteos.',
    steps: ['Apoya la parte alta de la espalda en un banco estable.', 'Coloca los pies para que arriba las tibias queden casi verticales.', 'Eleva la cadera contrayendo los glúteos.', 'Baja con control sin perder la posición del tronco.'],
    mistakes: ['Hiperextender la zona lumbar arriba.', 'Empujar desde las puntas de los pies.', 'Colocar los pies demasiado lejos o cerca.', 'Mover la cabeza de forma brusca.'],
    tips: ['Mira al frente y mantén las costillas controladas.', 'Usa una almohadilla para la barra.', 'Pausa un instante en la parte alta.'],
    breathing: 'Expulsa al elevar la cadera e inspira al bajar.', tempo: '2 s de bajada · pausa arriba'
  }),
  leg_extension: premium('leg_extension', {
    englishName: 'Leg Extension', level: 'Principiante', movementType: 'Extensión de rodilla',
    primaryMuscles: ['Cuádriceps'], secondaryMuscles: [],
    summary: 'Aislamiento de cuádriceps en máquina con una trayectoria fácil de controlar.',
    steps: ['Alinea la rodilla con el eje de la máquina.', 'Ajusta el rodillo por encima del empeine.', 'Extiende las piernas hasta una posición cómoda.', 'Baja lentamente sin dejar caer la carga.'],
    mistakes: ['Eje de la máquina mal alineado.', 'Despegar la cadera del asiento.', 'Dar impulso.', 'Bloquear la rodilla de forma agresiva.'],
    tips: ['Usa un recorrido sin dolor.', 'Pausa brevemente arriba.', 'Controla especialmente la fase de bajada.'],
    breathing: 'Expulsa al extender e inspira al bajar.', tempo: '1 s arriba · 3 s de bajada'
  }),
  leg_curl: premium('leg_curl', {
    englishName: 'Lying Leg Curl', level: 'Principiante', movementType: 'Flexión de rodilla',
    primaryMuscles: ['Isquiotibiales'], secondaryMuscles: ['Gemelos'],
    summary: 'Flexión de rodilla tumbado para aislar los isquiotibiales y controlar la fase excéntrica.',
    steps: ['Alinea las rodillas con el eje de giro.', 'Coloca el rodillo por encima de los talones.', 'Flexiona sin levantar la pelvis.', 'Extiende lentamente sin perder tensión.'],
    mistakes: ['Elevar la cadera del banco.', 'Usar impulso.', 'Dejar caer el peso al extender.', 'Colocar el rodillo demasiado alto.'],
    tips: ['Mantén el abdomen contra el banco.', 'No necesitas tocar los glúteos con los talones.', 'Reduce carga si aparecen calambres frecuentes.'],
    breathing: 'Expulsa al flexionar e inspira al extender.', tempo: '1 s de flexión · 3 s de extensión'
  }),
  dumbbell_shoulder_press: premium('dumbbell_shoulder_press', {
    englishName: 'Dumbbell Shoulder Press', level: 'Principiante', movementType: 'Empuje vertical',
    primaryMuscles: ['Deltoides'], secondaryMuscles: ['Tríceps'],
    summary: 'Empuje vertical con mancuernas para hombros, permitiendo ajustar el agarre y el recorrido.',
    steps: ['Coloca las mancuernas a la altura de los hombros.', 'Mantén abdomen y glúteos activos.', 'Empuja hacia arriba sin chocar las cargas.', 'Baja hasta un rango cómodo y estable.'],
    mistakes: ['Arquear mucho la zona lumbar.', 'Encoger los hombros.', 'Bajar con los codos muy atrás.', 'Usar impulso de piernas sin buscarlo.'],
    tips: ['Un agarre semineutro puede resultar cómodo.', 'No bloquees con violencia arriba.', 'Si estás sentado, ajusta bien el respaldo.'],
    breathing: 'Expulsa al empujar e inspira al bajar.', tempo: '2 s de bajada · subida firme'
  }),
  lateral_raise: premium('lateral_raise', {
    englishName: 'Dumbbell Lateral Raise', level: 'Principiante', movementType: 'Abducción de hombro',
    primaryMuscles: ['Deltoides lateral'], secondaryMuscles: [],
    summary: 'Elevación lateral para trabajar la porción media del hombro con cargas moderadas y control.',
    steps: ['Sujeta las mancuernas con codos ligeramente flexionados.', 'Eleva los brazos hacia los lados guiando con los codos.', 'Detente cerca de la altura de los hombros.', 'Baja lentamente hasta mantener tensión.'],
    mistakes: ['Balancear el torso.', 'Subir los hombros hacia las orejas.', 'Usar cargas que obligan a doblar demasiado los codos.', 'Dejar caer las mancuernas.'],
    tips: ['Piensa en separar los codos del cuerpo.', 'Inclina levemente el torso si te resulta cómodo.', 'Las repeticiones limpias valen más que el peso.'],
    breathing: 'Expulsa al elevar e inspira al bajar.', tempo: '1–2 s de subida · 3 s de bajada'
  }),
  biceps_curl: premium('biceps_curl', {
    englishName: 'Dumbbell Biceps Curl', level: 'Principiante', movementType: 'Flexión de codo',
    primaryMuscles: ['Bíceps'], secondaryMuscles: ['Antebrazos'],
    summary: 'Curl clásico con mancuernas para bíceps, buscando codos estables y recorrido completo.',
    steps: ['Coloca los brazos junto al torso.', 'Flexiona los codos sin mover los hombros.', 'Gira las palmas hacia arriba si usas supinación.', 'Baja completamente con control.'],
    mistakes: ['Balancear el cuerpo.', 'Mover los codos hacia delante.', 'Acortar la bajada.', 'Doblar las muñecas.'],
    tips: ['Alterna brazos si mejora el control.', 'Mantén el hombro relajado.', 'Reduce peso si el torso empieza a moverse.'],
    breathing: 'Expulsa al subir e inspira al bajar.', tempo: '1 s de subida · 3 s de bajada'
  }),
  hammer_curl: premium('hammer_curl', {
    englishName: 'Hammer Curl', level: 'Principiante', movementType: 'Flexión de codo con agarre neutro',
    primaryMuscles: ['Bíceps', 'Braquial', 'Antebrazos'], secondaryMuscles: [],
    summary: 'Curl con palmas enfrentadas que reparte el trabajo entre bíceps, braquial y antebrazo.',
    steps: ['Mantén las palmas enfrentadas durante todo el movimiento.', 'Flexiona sin adelantar los codos.', 'Sube hasta conservar tensión y control.', 'Baja despacio hasta extender el brazo.'],
    mistakes: ['Girar la muñeca durante la serie.', 'Balancearse.', 'Subir los codos.', 'Dejar caer la carga.'],
    tips: ['Puede realizarse alterno o simultáneo.', 'Mantén las muñecas neutrales.', 'No busques tocar el hombro si pierdes tensión.'],
    breathing: 'Expulsa al flexionar e inspira al bajar.', tempo: '1 s de subida · 3 s de bajada'
  }),
  triceps_pushdown: premium('triceps_pushdown', {
    englishName: 'Cable Triceps Pushdown', level: 'Principiante', movementType: 'Extensión de codo',
    primaryMuscles: ['Tríceps'], secondaryMuscles: [],
    summary: 'Extensión de codo en polea para tríceps, manteniendo los brazos estables junto al torso.',
    steps: ['Coloca los codos junto al cuerpo.', 'Empieza con antebrazos flexionados y torso estable.', 'Extiende hasta una posición cómoda.', 'Regresa sin permitir que los codos se desplacen.'],
    mistakes: ['Abrir los codos.', 'Inclinar el torso en exceso.', 'Mover los hombros.', 'Usar impulso para bajar la carga.'],
    tips: ['Separa ligeramente la cuerda al final si resulta cómodo.', 'Mantén las muñecas neutrales.', 'Usa un peso que permita detener la carga.'],
    breathing: 'Expulsa al extender e inspira al regresar.', tempo: '1 s de extensión · 2–3 s de regreso'
  }),
  reverse_fly: premium('reverse_fly', {
    englishName: 'Dumbbell Reverse Fly', level: 'Principiante', movementType: 'Apertura posterior',
    primaryMuscles: ['Deltoides posterior'], secondaryMuscles: ['Trapecio', 'Espalda alta'],
    summary: 'Apertura inclinada para hombro posterior y control escapular.',
    breathing: 'Expulsa al abrir e inspira al regresar.', tempo: '1–2 s de apertura · 3 s de bajada'
  }),
  preacher_curl: premium('preacher_curl', {
    englishName: 'Preacher Curl', level: 'Principiante', movementType: 'Flexión de codo apoyada',
    primaryMuscles: ['Bíceps'], secondaryMuscles: ['Antebrazos'],
    summary: 'Curl con el brazo apoyado para reducir el impulso y aislar el bíceps.',
    breathing: 'Expulsa al flexionar e inspira al bajar.', tempo: '1 s de subida · 3 s de bajada'
  }),
  overhead_triceps: premium('overhead_triceps', {
    englishName: 'Overhead Triceps Extension', level: 'Principiante', movementType: 'Extensión de codo superior',
    primaryMuscles: ['Tríceps'], secondaryMuscles: [],
    summary: 'Extensión por encima de la cabeza con énfasis en la porción larga del tríceps.',
    breathing: 'Expulsa al extender e inspira al flexionar.', tempo: '1 s de extensión · 2–3 s de regreso'
  }),
  assisted_dip: premium('assisted_dip', {
    englishName: 'Assisted Dip', level: 'Principiante', movementType: 'Empuje vertical asistido',
    primaryMuscles: ['Tríceps'], secondaryMuscles: ['Pectoral', 'Deltoides anterior'],
    summary: 'Fondos con asistencia para practicar el recorrido con una carga adaptada.',
    breathing: 'Expulsa al subir e inspira al bajar.', tempo: '2–3 s de bajada · subida firme'
  }),
  cable_crunch: premium('cable_crunch', {
    englishName: 'Cable Crunch', level: 'Principiante', movementType: 'Flexión de tronco',
    primaryMuscles: ['Abdominales'], secondaryMuscles: [],
    summary: 'Flexión controlada del tronco contra la resistencia de una polea.',
    breathing: 'Expulsa al acercar costillas y pelvis.', tempo: '1 s de flexión · 2 s de regreso'
  }),
  plank: premium('plank', {
    englishName: 'Forearm Plank', level: 'Principiante', movementType: 'Antiextensión de core',
    primaryMuscles: ['Core'], secondaryMuscles: ['Hombros', 'Glúteos'],
    summary: 'Isometría para mantener tronco y pelvis alineados bajo tensión.',
    breathing: 'Respira de forma continua sin perder la tensión.', tempo: 'Mantén una postura estable'
  }),
  dead_bug: premium('dead_bug', {
    englishName: 'Dead Bug', level: 'Principiante', movementType: 'Control lumbopélvico',
    primaryMuscles: ['Core'], secondaryMuscles: [],
    summary: 'Movimiento contralateral para aprender a estabilizar la zona media.',
    breathing: 'Expulsa al extender brazo y pierna.', tempo: 'Lento y controlado'
  }),
  side_plank: premium('side_plank', {
    englishName: 'Side Plank', level: 'Principiante', movementType: 'Antiflexión lateral',
    primaryMuscles: ['Oblicuos'], secondaryMuscles: ['Hombros', 'Glúteos'],
    summary: 'Isometría lateral para oblicuos, hombro y estabilidad de cadera.',
    breathing: 'Respira sin dejar caer la cadera.', tempo: 'Mantén una postura estable'
  }),
  hip_abduction: premium('hip_abduction', {
    englishName: 'Hip Abduction Machine', level: 'Principiante', movementType: 'Abducción de cadera',
    primaryMuscles: ['Glúteo medio'], secondaryMuscles: [],
    summary: 'Apertura guiada de las piernas para trabajar la estabilidad lateral de la cadera.',
    breathing: 'Expulsa al abrir e inspira al cerrar.', tempo: '1 s de apertura · 3 s de regreso'
  }),
  split_squat: premium('split_squat', {
    englishName: 'Dumbbell Split Squat', level: 'Intermedio', movementType: 'Zancada unilateral',
    primaryMuscles: ['Cuádriceps'], secondaryMuscles: ['Glúteos', 'Isquiotibiales'],
    summary: 'Trabajo unilateral con mancuernas para pierna, equilibrio y control.',
    breathing: 'Inspira al bajar y expulsa al subir.', tempo: '2–3 s de bajada · subida estable'
  })
};
