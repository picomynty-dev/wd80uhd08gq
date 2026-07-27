import { extraExerciseLibrary } from './exercises-extra.js?v=323a';
import { premiumExerciseData } from './premium-data.js?v=323a';

'use strict';

const ex = (name, muscle, equipment, summary, steps, mistakes, alternatives = []) => ({
  name, muscle, equipment, summary, steps, mistakes, alternatives
});

export const baseExerciseLibrary = {
  leg_press: ex('Prensa de piernas', 'Cuádriceps', 'Máquina', 'Un movimiento estable para trabajar piernas con apoyo de espalda.', ['Apoya espalda y cadera por completo.', 'Coloca los pies al ancho de hombros.', 'Baja con control y empuja sin bloquear las rodillas.'], ['Despegar la cadera del respaldo.', 'Cerrar las rodillas hacia dentro.'], ['goblet_squat', 'smith_squat', 'leg_extension']),
  goblet_squat: ex('Sentadilla goblet', 'Cuádriceps', 'Mancuernas', 'Sentadilla sujetando una mancuerna delante del pecho.', ['Sujeta la mancuerna cerca del pecho.', 'Lleva la cadera hacia abajo entre las piernas.', 'Sube empujando el suelo con todo el pie.'], ['Levantar los talones.', 'Redondear la espalda.'], ['leg_press', 'smith_squat', 'split_squat']),
  smith_squat: ex('Sentadilla en multipower', 'Cuádriceps', 'Máquina', 'Sentadilla guiada que facilita mantener una trayectoria estable.', ['Coloca la barra sobre la parte alta de la espalda.', 'Sitúa los pies ligeramente adelantados.', 'Baja hasta una profundidad cómoda y vuelve a subir.'], ['Apoyar la barra en el cuello.', 'Bloquear las rodillas al subir.'], ['leg_press', 'goblet_squat']),
  leg_extension: ex('Extensión de cuádriceps', 'Cuádriceps', 'Máquina', 'Aísla la parte delantera del muslo mediante extensión de rodilla.', ['Ajusta el respaldo y el rodillo sobre los tobillos.', 'Extiende las piernas sin dar impulso.', 'Baja lentamente.'], ['Usar demasiado peso.', 'Golpear los topes de la máquina.'], ['leg_press', 'goblet_squat']),
  split_squat: ex('Zancada estática', 'Cuádriceps', 'Mancuernas', 'Trabajo unilateral para piernas y estabilidad.', ['Coloca un pie delante y otro detrás.', 'Baja la rodilla trasera hacia el suelo.', 'Sube manteniendo el pie delantero bien apoyado.'], ['Dar un paso demasiado corto.', 'Perder el equilibrio por ir rápido.'], ['step_up', 'goblet_squat']),
  step_up: ex('Subida al banco', 'Cuádriceps', 'Banco', 'Ejercicio unilateral subiendo de forma controlada a una superficie estable.', ['Apoya todo el pie sobre el banco.', 'Sube empujando principalmente con la pierna apoyada.', 'Baja con control.'], ['Impulsarse demasiado con la pierna de abajo.', 'Usar un banco demasiado alto.'], ['split_squat', 'leg_press']),
  leg_curl: ex('Curl femoral', 'Isquiotibiales', 'Máquina', 'Flexión de rodilla para trabajar la parte posterior del muslo.', ['Ajusta el rodillo por encima de los talones.', 'Mantén la cadera apoyada.', 'Flexiona y regresa lentamente.'], ['Levantar la cadera.', 'Soltar el peso de golpe.'], ['romanian_deadlift', 'seated_leg_curl']),
  seated_leg_curl: ex('Curl femoral sentado', 'Isquiotibiales', 'Máquina', 'Variante sentada para la musculatura posterior del muslo.', ['Ajusta el respaldo y fija el muslo.', 'Lleva los talones hacia abajo y atrás.', 'Regresa con control.'], ['Mover el torso.', 'Recortar demasiado el recorrido.'], ['leg_curl', 'romanian_deadlift']),
  romanian_deadlift: ex('Peso muerto rumano con mancuernas', 'Isquiotibiales', 'Mancuernas', 'Bisagra de cadera para isquiotibiales y glúteos.', ['Mantén las mancuernas cerca de las piernas.', 'Lleva la cadera hacia atrás con rodillas ligeramente flexionadas.', 'Sube apretando glúteos sin inclinarte hacia atrás.'], ['Redondear la espalda.', 'Convertirlo en una sentadilla.'], ['leg_curl', 'hip_thrust']),
  hip_thrust: ex('Hip thrust', 'Glúteos', 'Banco', 'Extensión de cadera con la espalda apoyada para trabajar glúteos.', ['Apoya la parte alta de la espalda en el banco.', 'Coloca los pies firmes y la carga sobre la cadera.', 'Eleva la cadera y haz una pausa arriba.'], ['Hiperextender la zona lumbar.', 'Colocar los pies demasiado lejos.'], ['glute_bridge', 'romanian_deadlift']),
  glute_bridge: ex('Puente de glúteos', 'Glúteos', 'Peso corporal', 'Extensión de cadera desde el suelo, adecuada para aprender el patrón.', ['Túmbate con rodillas flexionadas.', 'Empuja con los talones.', 'Eleva la cadera sin arquear la espalda.'], ['Subir empujando con la zona lumbar.', 'Separar demasiado los pies.'], ['hip_thrust']),
  hip_abduction: ex('Abducción de cadera', 'Glúteos', 'Máquina', 'Apertura de piernas para trabajar glúteo medio.', ['Apoya bien la espalda.', 'Abre las piernas sin impulso.', 'Vuelve lentamente.'], ['Rebotar.', 'Inclinarse demasiado hacia delante.'], ['cable_abduction']),
  cable_abduction: ex('Abducción de cadera en polea', 'Glúteos', 'Polea', 'Movimiento lateral de una pierna con resistencia de polea.', ['Sujétate para mantener el equilibrio.', 'Mueve la pierna lateralmente sin girar la cadera.', 'Regresa con control.'], ['Inclinar todo el cuerpo.', 'Usar demasiado peso.'], ['hip_abduction']),
  hip_adduction: ex('Aducción de cadera', 'Aductores', 'Máquina', 'Cierre de piernas para la musculatura interna del muslo.', ['Ajusta una apertura cómoda.', 'Cierra las piernas de forma controlada.', 'Regresa sin dejar caer el peso.'], ['Forzar una apertura excesiva.', 'Dar tirones.'], []),
  calf_raise: ex('Elevación de gemelos de pie', 'Gemelos', 'Máquina', 'Flexión plantar para trabajar los gemelos.', ['Apoya la parte delantera del pie.', 'Sube los talones todo lo que controles.', 'Haz una pausa y baja lentamente.'], ['Rebotar.', 'Acortar el recorrido.'], ['seated_calf_raise']),
  seated_calf_raise: ex('Elevación de gemelos sentado', 'Gemelos', 'Máquina', 'Variante sentada que incide especialmente en el sóleo.', ['Coloca el apoyo sobre los muslos.', 'Eleva los talones.', 'Baja lentamente hasta un estiramiento cómodo.'], ['Mover las rodillas.', 'Hacer repeticiones muy rápidas.'], ['calf_raise']),

  chest_press: ex('Press de pecho en máquina', 'Pecho', 'Máquina', 'Empuje horizontal estable para pecho y tríceps.', ['Ajusta el asiento para que las asas queden a la altura del pecho.', 'Mantén los hombros bajos y la espalda apoyada.', 'Empuja y vuelve con control.'], ['Encoger los hombros.', 'Despegar la espalda.'], ['dumbbell_press', 'push_up', 'pec_deck']),
  dumbbell_press: ex('Press con mancuernas', 'Pecho', 'Mancuernas', 'Press tumbado que permite mover cada brazo de forma independiente.', ['Apoya pies, glúteos y espalda.', 'Baja las mancuernas a ambos lados del pecho.', 'Empuja sin chocar las mancuernas.'], ['Abrir los codos en exceso.', 'Perder el control al bajar.'], ['chest_press', 'barbell_bench_press', 'push_up']),
  barbell_bench_press: {
    name: 'Press banca con barra',
    englishName: 'Barbell Bench Press',
    muscle: 'Pecho',
    equipment: 'Barra y banco',
    summary: 'Empuje horizontal con barra para desarrollar el pectoral, con participación del tríceps y el hombro anterior.',
    steps: [
      'Túmbate con los ojos debajo de la barra y apoya los pies firmemente en el suelo.',
      'Junta y estabiliza los omóplatos; agarra la barra algo más ancho que los hombros.',
      'Saca la barra y colócala sobre la zona media del pecho con los brazos extendidos.',
      'Baja de forma controlada manteniendo los antebrazos casi verticales.',
      'Empuja la barra hacia arriba sin rebotar ni perder la posición de los hombros.'
    ],
    mistakes: [
      'Abrir los codos en exceso y perder una trayectoria estable.',
      'Rebotar la barra contra el pecho.',
      'Levantar los glúteos o mover los pies durante la repetición.',
      'Entrenar cerca del fallo sin soportes de seguridad o ayuda.'
    ],
    tips: [
      'Mantén el pecho abierto y los omóplatos estables durante toda la serie.',
      'Utiliza un peso que puedas controlar también durante la bajada.',
      'Pide ayuda o usa soportes cuando entrenes con cargas exigentes.',
      'Reduce la carga si la técnica cambia entre repeticiones.'
    ],
    breathing: 'Inspira durante la bajada y expulsa el aire mientras empujas la barra.',
    tempo: 'Bajada controlada de 2–3 segundos · pausa breve · subida firme.',
    alternatives: ['dumbbell_press', 'chest_press', 'push_up'],
    alternativeReasons: {
      dumbbell_press: 'Mismo patrón con mayor libertad para cada brazo.',
      chest_press: 'Más estabilidad y fácil ajuste de carga en máquina.',
      push_up: 'Alternativa sin material para casa o calentamiento.'
    },
    synonyms: ['press banca', 'banca barra', 'bench press', 'barbell bench press'],
    level: 'Intermedio',
    movement: 'press_horizontal',
    movementType: 'Empuje horizontal',
    location: ['Gimnasio'],
    primaryMuscles: ['Pectoral mayor'],
    secondaryMuscles: ['Tríceps', 'Deltoides anterior'],
    visualType: 'press_horizontal',
    movementImages: {
      start: './assets/exercises/barbell-bench-press-start.svg',
      end: './assets/exercises/barbell-bench-press-end.svg'
    },
    anatomyImages: {
      front: './assets/anatomy/bench-press-front.svg',
      back: './assets/anatomy/bench-press-back.svg'
    },
    premium: true
  },
  incline_dumbbell_press: ex('Press inclinado con mancuernas', 'Pecho', 'Mancuernas', 'Variante inclinada con mayor participación de la zona superior del pecho.', ['Ajusta el banco con una inclinación moderada.', 'Baja las mancuernas cerca del pecho superior.', 'Empuja manteniendo hombros estables.'], ['Usar una inclinación demasiado vertical.', 'Chocar las mancuernas.'], ['dumbbell_press', 'chest_press']),
  pec_deck: ex('Aperturas en peck deck', 'Pecho', 'Máquina', 'Aducción de brazos guiada para trabajar el pecho.', ['Ajusta el asiento para que los brazos queden a la altura del pecho.', 'Junta los apoyos sin encoger hombros.', 'Regresa lentamente.'], ['Forzar demasiado el estiramiento.', 'Dar impulso.'], ['cable_fly', 'chest_press']),
  cable_fly: ex('Cruce de poleas', 'Pecho', 'Polea', 'Apertura y cierre de brazos con tensión continua.', ['Adopta una postura estable.', 'Mantén una ligera flexión de codo.', 'Junta las manos delante del pecho y vuelve con control.'], ['Convertirlo en un press.', 'Mover el torso.'], ['pec_deck', 'push_up']),
  push_up: ex('Flexiones', 'Pecho', 'Peso corporal', 'Empuje con el cuerpo alineado; puede adaptarse apoyando las rodillas.', ['Coloca las manos algo más abiertas que los hombros.', 'Mantén abdomen y glúteos activos.', 'Baja el pecho entre las manos y empuja.'], ['Hundir la cadera.', 'Abrir demasiado los codos.'], ['chest_press', 'dumbbell_press']),

  lat_pulldown: ex('Jalón al pecho', 'Espalda', 'Polea', 'Tirón vertical para dorsales y brazos.', ['Sujeta la barra algo más abierta que los hombros.', 'Baja los hombros antes de tirar.', 'Lleva la barra hacia la parte alta del pecho.'], ['Balancear el torso.', 'Llevar la barra detrás de la cabeza.'], ['assisted_pullup', 'seated_row', 'one_arm_row']),
  assisted_pullup: ex('Dominada asistida', 'Espalda', 'Máquina', 'Dominada con ayuda para aprender el movimiento de tirón vertical.', ['Coloca rodillas o pies en el apoyo.', 'Inicia bajando los hombros.', 'Sube el pecho hacia las asas y baja lentamente.'], ['Dejarse caer.', 'Encoger los hombros.'], ['lat_pulldown']),
  seated_row: ex('Remo sentado', 'Espalda', 'Polea', 'Tirón horizontal para dorsales y zona media de la espalda.', ['Siéntate con el torso estable.', 'Lleva los codos hacia atrás.', 'Junta suavemente los omóplatos y vuelve.'], ['Balancearse.', 'Encoger los hombros.'], ['one_arm_row', 'chest_supported_row', 'lat_pulldown']),
  one_arm_row: ex('Remo con mancuerna', 'Espalda', 'Mancuernas', 'Remo unilateral con apoyo para trabajar la espalda.', ['Apoya una mano y una rodilla o adopta una postura estable.', 'Lleva el codo hacia la cadera.', 'Baja la mancuerna sin girar el torso.'], ['Rotar el cuerpo.', 'Tirar solo con el bíceps.'], ['seated_row', 'chest_supported_row']),
  chest_supported_row: ex('Remo con pecho apoyado', 'Espalda', 'Mancuernas', 'Remo sobre banco inclinado que reduce el movimiento del torso.', ['Apoya el pecho en un banco inclinado.', 'Tira de las mancuernas hacia los lados del torso.', 'Baja lentamente.'], ['Levantar el pecho del banco.', 'Encoger los hombros.'], ['seated_row', 'one_arm_row']),
  straight_arm_pulldown: ex('Jalón con brazos rectos', 'Espalda', 'Polea', 'Extensión de hombro para sentir el trabajo de los dorsales.', ['Inclina ligeramente el torso.', 'Mantén los codos casi extendidos.', 'Lleva la barra hacia los muslos sin balancearte.'], ['Flexionar demasiado los codos.', 'Usar impulso.'], ['lat_pulldown']),
  face_pull: ex('Face pull', 'Hombro posterior', 'Polea', 'Tirón hacia la cara para hombro posterior y parte alta de la espalda.', ['Coloca la cuerda a la altura de la cara.', 'Tira separando las manos.', 'Mantén los codos altos y vuelve con control.'], ['Arquear la espalda.', 'Usar demasiado peso.'], ['reverse_fly']),
  back_extension: ex('Extensión lumbar en banco', 'Espalda baja', 'Banco', 'Extensión de cadera y tronco con recorrido controlado.', ['Ajusta el apoyo por debajo de la cadera.', 'Baja manteniendo la espalda neutra.', 'Sube hasta alinear el cuerpo, sin hiperextender.'], ['Subir demasiado.', 'Redondear bruscamente la espalda.'], ['bird_dog']),

  shoulder_press: ex('Press de hombro en máquina', 'Hombros', 'Máquina', 'Empuje vertical guiado para hombros y tríceps.', ['Ajusta el asiento para que las asas queden cerca de los hombros.', 'Mantén abdomen activo y espalda apoyada.', 'Empuja sin bloquear los codos.'], ['Arquear la zona lumbar.', 'Bajar demasiado si molesta el hombro.'], ['dumbbell_shoulder_press', 'lateral_raise']),
  dumbbell_shoulder_press: ex('Press de hombro con mancuernas', 'Hombros', 'Mancuernas', 'Empuje vertical con mancuernas.', ['Siéntate con respaldo si eres principiante.', 'Empieza con las mancuernas a los lados de la cabeza.', 'Empuja arriba sin chocar y baja con control.'], ['Arquear la espalda.', 'Usar impulso de piernas.'], ['shoulder_press']),
  lateral_raise: ex('Elevaciones laterales', 'Hombros', 'Mancuernas', 'Elevación lateral para el deltoides medio.', ['Usa una carga moderada.', 'Eleva los brazos hasta una altura cómoda.', 'Baja lentamente.'], ['Balancear el cuerpo.', 'Encoger los hombros.'], ['cable_lateral_raise', 'shoulder_press']),
  cable_lateral_raise: ex('Elevación lateral en polea', 'Hombros', 'Polea', 'Variante con tensión continua para el deltoides medio.', ['Coloca la polea baja.', 'Eleva el brazo lateralmente con el torso estable.', 'Regresa con control.'], ['Inclinar el cuerpo.', 'Subir con impulso.'], ['lateral_raise']),
  reverse_fly: ex('Pájaros en máquina', 'Hombro posterior', 'Máquina', 'Apertura inversa para deltoides posterior y espalda alta.', ['Ajusta el asiento con el pecho apoyado.', 'Abre los brazos sin encoger hombros.', 'Vuelve lentamente.'], ['Mover el torso.', 'Cerrar los codos en exceso.'], ['face_pull']),
  front_raise: ex('Elevación frontal con mancuerna', 'Hombros', 'Mancuernas', 'Elevación del brazo al frente para deltoides anterior.', ['Mantén el torso firme.', 'Eleva hasta una altura cómoda.', 'Baja sin dejar caer el peso.'], ['Balancearse.', 'Subir demasiado.'], ['shoulder_press']),

  biceps_curl: ex('Curl de bíceps con mancuernas', 'Bíceps', 'Mancuernas', 'Flexión de codo con mancuernas.', ['Mantén los codos junto al cuerpo.', 'Flexiona sin mover los hombros.', 'Baja completamente con control.'], ['Balancear el torso.', 'Adelantar los codos.'], ['cable_curl', 'hammer_curl']),
  cable_curl: ex('Curl de bíceps en polea', 'Bíceps', 'Polea', 'Curl con tensión continua.', ['Colócate estable frente a la polea.', 'Mantén los codos fijos.', 'Flexiona y baja lentamente.'], ['Inclinarse hacia atrás.', 'Mover los hombros.'], ['biceps_curl', 'preacher_curl']),
  hammer_curl: ex('Curl martillo', 'Bíceps', 'Mancuernas', 'Curl con agarre neutro para bíceps y antebrazo.', ['Sujeta las mancuernas con palmas enfrentadas.', 'Flexiona manteniendo los codos quietos.', 'Baja de forma controlada.'], ['Balancearse.', 'Acortar el recorrido.'], ['biceps_curl']),
  preacher_curl: ex('Curl en banco predicador', 'Bíceps', 'Máquina', 'Curl con brazos apoyados que reduce el impulso.', ['Apoya completamente la parte posterior de los brazos.', 'Flexiona sin levantar los hombros.', 'Baja sin bloquear el codo de golpe.'], ['Despegar los brazos del apoyo.', 'Soltar el peso.'], ['cable_curl', 'biceps_curl']),

  triceps_pushdown: ex('Extensión de tríceps en polea', 'Tríceps', 'Polea', 'Extensión de codo con los brazos junto al torso.', ['Mantén los codos pegados al cuerpo.', 'Extiende hasta una posición cómoda.', 'Regresa sin mover los hombros.'], ['Abrir los codos.', 'Inclinarse demasiado.'], ['overhead_triceps', 'assisted_dip']),
  overhead_triceps: ex('Extensión de tríceps sobre la cabeza', 'Tríceps', 'Polea', 'Extensión de codo con el brazo elevado.', ['Colócate de espaldas a la polea.', 'Mantén los codos orientados al frente.', 'Extiende sin arquear la espalda.'], ['Separar mucho los codos.', 'Mover el torso.'], ['triceps_pushdown']),
  assisted_dip: ex('Fondos asistidos', 'Tríceps', 'Máquina', 'Empuje vertical con asistencia para tríceps y pecho.', ['Ajusta la ayuda adecuada.', 'Mantén hombros bajos.', 'Baja hasta una posición cómoda y empuja.'], ['Hundirse entre los hombros.', 'Bajar más de lo cómodo.'], ['triceps_pushdown', 'close_grip_pushup']),
  close_grip_pushup: ex('Flexiones con manos juntas', 'Tríceps', 'Peso corporal', 'Flexión con agarre cerrado para aumentar el trabajo de tríceps.', ['Coloca las manos algo más juntas que los hombros.', 'Mantén el cuerpo alineado.', 'Baja con los codos cerca del cuerpo.'], ['Abrir los codos.', 'Hundir la cadera.'], ['triceps_pushdown']),

  plank: ex('Plancha frontal', 'Core', 'Peso corporal', 'Ejercicio isométrico para estabilizar el tronco.', ['Apoya antebrazos y puntas de pies.', 'Aprieta abdomen y glúteos.', 'Mantén una línea recta sin contener la respiración.'], ['Hundir la espalda.', 'Elevar demasiado la cadera.'], ['dead_bug', 'side_plank']),
  dead_bug: ex('Dead bug', 'Core', 'Peso corporal', 'Ejercicio de control abdominal tumbado.', ['Mantén la zona lumbar en contacto con el suelo.', 'Extiende brazo y pierna contrarios.', 'Regresa y alterna sin perder la posición.'], ['Arquear la espalda.', 'Ir demasiado rápido.'], ['plank', 'bird_dog']),
  bird_dog: ex('Bird dog', 'Core', 'Peso corporal', 'Estabilidad a cuatro apoyos extendiendo brazo y pierna contrarios.', ['Coloca manos bajo hombros y rodillas bajo caderas.', 'Extiende brazo y pierna contrarios.', 'Mantén la pelvis estable y alterna.'], ['Girar la cadera.', 'Elevar demasiado la pierna.'], ['dead_bug', 'back_extension']),
  side_plank: ex('Plancha lateral', 'Core', 'Peso corporal', 'Estabilidad lateral del tronco.', ['Apoya antebrazo debajo del hombro.', 'Eleva la cadera formando una línea recta.', 'Mantén la posición respirando.'], ['Dejar caer la cadera.', 'Apoyar el hombro en una posición incómoda.'], ['plank', 'pallof_press']),
  pallof_press: ex('Press Pallof', 'Core', 'Polea', 'Resistencia a la rotación con una polea lateral.', ['Colócate de lado a la polea.', 'Sujeta el agarre delante del pecho.', 'Extiende los brazos sin permitir que el torso gire.'], ['Girar hacia la polea.', 'Usar demasiado peso.'], ['side_plank']),
  cable_crunch: ex('Crunch en polea', 'Core', 'Polea', 'Flexión controlada del tronco con resistencia.', ['Arrodíllate frente a la polea.', 'Acerca las costillas a la pelvis.', 'Regresa sin tirar con los brazos.'], ['Mover solo la cadera.', 'Tirar de la cuerda con los brazos.'], ['plank']),

  treadmill_walk: ex('Caminata en cinta', 'Cardio', 'Cardio', 'Trabajo cardiovascular de bajo impacto y fácil ajuste.', ['Empieza con velocidad cómoda.', 'Camina erguido sin agarrarte de forma constante.', 'Aumenta tiempo o inclinación poco a poco.'], ['Subir demasiado la velocidad.', 'Colgarse de las barras.'], ['stationary_bike', 'elliptical']),
  stationary_bike: ex('Bicicleta estática', 'Cardio', 'Cardio', 'Trabajo cardiovascular con poco impacto articular.', ['Ajusta el sillín para no cerrar demasiado la rodilla.', 'Pedalea con ritmo estable.', 'Aumenta la resistencia gradualmente.'], ['Sillín demasiado bajo.', 'Empezar con una resistencia excesiva.'], ['treadmill_walk', 'elliptical']),
  elliptical: ex('Elíptica', 'Cardio', 'Cardio', 'Cardio global de bajo impacto.', ['Mantén los pies apoyados.', 'Usa brazos y piernas de forma coordinada.', 'Mantén una postura erguida.'], ['Inclinarse sobre las asas.', 'Usar una resistencia que rompe el ritmo.'], ['stationary_bike', 'treadmill_walk']),
  rowing_machine: ex('Remo ergómetro', 'Cardio', 'Cardio', 'Cardio que combina empuje de piernas y tirón de brazos.', ['Empuja primero con las piernas.', 'Inclina ligeramente el torso y tira del agarre.', 'Regresa en orden inverso: brazos, torso y piernas.'], ['Tirar primero con los brazos.', 'Redondear en exceso la espalda.'], ['stationary_bike', 'elliptical'])
};



export const exerciseSynonyms = {
  leg_press: ['prensa', 'prensa 45', 'piernas'],
  goblet_squat: ['sentadilla copa', 'sentadilla mancuerna'],
  smith_squat: ['multipower', 'sentadilla guiada', 'smith'],
  leg_extension: ['extension de piernas', 'cuadriceps maquina'],
  split_squat: ['zancada', 'lunge', 'sentadilla bulgara sin banco'],
  step_up: ['subida cajon', 'subir banco'],
  leg_curl: ['femoral tumbado', 'curl piernas'],
  seated_leg_curl: ['femoral sentado'],
  romanian_deadlift: ['peso muerto rumano', 'rdl', 'femoral mancuernas'],
  hip_thrust: ['empuje de cadera', 'gluteos banco'],
  glute_bridge: ['puente gluteo'],
  hip_abduction: ['abductores', 'maquina gluteo'],
  cable_abduction: ['abduccion polea'],
  hip_adduction: ['aductores', 'maquina interior pierna'],
  calf_raise: ['gemelos', 'pantorrillas'],
  seated_calf_raise: ['gemelo sentado', 'soleo'],
  chest_press: ['press pecho maquina', 'pecho sentado'],
  dumbbell_press: ['press mancuernas', 'press plano'],
  barbell_bench_press: ['press banca', 'banca barra', 'bench press'],
  incline_dumbbell_press: ['press inclinado', 'pecho superior'],
  pec_deck: ['contractora', 'mariposa', 'aperturas maquina'],
  cable_fly: ['cruce poleas', 'aperturas polea'],
  push_up: ['flexion', 'lagartijas'],
  lat_pulldown: ['jalon', 'polea alta', 'lat pulldown', 'dorsal'],
  assisted_pullup: ['dominada maquina', 'dominada con ayuda'],
  seated_row: ['remo polea', 'remo bajo'],
  one_arm_row: ['remo mancuerna', 'serrucho'],
  chest_supported_row: ['remo pecho apoyado', 'remo maquina'],
  straight_arm_pulldown: ['pullover polea', 'jalon brazos rectos'],
  back_extension: ['hiperextension', 'lumbar banco'],
  face_pull: ['tiron a la cara', 'hombro posterior polea'],
  shoulder_press: ['press militar maquina', 'press hombro'],
  dumbbell_shoulder_press: ['press militar mancuernas'],
  lateral_raise: ['laterales', 'elevacion lateral'],
  cable_lateral_raise: ['lateral polea'],
  reverse_fly: ['pajaros', 'deltoide posterior'],
  front_raise: ['elevacion frontal'],
  biceps_curl: ['curl mancuerna', 'biceps mancuernas'],
  cable_curl: ['curl polea'],
  hammer_curl: ['martillo', 'curl neutro'],
  preacher_curl: ['predicador', 'scott'],
  triceps_pushdown: ['triceps polea', 'jalon triceps'],
  overhead_triceps: ['triceps por encima cabeza'],
  assisted_dip: ['fondos maquina', 'dip asistido'],
  close_grip_pushup: ['flexion cerrada', 'flexion triceps'],
  plank: ['plancha', 'abdominal isometrico'],
  dead_bug: ['bicho muerto', 'core tumbado'],
  bird_dog: ['perro pajaro', 'core cuadrupedia'],
  side_plank: ['plancha lateral'],
  pallof_press: ['pallof', 'antirotacion'],
  cable_crunch: ['abdominal polea', 'crunch polea'],
  treadmill_walk: ['cinta', 'caminar', 'treadmill'],
  stationary_bike: ['bicicleta', 'bici estatica'],
  elliptical: ['eliptica'],
  rowing_machine: ['remo cardio', 'ergometro']
};

const movementByName = [
  [/press|flexion|fondo/, 'press_horizontal'],
  [/militar|hombro|sobre la cabeza/, 'press_vertical'],
  [/apertura|pajaro|peck|cruce/, 'fly'],
  [/remo/, 'row'],
  [/jalon|dominada|pullover/, 'pull_vertical'],
  [/sentadilla|prensa|extension de cuadriceps/, 'squat'],
  [/zancada|subida al banco/, 'lunge'],
  [/peso muerto|buenos dias|hiperextension/, 'hinge'],
  [/curl femoral/, 'knee_flexion'],
  [/hip thrust|puente de gluteos|patada de gluteo/, 'hip_extension'],
  [/abduccion/, 'abduction'],
  [/aduccion/, 'adduction'],
  [/gemelo|pantorrilla|tibial/, 'calf'],
  [/curl/, 'curl'],
  [/triceps|extension de triceps/, 'triceps_extension'],
  [/plancha|dead bug|bird dog|pallof/, 'core_anti_extension'],
  [/crunch/, 'core_flexion'],
  [/cinta|bicicleta|eliptica|remo ergometro/, 'cardio'],
  [/elevacion|frontal|lateral/, 'raise']
];

function inferMovement(exercise = {}) {
  const text = `${exercise.name || ''} ${exercise.summary || ''}`.toLowerCase();
  return movementByName.find(([pattern]) => pattern.test(text))?.[1] || 'full_body';
}

function inferPrimaryMuscles(exercise = {}) {
  const muscle = exercise.muscle || 'Otros';
  const map = {
    'Hombro posterior': ['Hombro posterior'],
    'Espalda': ['Dorsales', 'Espalda media'],
    'Core': ['Abdominales'],
    'Cardio': ['Cardio']
  };
  return map[muscle] || [muscle];
}

function inferSecondaryMuscles(exercise = {}) {
  const movement = exercise.movement || inferMovement(exercise);
  const map = {
    press_horizontal: ['Tríceps', 'Hombro anterior'],
    press_vertical: ['Tríceps'],
    row: ['Bíceps'],
    pull_vertical: ['Bíceps'],
    squat: ['Glúteos'],
    lunge: ['Glúteos'],
    hinge: ['Glúteos', 'Espalda'],
    curl: ['Antebrazos'],
    core_anti_extension: [],
    cardio: ['Piernas']
  };
  return map[movement] || [];
}

function normalizeExerciseData(id, exercise = {}) {
  const movement = exercise.movement || exercise.visualType || inferMovement(exercise);
  return {
    name: exercise.name || 'Ejercicio sin nombre',
    muscle: exercise.muscle || 'Otros',
    equipment: exercise.equipment || 'Sin especificar',
    summary: exercise.summary || 'Ejercicio para trabajar de forma controlada el grupo muscular indicado.',
    steps: Array.isArray(exercise.steps) ? exercise.steps : [],
    mistakes: Array.isArray(exercise.mistakes) ? exercise.mistakes : [],
    alternatives: Array.isArray(exercise.alternatives) ? exercise.alternatives : [],
    synonyms: [
      ...(exerciseSynonyms[id] || []),
      ...(Array.isArray(exercise.synonyms) ? exercise.synonyms : [])
    ],
    level: exercise.level || 'Principiante',
    movement,
    visualType: exercise.visualType || movement,
    primaryMuscles: Array.isArray(exercise.primaryMuscles) && exercise.primaryMuscles.length ? exercise.primaryMuscles : inferPrimaryMuscles(exercise),
    secondaryMuscles: Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : inferSecondaryMuscles({ ...exercise, movement }),
    englishName: exercise.englishName || '',
    breathing: exercise.breathing || '',
    tempo: exercise.tempo || '',
    tips: Array.isArray(exercise.tips) ? exercise.tips : [],
    movementType: exercise.movementType || movement.replaceAll('_', ' '),
    location: Array.isArray(exercise.location) ? exercise.location : [],
    movementImages: exercise.movementImages || null,
    anatomyImages: exercise.anatomyImages || null,
    alternativeReasons: exercise.alternativeReasons || {},
    premium: Boolean(exercise.premium),
    premiumTier: exercise.premiumTier || '',
    realMotion: Boolean(exercise.realMotion),
    media: exercise.media || null,
    custom: Boolean(exercise.custom)
  };
}

export function getAllExercises(customExercises = []) {
  const custom = Object.fromEntries(
    customExercises.map((item) => [item.id, { ...item, custom: true }])
  );
  const baseMerged = { ...baseExerciseLibrary, ...extraExerciseLibrary };
  const enriched = Object.fromEntries(Object.entries(baseMerged).map(([id, exercise]) => [id, { ...exercise, ...(premiumExerciseData[id] || {}) }]));
  const merged = { ...enriched, ...custom };
  return Object.fromEntries(Object.entries(merged).map(([id, exercise]) => [id, normalizeExerciseData(id, exercise)]));
}

export function getExercise(id, customExercises = []) {
  return getAllExercises(customExercises)[id] || normalizeExerciseData(id, {
    name: 'Ejercicio no disponible',
    muscle: 'Otros',
    equipment: 'Sin especificar',
    summary: 'Este ejercicio ya no está disponible en la biblioteca.'
  });
}

export function searchableExerciseText(id, exercise) {
  return [
    id,
    exercise.name,
    exercise.englishName,
    exercise.muscle,
    exercise.equipment,
    exercise.summary,
    exercise.level,
    exercise.movement,
    exercise.movementType,
    ...(exercise.location || []),
    ...(exercise.primaryMuscles || []),
    ...(exercise.secondaryMuscles || []),
    ...(exerciseSynonyms[id] || []),
    ...(Array.isArray(exercise.synonyms) ? exercise.synonyms : [])
  ].join(' ');
}
