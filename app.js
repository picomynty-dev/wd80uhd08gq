'use strict';

const STORAGE_KEY = 'myFitPlanStateV2';
const LEGACY_STORAGE_KEY = 'myFitPlanStateV1';
const app = document.querySelector('#app');
const installButton = document.querySelector('#installButton');
const profileShortcut = document.querySelector('#profileShortcut');
const root = document.documentElement;
let deferredInstallPrompt = null;
let currentView = 'home';
let libraryQuery = '';
let libraryMuscle = 'Todos';

const clone = (value) => JSON.parse(JSON.stringify(value));
const ex = (name, muscle, equipment, summary, steps, mistakes, alternatives = []) => ({
  name, muscle, equipment, summary, steps, mistakes, alternatives
});

const baseExerciseLibrary = {
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
  barbell_bench_press: ex('Press banca con barra', 'Pecho', 'Barra', 'Empuje horizontal con barra para pecho, hombro anterior y tríceps.', ['Coloca ojos debajo de la barra.', 'Retrae ligeramente los hombros y apoya los pies.', 'Baja hacia la zona media del pecho y sube con control.'], ['Entrenar sin seguros o ayuda cuando la carga es alta.', 'Rebotar la barra sobre el pecho.'], ['dumbbell_press', 'chest_press']),
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

const planTemplates = {
  2: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] }
  ],
  3: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Cuerpo completo C', exercises: ['leg_extension', 'shoulder_press', 'one_arm_row', 'hip_thrust', 'calf_raise', 'dead_bug'] }
  ],
  4: [
    { name: 'Torso A', exercises: ['chest_press', 'lat_pulldown', 'shoulder_press', 'seated_row', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Piernas A', exercises: ['leg_press', 'leg_curl', 'leg_extension', 'hip_abduction', 'calf_raise', 'plank'] },
    { name: 'Torso B', exercises: ['incline_dumbbell_press', 'one_arm_row', 'lateral_raise', 'straight_arm_pulldown', 'hammer_curl', 'overhead_triceps'] },
    { name: 'Piernas B', exercises: ['goblet_squat', 'romanian_deadlift', 'hip_thrust', 'split_squat', 'seated_calf_raise', 'dead_bug'] }
  ]
};

const defaultSettings = {
  accent: 'orange',
  appearance: 'system',
  compact: false,
  showTips: true,
  reduceMotion: false
};

const defaultState = {
  profile: null,
  settings: clone(defaultSettings),
  plan: null,
  nextWorkoutIndex: 0,
  activeWorkout: null,
  history: [],
  customExercises: [],
  createdAt: null
};

let state = loadState();
applySettings();
updateProfileShortcut();

function loadState() {
  try {
    const savedV2 = localStorage.getItem(STORAGE_KEY);
    if (savedV2) return normalizeState(JSON.parse(savedV2));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeState(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn('No se pudo cargar el progreso:', error);
  }
  return clone(defaultState);
}

function normalizeState(saved) {
  const normalized = {
    ...clone(defaultState),
    ...saved,
    settings: { ...clone(defaultSettings), ...(saved.settings || {}) },
    history: Array.isArray(saved.history) ? saved.history : [],
    customExercises: Array.isArray(saved.customExercises) ? saved.customExercises : [],
    profile: saved.profile ? {
      name: '', age: '', weight: '', height: '',
      ...saved.profile
    } : null
  };
  if (normalized.profile && !normalized.plan) normalized.plan = buildPlan(normalized.profile);
  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateProfileShortcut();
}

function applySettings() {
  root.dataset.accent = state.settings.accent || 'orange';
  root.dataset.theme = state.settings.appearance || 'system';
  root.classList.toggle('compact', Boolean(state.settings.compact));
  root.classList.toggle('reduce-motion', Boolean(state.settings.reduceMotion));
  const themeColors = { orange: '#f97316', blue: '#2563eb', green: '#16a34a', violet: '#7c3aed' };
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[state.settings.accent] || themeColors.orange);
}

function updateProfileShortcut() {
  profileShortcut.textContent = initials(state.profile?.name || 'My Fit');
}

function initials(name) {
  const parts = String(name || 'MF').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MF';
  return (parts[0][0] + (parts[1]?.[0] || parts[0][1] || '')).toUpperCase();
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  const toast = document.querySelector('#toastTemplate').content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2700);
}

function getAllExercises() {
  const custom = Object.fromEntries(state.customExercises.map((item) => [item.id, item]));
  return { ...baseExerciseLibrary, ...custom };
}

function getExercise(id) {
  return getAllExercises()[id] || ex('Ejercicio no disponible', 'Otro', 'Otro', 'Este ejercicio ya no está disponible en la biblioteca.', ['Consulta tu plan.'], [], []);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.bottom-nav [data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === view));
  const views = {
    home: renderHome,
    plan: renderPlan,
    workout: renderWorkout,
    library: renderExerciseLibrary,
    profile: renderProfile
  };
  (views[view] || renderHome)();
  window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? 'auto' : 'smooth' });
  app.focus({ preventScroll: true });
}

function objectiveLabel(value) {
  return ({ muscle: 'Ganar fuerza y músculo', fitness: 'Ponerme en forma', fat: 'Mejorar condición física' })[value] || value;
}

function trainingRules(profile) {
  if (profile.objective === 'muscle') return { sets: 3, reps: '8–12', rest: '75–90 s' };
  if (profile.objective === 'fat') return { sets: 3, reps: '12–15', rest: '45–60 s' };
  return { sets: 3, reps: '10–12', rest: '60–75 s' };
}

function buildPlan(profile) {
  const rules = trainingRules(profile);
  const maxExercises = profile.minutes === 30 ? 5 : profile.minutes === 45 ? 6 : 7;
  const template = planTemplates[profile.days] || planTemplates[3];

  return template.map((day, dayIndex) => ({
    id: `day-${dayIndex + 1}`,
    name: day.name,
    exercises: day.exercises.slice(0, maxExercises).map((exerciseId, index) => ({
      slotId: `${dayIndex}-${index}`,
      exerciseId,
      sets: ['plank', 'side_plank'].includes(exerciseId) ? 3 : rules.sets,
      reps: ['plank', 'side_plank'].includes(exerciseId) ? '20–35 s' : rules.reps,
      rest: rules.rest
    }))
  }));
}

function calculateBMI(profile = state.profile) {
  const weight = Number(profile?.weight);
  const heightCm = Number(profile?.height);
  if (!weight || !heightCm || weight < 30 || weight > 350 || heightCm < 120 || heightCm > 230) return null;
  return weight / ((heightCm / 100) ** 2);
}

function bmiInfo(value) {
  if (value < 18.5) return { label: 'Por debajo del rango de referencia', tone: 'warning', text: 'Puede ser útil revisar tu evolución y tus hábitos con un profesional, especialmente si ha habido pérdida de peso no buscada.' };
  if (value < 25) return { label: 'Dentro del rango de referencia', tone: 'success', text: 'El valor está dentro del rango de referencia habitual para adultos, aunque no resume por sí solo tu salud o composición corporal.' };
  if (value < 30) return { label: 'Por encima del rango de referencia', tone: 'warning', text: 'Tómalo como una señal orientativa. La masa muscular, la cintura y otros factores también influyen en la valoración.' };
  return { label: 'Rango elevado según el IMC', tone: 'danger', text: 'Conviene interpretar este resultado junto con otros datos y comentarlo con un profesional sanitario si te preocupa.' };
}

function renderHome() {
  if (!state.profile) {
    app.innerHTML = `
      <section class="page">
        <div class="hero">
          <p class="eyebrow">Empieza con un plan sencillo</p>
          <h1>Tu primera rutina, paso a paso.</h1>
          <p>Crea un plan inicial, consulta la técnica de cada ejercicio y registra tu progreso. Todo se guarda únicamente en este dispositivo.</p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" id="startButton">Crear mi plan</button>
            <button class="button button-secondary" type="button" id="demoButton">Ver una demo</button>
          </div>
        </div>

        <section class="section quick-actions">
          <button class="quick-action" type="button" data-nav="library"><span>⌕</span><small>Explorar ejercicios</small></button>
          <button class="quick-action" type="button" id="startQuick"><span>＋</span><small>Crear rutina</small></button>
          <button class="quick-action" type="button" data-nav="profile"><span>●</span><small>Mi perfil</small></button>
        </section>

        <section class="section grid grid-3">
          <article class="card"><span class="pill">1</span><h3>Elige tu objetivo</h3><p class="muted small">Fuerza, forma física o mejorar tu condición.</p></article>
          <article class="card"><span class="pill">2</span><h3>Consulta la técnica</h3><p class="muted small">Busca ejercicios y revisa pasos y errores frecuentes.</p></article>
          <article class="card"><span class="pill">3</span><h3>Registra avances</h3><p class="muted small">Guarda pesos, repeticiones y sesiones.</p></article>
        </section>

        <section class="section notice">My Fit Plan ofrece orientación general para adultos y no sustituye a un médico, fisioterapeuta o entrenador cualificado. Detén el ejercicio si aparece dolor.</section>
      </section>`;

    document.querySelector('#startButton').addEventListener('click', renderQuestionnaire);
    document.querySelector('#startQuick').addEventListener('click', renderQuestionnaire);
    document.querySelector('#demoButton').addEventListener('click', createDemoPlan);
    return;
  }

  const weeklyCompleted = sessionsThisWeek().length;
  const weeklyGoal = state.profile.days;
  const percentage = Math.min(100, Math.round((weeklyCompleted / weeklyGoal) * 100));
  const nextDay = state.plan[state.nextWorkoutIndex % state.plan.length];
  const bmi = calculateBMI();
  const bmiData = bmi ? bmiInfo(bmi) : null;
  const greeting = state.profile.name ? `Hola, ${esc(state.profile.name.split(' ')[0])}` : 'Tu siguiente paso';

  app.innerHTML = `
    <section class="page">
      <div class="hero">
        <p class="eyebrow">${greeting}</p>
        <h1>${esc(nextDay.name)}</h1>
        <p>${state.activeWorkout ? 'Tienes una sesión empezada. Continúa exactamente donde la dejaste.' : `Tu siguiente sesión de unos ${state.profile.minutes} minutos está preparada.`}</p>
        <div class="hero-actions">
          <button class="button button-primary" type="button" id="homeWorkoutButton">${state.activeWorkout ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}</button>
          <button class="button button-secondary" type="button" data-nav="plan">Ver plan</button>
        </div>
      </div>

      <section class="section grid grid-3">
        <article class="card metric-card"><span class="metric-icon">◷</span><div class="metric">${weeklyCompleted}/${weeklyGoal}</div><div class="metric-label">Sesiones esta semana</div></article>
        <article class="card metric-card"><span class="metric-icon">↗</span><div class="metric">${calculateStreak()}</div><div class="metric-label">Días de racha</div></article>
        <article class="card metric-card"><span class="metric-icon">✓</span><div class="metric">${state.history.length}</div><div class="metric-label">Entrenamientos totales</div></article>
      </section>

      <section class="section card card-accent">
        <div class="section-heading"><div><p class="eyebrow">Objetivo semanal</p><h2>${weeklyCompleted} de ${weeklyGoal} sesiones</h2></div><strong>${percentage}%</strong></div>
        <div class="progress-track" aria-label="Progreso semanal"><div class="progress-bar" style="width:${percentage}%"></div></div>
      </section>

      <section class="section grid grid-2">
        <article class="card">
          <div class="card-header"><div><p class="eyebrow">Medidas</p><h2>Tu IMC</h2></div>${bmiData ? `<span class="pill pill-${bmiData.tone}">${esc(bmiData.label)}</span>` : ''}</div>
          ${bmi ? `<div class="dashboard-bmi"><div class="bmi-circle">${bmi.toFixed(1)}</div><p class="muted small">${esc(bmiData.text)}</p></div>` : '<p class="muted">Añade tu peso y estatura para obtener un valor orientativo.</p><button class="button button-secondary button-small" type="button" data-nav="profile">Completar perfil</button>'}
        </article>
        <article class="card">
          <p class="eyebrow">Biblioteca</p><h2>${Object.keys(getAllExercises()).length} ejercicios</h2>
          <p class="muted small">Busca por nombre o músculo, consulta la técnica y añade ejercicios a tu sesión.</p>
          <button class="button button-secondary button-small" type="button" data-nav="library">Abrir biblioteca</button>
        </article>
      </section>

      <section class="section quick-actions">
        <button class="quick-action" type="button" data-nav="plan"><span>▤</span><small>Mi plan</small></button>
        <button class="quick-action" type="button" data-nav="library"><span>⌕</span><small>Ejercicios</small></button>
        <button class="quick-action" type="button" data-nav="profile"><span>⚙</span><small>Ajustes</small></button>
      </section>

      ${state.settings.showTips ? `<section class="section card card-accent"><p class="eyebrow">Consejo de entrenamiento</p><h2>Deja repeticiones en reserva</h2><p class="muted">Usa una carga que te permita terminar con buena técnica y sentir que todavía podrías hacer unas 2 o 3 repeticiones más.</p></section>` : ''}
    </section>`;

  document.querySelector('#homeWorkoutButton').addEventListener('click', () => setView('workout'));
}

function renderQuestionnaire() {
  const p = state.profile || {};
  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Configuración</p>
      <h1>${state.profile ? 'Actualiza tu plan' : 'Crea tu plan'}</h1>
      <p class="muted">Pensado para adultos principiantes que entrenan en gimnasio. Los datos físicos son opcionales y se guardan solo en este dispositivo.</p>

      <form id="planForm" class="card form-card form-grid">
        <div class="form-fields">
          <label class="field field-full"><span>Nombre o apodo (opcional)</span><input name="name" maxlength="30" autocomplete="nickname" value="${esc(p.name || '')}" placeholder="Ej. Raúl"></label>
          <label class="field"><span>Peso en kg (opcional)</span><input name="weight" inputmode="decimal" type="number" min="30" max="350" step="0.1" value="${esc(p.weight || '')}" placeholder="Ej. 75"></label>
          <label class="field"><span>Estatura en cm (opcional)</span><input name="height" inputmode="numeric" type="number" min="120" max="230" step="1" value="${esc(p.height || '')}" placeholder="Ej. 178"></label>
        </div>

        <fieldset class="fieldset">
          <legend>1. ¿Cuál es tu objetivo principal?</legend>
          <div class="option-grid">
            ${radioOption('objective', 'muscle', 'Fuerza y músculo', (p.objective || 'muscle') === 'muscle')}
            ${radioOption('objective', 'fitness', 'Ponerme en forma', p.objective === 'fitness')}
            ${radioOption('objective', 'fat', 'Mejorar condición', p.objective === 'fat')}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>2. ¿Cuántos días entrenarás?</legend>
          <div class="option-grid">
            ${radioOption('days', '2', '2 días', Number(p.days) === 2)}
            ${radioOption('days', '3', '3 días', !p.days || Number(p.days) === 3)}
            ${radioOption('days', '4', '4 días', Number(p.days) === 4)}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>3. ¿Cuánto tiempo tienes por sesión?</legend>
          <div class="option-grid">
            ${radioOption('minutes', '30', '30 minutos', Number(p.minutes) === 30)}
            ${radioOption('minutes', '45', '45 minutos', !p.minutes || Number(p.minutes) === 45)}
            ${radioOption('minutes', '60', '60 minutos', Number(p.minutes) === 60)}
          </div>
        </fieldset>

        <label class="consent-row" for="safetyCheck">
          <input id="safetyCheck" type="checkbox" required>
          <span><strong>Confirmación de mayoría de edad</strong><br>Confirmo que soy mayor de 18 años y que consultaré con un profesional si tengo una lesión, dolor o problema de salud.</span>
        </label>

        <button class="button button-primary button-block" type="submit">${state.profile ? 'Guardar y regenerar rutina' : 'Generar mi rutina'}</button>
      </form>
    </section>`;

  document.querySelector('#planForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const profile = {
      ...(state.profile || {}),
      name: String(formData.get('name') || '').trim(),
      weight: formData.get('weight') ? Number(formData.get('weight')) : '',
      height: formData.get('height') ? Number(formData.get('height')) : '',
      age: state.profile?.age || '',
      objective: formData.get('objective'),
      days: Number(formData.get('days')),
      minutes: Number(formData.get('minutes')),
      level: 'beginner',
      location: 'gym'
    };

    state.profile = profile;
    state.plan = buildPlan(profile);
    state.nextWorkoutIndex = 0;
    state.activeWorkout = null;
    state.createdAt ||= new Date().toISOString();
    saveState();
    showToast('Tu plan ya está preparado.');
    setView('plan');
  });
}

function radioOption(name, value, label, checked = false) {
  return `<div class="option"><input id="${name}-${value}" type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} required><label for="${name}-${value}">${label}</label></div>`;
}

function createDemoPlan() {
  const profile = { name: 'Demo', age: 25, weight: 75, height: 178, objective: 'fitness', days: 3, minutes: 45, level: 'beginner', location: 'gym' };
  state.profile = profile;
  state.plan = buildPlan(profile);
  state.nextWorkoutIndex = 0;
  state.activeWorkout = null;
  state.createdAt ||= new Date().toISOString();
  saveState();
  setView('plan');
  showToast('Demo creada. Puedes editarla desde Perfil.');
}

function renderPlan() {
  if (!state.plan) return renderLockedView('Aún no tienes un plan.', 'Crea tu primera rutina para ver esta sección.');

  const daysHtml = state.plan.map((day, index) => `
    <article class="card plan-day">
      <div class="card-header">
        <div><span class="pill">Día ${index + 1}</span><h2>${esc(day.name)}</h2></div>
        ${index === state.nextWorkoutIndex % state.plan.length ? '<span class="pill pill-success">Siguiente</span>' : ''}
      </div>
      <div>
        ${day.exercises.map((item) => {
          const exercise = getExercise(item.exerciseId);
          return `<button class="plan-exercise button-plain" type="button" data-exercise-details="${esc(item.exerciseId)}"><div><strong>${esc(exercise.name)}</strong><br><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small></div><small>${item.sets} × ${esc(item.reps)}</small></button>`;
        }).join('')}
      </div>
    </article>`).join('');

  app.innerHTML = `
    <section class="page">
      <div class="section-title-row"><div><p class="eyebrow">Plan de iniciación</p><h1>${state.profile.days} días · ${state.profile.minutes} minutos</h1></div><button class="button button-secondary button-small" type="button" id="editPlanButton">Editar</button></div>
      <p class="muted">Objetivo: ${esc(objectiveLabel(state.profile.objective))}. Sigue los días en orden y adapta el descanso a cómo te encuentres.</p>
      <div class="grid section">${daysHtml}</div>
      <section class="section notice">Pulsa cualquier ejercicio para ver su explicación. Las series y repeticiones son una guía inicial: prioriza siempre una técnica cómoda.</section>
      <section class="section grid grid-2"><button class="button button-secondary" type="button" data-nav="library">Buscar ejercicios</button><button class="button button-primary" type="button" id="planWorkoutButton">Ir al entrenamiento</button></section>
    </section>`;

  document.querySelector('#planWorkoutButton').addEventListener('click', () => setView('workout'));
  document.querySelector('#editPlanButton').addEventListener('click', renderQuestionnaire);
  bindExerciseDetailButtons();
}

function createActiveWorkout() {
  const dayIndex = state.nextWorkoutIndex % state.plan.length;
  const planDay = state.plan[dayIndex];
  state.activeWorkout = {
    id: `session-${Date.now()}`,
    planDayIndex: dayIndex,
    name: planDay.name,
    startedAt: new Date().toISOString(),
    exercises: planDay.exercises.map((item) => ({ ...item, completed: false, weight: '', actualReps: '' }))
  };
  saveState();
}

function renderWorkout() {
  if (!state.plan) return renderLockedView('Primero necesitas una rutina.', 'Crea tu plan antes de iniciar un entrenamiento.');
  if (!state.activeWorkout) createActiveWorkout();

  const workout = state.activeWorkout;
  const completed = workout.exercises.filter((item) => item.completed).length;
  const percentage = Math.round((completed / workout.exercises.length) * 100);

  app.innerHTML = `
    <section class="page">
      <div class="section-title-row"><div><p class="eyebrow">Entrenamiento en curso</p><h1>${esc(workout.name)}</h1></div><button class="button button-secondary button-small" type="button" data-nav="library">＋ Ejercicio</button></div>
      <div class="section-heading"><p class="muted">${completed} de ${workout.exercises.length} ejercicios</p><strong>${percentage}%</strong></div>
      <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>

      <div class="workout-list section">${workout.exercises.map((item, index) => exerciseCard(item, index)).join('')}</div>

      <section class="section grid grid-2">
        <button class="button button-secondary" type="button" id="pauseWorkoutButton">Guardar y salir</button>
        <button class="button button-primary" type="button" id="finishWorkoutButton" ${completed === 0 ? 'disabled' : ''}>Finalizar sesión</button>
      </section>
    </section>`;

  document.querySelectorAll('[data-complete]').forEach((button) => button.addEventListener('click', toggleExercise));
  document.querySelectorAll('[data-swap]').forEach((button) => button.addEventListener('click', openSwapModal));
  document.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('change', updateExerciseField));
  document.querySelectorAll('[data-remove-workout]').forEach((button) => button.addEventListener('click', removeWorkoutExercise));
  document.querySelector('#pauseWorkoutButton').addEventListener('click', () => { saveState(); setView('home'); showToast('Entrenamiento guardado.'); });
  document.querySelector('#finishWorkoutButton').addEventListener('click', finishWorkout);
  bindExerciseDetailButtons();
}

function exerciseCard(item, index) {
  const exercise = getExercise(item.exerciseId);
  const last = lastPerformance(item.exerciseId);
  return `
    <article class="card exercise-card ${item.completed ? 'completed' : ''}">
      <div class="exercise-title">
        <div><span class="pill">${index + 1}</span><h3>${esc(exercise.name)}</h3></div>
        ${item.completed ? '<span class="pill pill-success">Hecho</span>' : ''}
      </div>
      <div class="exercise-meta"><span class="pill">${item.sets} series</span><span class="pill">${esc(item.reps)} reps</span><span class="pill">${esc(item.rest)}</span></div>
      ${state.settings.showTips ? `<p class="exercise-note">${esc(exercise.summary)}</p>` : ''}
      ${last ? `<p class="last-performance">Última vez: ${esc(last.weight || '—')} kg · ${esc(last.actualReps || '—')} reps</p>` : ''}
      <div class="exercise-controls">
        <label>Peso usado (kg)<input inputmode="decimal" type="number" min="0" step="0.5" value="${esc(item.weight)}" data-field="weight" data-index="${index}" placeholder="Ej. 20"></label>
        <label>Reps logradas<input inputmode="numeric" type="number" min="0" step="1" value="${esc(item.actualReps)}" data-field="actualReps" data-index="${index}" placeholder="Ej. 10"></label>
      </div>
      <div class="exercise-actions">
        <button class="button button-primary check-button ${item.completed ? 'completed' : ''}" type="button" data-complete="${index}">${item.completed ? 'Desmarcar' : 'Completar'}</button>
        <button class="button button-secondary" type="button" data-exercise-details="${esc(item.exerciseId)}">Ver técnica</button>
        <button class="button button-secondary" type="button" data-swap="${index}" ${exercise.alternatives.length ? '' : 'disabled'}>Cambiar</button>
        ${item.slotId?.startsWith('added-') ? `<button class="button button-ghost" type="button" data-remove-workout="${index}">Quitar</button>` : ''}
      </div>
    </article>`;
}

function lastPerformance(exerciseId) {
  for (const session of state.history) {
    const found = session.exercises?.find((item) => item.exerciseId === exerciseId);
    if (found) return found;
  }
  return null;
}

function updateExerciseField(event) {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  state.activeWorkout.exercises[index][field] = event.target.value;
  saveState();
}

function toggleExercise(event) {
  const index = Number(event.currentTarget.dataset.complete);
  state.activeWorkout.exercises[index].completed = !state.activeWorkout.exercises[index].completed;
  saveState();
  renderWorkout();
}

function openSwapModal(event) {
  const index = Number(event.currentTarget.dataset.swap);
  const current = state.activeWorkout.exercises[index];
  const exercise = getExercise(current.exerciseId);
  const alternatives = exercise.alternatives.map((id) => ({ id, ...getExercise(id) }));
  if (!alternatives.length) return;

  openModal(`
    <div class="modal-header"><div><p class="eyebrow">Sustituir ejercicio</p><h2>${esc(exercise.name)}</h2><p class="muted small">Elige una alternativa similar.</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <div class="alternative-list">
      ${alternatives.map((item) => `<button class="alternative-button" type="button" data-replace-index="${index}" data-replace-id="${esc(item.id)}"><span><strong>${esc(item.name)}</strong><br><small>${esc(item.muscle)} · ${esc(item.equipment)}</small></span><span>›</span></button>`).join('')}
    </div>
  `);

  document.querySelectorAll('[data-replace-index]').forEach((button) => button.addEventListener('click', replaceWorkoutExercise));
}

function replaceWorkoutExercise(event) {
  const index = Number(event.currentTarget.dataset.replaceIndex);
  const nextId = event.currentTarget.dataset.replaceId;
  const current = state.activeWorkout.exercises[index];
  current.exerciseId = nextId;
  current.completed = false;
  current.weight = '';
  current.actualReps = '';
  saveState();
  closeModal();
  renderWorkout();
  showToast(`Ejercicio cambiado por ${getExercise(nextId).name}.`);
}

function removeWorkoutExercise(event) {
  const index = Number(event.currentTarget.dataset.removeWorkout);
  state.activeWorkout.exercises.splice(index, 1);
  saveState();
  renderWorkout();
  showToast('Ejercicio retirado de la sesión.');
}

function finishWorkout() {
  const workout = state.activeWorkout;
  const completedExercises = workout.exercises.filter((item) => item.completed);
  const session = {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    finishedAt: new Date().toISOString(),
    completedCount: completedExercises.length,
    totalCount: workout.exercises.length,
    exercises: completedExercises.map((item) => ({
      exerciseId: item.exerciseId,
      exerciseName: getExercise(item.exerciseId).name,
      weight: item.weight,
      actualReps: item.actualReps
    }))
  };

  state.history.unshift(session);
  state.nextWorkoutIndex = (state.nextWorkoutIndex + 1) % state.plan.length;
  state.activeWorkout = null;
  saveState();
  showToast('Entrenamiento registrado. Buen trabajo.');
  setView('profile');
}

function sessionsThisWeek() {
  const now = new Date();
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7;
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return state.history.filter((session) => new Date(session.finishedAt) >= start);
}

function calculateStreak() {
  if (!state.history.length) return 0;
  const dates = [...new Set(state.history.map((session) => new Date(session.finishedAt).toISOString().slice(0, 10)))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const latest = new Date(`${dates[0]}T00:00:00`);
  const differenceDays = Math.round((cursor - latest) / 86400000);
  if (differenceDays > 1) return 0;
  if (differenceDays === 1) cursor = latest;

  for (const dateString of dates) {
    const date = new Date(`${dateString}T00:00:00`);
    if (date.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (date < cursor) break;
  }
  return streak;
}

function renderExerciseLibrary() {
  app.innerHTML = `
    <section class="page">
      <div class="section-title-row"><div><p class="eyebrow">Biblioteca</p><h1>Ejercicios</h1></div><button class="button button-primary button-small" type="button" id="addCustomButton">＋ Crear</button></div>
      <p class="muted">Busca por nombre o grupo muscular, consulta la técnica y añade ejercicios a tu entrenamiento actual.</p>

      <section class="section library-toolbar">
        <div class="search-wrap"><input id="exerciseSearch" class="search-input" type="search" value="${esc(libraryQuery)}" placeholder="Buscar: press, espalda, polea…" autocomplete="off"></div>
        <select id="muscleSelect" class="filter-select" aria-label="Filtrar por músculo"></select>
      </section>
      <div id="muscleChips" class="filter-chips"></div>
      <div id="libraryResults" class="exercise-library-list section"></div>
    </section>`;

  const muscles = ['Todos', ...new Set(Object.values(getAllExercises()).map((item) => item.muscle))];
  const select = document.querySelector('#muscleSelect');
  select.innerHTML = muscles.map((muscle) => `<option value="${esc(muscle)}" ${muscle === libraryMuscle ? 'selected' : ''}>${esc(muscle)}</option>`).join('');
  document.querySelector('#muscleChips').innerHTML = muscles.map((muscle) => `<button class="filter-chip ${muscle === libraryMuscle ? 'active' : ''}" type="button" data-muscle="${esc(muscle)}">${esc(muscle)}</button>`).join('');

  document.querySelector('#exerciseSearch').addEventListener('input', (event) => { libraryQuery = event.target.value; renderLibraryResults(); });
  select.addEventListener('change', (event) => { libraryMuscle = event.target.value; renderExerciseLibrary(); });
  document.querySelectorAll('[data-muscle]').forEach((button) => button.addEventListener('click', () => { libraryMuscle = button.dataset.muscle; renderExerciseLibrary(); }));
  document.querySelector('#addCustomButton').addEventListener('click', openCustomExerciseModal);
  renderLibraryResults();
}

function renderLibraryResults() {
  const container = document.querySelector('#libraryResults');
  if (!container) return;
  const query = libraryQuery.trim().toLocaleLowerCase('es');
  const entries = Object.entries(getAllExercises())
    .filter(([, item]) => libraryMuscle === 'Todos' || item.muscle === libraryMuscle)
    .filter(([, item]) => !query || [item.name, item.muscle, item.equipment, item.summary].join(' ').toLocaleLowerCase('es').includes(query))
    .sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));

  if (!entries.length) {
    container.innerHTML = `<div class="card empty-state"><div class="empty-icon">⌕</div><h3>No encontramos ese ejercicio</h3><p class="muted">Prueba otra palabra o crea tu propio ejercicio.</p><button class="button button-primary" type="button" id="emptyCreateButton">Crear ejercicio</button></div>`;
    document.querySelector('#emptyCreateButton').addEventListener('click', openCustomExerciseModal);
    return;
  }

  container.innerHTML = entries.map(([id, item]) => `
    <article class="card library-card">
      <div class="library-card-top"><div><div class="exercise-meta"><span class="pill">${esc(item.muscle)}</span><span class="pill pill-neutral">${esc(item.equipment)}</span>${item.isCustom ? '<span class="pill pill-warning">Personalizado</span>' : ''}</div><h3>${esc(item.name)}</h3></div></div>
      <p class="muted small">${esc(item.summary)}</p>
      <div class="library-card-actions">
        <button class="button button-secondary button-small" type="button" data-exercise-details="${esc(id)}">Ver técnica</button>
        <button class="button button-primary button-small" type="button" data-add-exercise="${esc(id)}" ${state.plan ? '' : 'disabled'}>Añadir al entreno</button>
        ${item.isCustom ? `<button class="button button-ghost button-small" type="button" data-delete-custom="${esc(id)}">Eliminar</button>` : ''}
      </div>
    </article>`).join('');

  bindExerciseDetailButtons();
  document.querySelectorAll('[data-add-exercise]').forEach((button) => button.addEventListener('click', addExerciseToWorkout));
  document.querySelectorAll('[data-delete-custom]').forEach((button) => button.addEventListener('click', deleteCustomExercise));
}

function addExerciseToWorkout(event) {
  const exerciseId = event.currentTarget.dataset.addExercise;
  if (!state.plan) return showToast('Primero crea un plan.');
  if (!state.activeWorkout) createActiveWorkout();
  const rules = trainingRules(state.profile);
  state.activeWorkout.exercises.push({
    slotId: `added-${Date.now()}`,
    exerciseId,
    sets: rules.sets,
    reps: rules.reps,
    rest: rules.rest,
    completed: false,
    weight: '',
    actualReps: ''
  });
  saveState();
  showToast(`${getExercise(exerciseId).name} añadido al entrenamiento.`);
}

function openCustomExerciseModal() {
  const muscles = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Core', 'Cardio', 'Otro'];
  const equipment = ['Máquina', 'Mancuernas', 'Barra', 'Polea', 'Peso corporal', 'Banco', 'Cardio', 'Otro'];
  openModal(`
    <div class="modal-header"><div><p class="eyebrow">Ejercicio personalizado</p><h2>Crear ejercicio</h2><p class="muted small">Se guardará únicamente en este dispositivo.</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="customExerciseForm" class="form-grid section">
      <div class="form-fields">
        <label class="field field-full"><span>Nombre</span><input name="name" required maxlength="60" placeholder="Ej. Remo en máquina de mi gimnasio"></label>
        <label class="field"><span>Grupo muscular</span><select name="muscle">${muscles.map((item) => `<option>${item}</option>`).join('')}</select></label>
        <label class="field"><span>Material</span><select name="equipment">${equipment.map((item) => `<option>${item}</option>`).join('')}</select></label>
        <label class="field field-full"><span>Explicación o recordatorio</span><textarea name="summary" required maxlength="350" placeholder="Describe cómo colocarte y ejecutar el movimiento…"></textarea></label>
      </div>
      <button class="button button-primary button-block" type="submit">Guardar ejercicio</button>
    </form>
  `);
  document.querySelector('#customExerciseForm').addEventListener('submit', saveCustomExercise);
}

function saveCustomExercise(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = `custom-${Date.now()}`;
  state.customExercises.push({
    id,
    isCustom: true,
    name: String(data.get('name')).trim(),
    muscle: data.get('muscle'),
    equipment: data.get('equipment'),
    summary: String(data.get('summary')).trim(),
    steps: [String(data.get('summary')).trim()],
    mistakes: ['Usa una carga y un recorrido que puedas controlar.'],
    alternatives: []
  });
  saveState();
  closeModal();
  libraryQuery = '';
  libraryMuscle = 'Todos';
  renderExerciseLibrary();
  showToast('Ejercicio personalizado guardado.');
}

function deleteCustomExercise(event) {
  const id = event.currentTarget.dataset.deleteCustom;
  const usedInPlan = state.plan?.some((day) => day.exercises.some((item) => item.exerciseId === id));
  const usedInWorkout = state.activeWorkout?.exercises.some((item) => item.exerciseId === id);
  if (usedInPlan || usedInWorkout) return showToast('Quita este ejercicio del plan o entrenamiento antes de eliminarlo.');
  if (!window.confirm('¿Eliminar este ejercicio personalizado?')) return;
  state.customExercises = state.customExercises.filter((item) => item.id !== id);
  saveState();
  renderLibraryResults();
  showToast('Ejercicio eliminado.');
}

function bindExerciseDetailButtons() {
  document.querySelectorAll('[data-exercise-details]').forEach((button) => button.addEventListener('click', () => openExerciseDetails(button.dataset.exerciseDetails)));
}

function openExerciseDetails(id) {
  const exercise = getExercise(id);
  openModal(`
    <div class="modal-header"><div><div class="exercise-meta"><span class="pill">${esc(exercise.muscle)}</span><span class="pill pill-neutral">${esc(exercise.equipment)}</span></div><h2>${esc(exercise.name)}</h2><p class="muted">${esc(exercise.summary)}</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <section class="section"><p class="eyebrow">Cómo hacerlo</p><ol class="modal-list">${exercise.steps.map((item) => `<li>${esc(item)}</li>`).join('')}</ol></section>
    <section class="section"><p class="eyebrow">Errores frecuentes</p><ul class="modal-list">${exercise.mistakes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>
    <section class="section notice">La explicación es general. Detén el ejercicio si aparece dolor y pide ayuda a un profesional si no estás seguro de la técnica.</section>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cerrar</button>${state.plan ? `<button class="button button-primary" type="button" data-modal-add="${esc(id)}">Añadir al entreno</button>` : ''}</div>
  `);
  document.querySelector('[data-modal-add]')?.addEventListener('click', (event) => {
    const exerciseId = event.currentTarget.dataset.modalAdd;
    addExerciseToWorkout({ currentTarget: { dataset: { addExercise: exerciseId } } });
    closeModal();
  });
}

function openModal(content) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'appModal';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${content}</div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop || event.target.closest('[data-close-modal]')) closeModal(); });
  document.addEventListener('keydown', escapeModal);
}

function escapeModal(event) {
  if (event.key === 'Escape') closeModal();
}

function closeModal() {
  document.querySelector('#appModal')?.remove();
  document.removeEventListener('keydown', escapeModal);
}

function renderProfile() {
  if (!state.profile) {
    app.innerHTML = `<section class="page empty-state card"><div class="empty-icon">●</div><h1>Crea tu perfil</h1><p class="muted">Configura tu plan y añade tus medidas opcionales para personalizar la experiencia.</p><button class="button button-primary" type="button" id="profileStartButton">Empezar</button></section>`;
    document.querySelector('#profileStartButton').addEventListener('click', renderQuestionnaire);
    return;
  }

  const totalExercises = state.history.reduce((sum, session) => sum + session.completedCount, 0);
  const weeklyCompleted = sessionsThisWeek().length;
  const percentage = Math.min(100, Math.round((weeklyCompleted / state.profile.days) * 100));
  const bmi = calculateBMI();
  const bmiData = bmi ? bmiInfo(bmi) : null;
  const historyHtml = state.history.length ? state.history.slice(0, 10).map((session) => `
    <div class="history-item"><div><strong>${esc(session.name)}</strong><br><small class="muted">${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(session.finishedAt))}</small></div><span class="pill pill-success">${session.completedCount}/${session.totalCount}</span></div>`).join('') : '<div class="empty-state"><div class="empty-icon">↗</div><h3>Aún no hay sesiones</h3><p class="muted">Tu historial aparecerá cuando finalices el primer entrenamiento.</p></div>';

  app.innerHTML = `
    <section class="page">
      <section class="card profile-header">
        <div class="profile-avatar">${initials(state.profile.name || 'My Fit')}</div>
        <div><p class="eyebrow">Tu espacio</p><h1>${esc(state.profile.name || 'Mi perfil')}</h1><p class="muted small">${esc(objectiveLabel(state.profile.objective))} · ${state.profile.days} días por semana</p></div>
      </section>

      <section class="section grid grid-3">
        <article class="card metric-card"><div class="metric">${state.history.length}</div><div class="metric-label">Sesiones</div></article>
        <article class="card metric-card"><div class="metric">${totalExercises}</div><div class="metric-label">Ejercicios hechos</div></article>
        <article class="card metric-card"><div class="metric">${calculateStreak()}</div><div class="metric-label">Días de racha</div></article>
      </section>

      <section class="section card card-accent">
        <div class="section-heading"><div><p class="eyebrow">Objetivo semanal</p><h2>${weeklyCompleted} de ${state.profile.days}</h2></div><strong>${percentage}%</strong></div>
        <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>
      </section>

      <section class="section card">
        <div class="card-header"><div><p class="eyebrow">Datos personales</p><h2>Perfil y medidas</h2></div><button class="button button-secondary button-small" type="button" id="editProfileButton">Editar plan</button></div>
        <form id="profileForm" class="form-grid section">
          <div class="form-fields">
            <label class="field field-full"><span>Nombre o apodo</span><input name="name" maxlength="30" value="${esc(state.profile.name || '')}" placeholder="Tu nombre"></label>
            <label class="field"><span>Edad</span><input name="age" type="number" inputmode="numeric" min="18" max="99" value="${esc(state.profile.age || '')}" placeholder="Ej. 25"></label>
            <label class="field"><span>Peso en kg</span><input name="weight" type="number" inputmode="decimal" min="30" max="350" step="0.1" value="${esc(state.profile.weight || '')}" placeholder="Ej. 75"></label>
            <label class="field"><span>Estatura en cm</span><input name="height" type="number" inputmode="numeric" min="120" max="230" value="${esc(state.profile.height || '')}" placeholder="Ej. 178"></label>
          </div>
          <button class="button button-primary button-block" type="submit">Guardar datos</button>
        </form>
      </section>

      <section class="section card">
        <div class="card-header"><div><p class="eyebrow">Medida orientativa</p><h2>Índice de masa corporal</h2></div>${bmiData ? `<span class="pill pill-${bmiData.tone}">${esc(bmiData.label)}</span>` : ''}</div>
        ${bmi ? `<div class="dashboard-bmi section"><div class="bmi-circle">${bmi.toFixed(1)}</div><div><p>${esc(bmiData.text)}</p><p class="muted small">El IMC relaciona peso y estatura, pero no diferencia grasa, músculo o masa ósea. No es un diagnóstico.</p></div></div>` : '<p class="muted">Introduce peso y estatura para calcularlo.</p>'}
      </section>

      <section class="section card">
        <p class="eyebrow">Personalización</p><h2>Ajustes</h2>
        <div class="settings-row"><div class="settings-copy"><strong>Color principal</strong><small>Elige el tono de botones y detalles.</small></div></div>
        <div class="color-options">
          ${colorOption('orange', 'Naranja', 'swatch-orange')}${colorOption('blue', 'Azul', 'swatch-blue')}${colorOption('green', 'Verde', 'swatch-green')}${colorOption('violet', 'Violeta', 'swatch-violet')}
        </div>
        <div class="settings-row section"><div class="settings-copy"><strong>Apariencia</strong><small>Clara, oscura o según el iPhone.</small></div><select id="appearanceSelect" class="filter-select"><option value="system" ${state.settings.appearance === 'system' ? 'selected' : ''}>Sistema</option><option value="light" ${state.settings.appearance === 'light' ? 'selected' : ''}>Clara</option><option value="dark" ${state.settings.appearance === 'dark' ? 'selected' : ''}>Oscura</option></select></div>
        ${settingSwitch('compactSetting', 'Vista compacta', 'Reduce espacios y tamaño de las tarjetas.', state.settings.compact)}
        ${settingSwitch('tipsSetting', 'Mostrar consejos', 'Muestra recordatorios de técnica y progresión.', state.settings.showTips)}
        ${settingSwitch('motionSetting', 'Reducir animaciones', 'Desactiva la mayoría de movimientos visuales.', state.settings.reduceMotion)}
      </section>

      <section class="section card">
        <div class="card-header"><div><p class="eyebrow">Últimas sesiones</p><h2>Historial</h2></div></div>
        ${historyHtml}
      </section>

      <section class="section card">
        <p class="eyebrow">Privacidad</p><h2>Datos de la aplicación</h2>
        <p class="muted small">Tu información se guarda localmente en este dispositivo. Si eliminas la app o los datos de Safari, podrías perderla.</p>
        <button class="button button-danger button-block" type="button" id="resetButton">Borrar todos mis datos</button>
      </section>
    </section>`;

  document.querySelector('#editProfileButton').addEventListener('click', renderQuestionnaire);
  document.querySelector('#profileForm').addEventListener('submit', saveProfileData);
  document.querySelectorAll('input[name="accent"]').forEach((input) => input.addEventListener('change', saveSettings));
  document.querySelector('#appearanceSelect').addEventListener('change', saveSettings);
  document.querySelector('#compactSetting').addEventListener('change', saveSettings);
  document.querySelector('#tipsSetting').addEventListener('change', saveSettings);
  document.querySelector('#motionSetting').addEventListener('change', saveSettings);
  document.querySelector('#resetButton').addEventListener('click', resetData);
}

function colorOption(value, label, swatchClass) {
  return `<label class="color-option" title="${label}"><input type="radio" name="accent" value="${value}" ${state.settings.accent === value ? 'checked' : ''}><span class="color-swatch ${swatchClass}">${state.settings.accent === value ? '✓' : ''}</span></label>`;
}

function settingSwitch(id, title, subtitle, checked) {
  return `<div class="settings-row"><div class="settings-copy"><strong>${title}</strong><small>${subtitle}</small></div><label class="switch"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><span></span></label></div>`;
}

function saveProfileData(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.profile.name = String(data.get('name') || '').trim();
  state.profile.age = data.get('age') ? Number(data.get('age')) : '';
  state.profile.weight = data.get('weight') ? Number(data.get('weight')) : '';
  state.profile.height = data.get('height') ? Number(data.get('height')) : '';
  saveState();
  renderProfile();
  showToast('Perfil actualizado.');
}

function saveSettings() {
  state.settings.accent = document.querySelector('input[name="accent"]:checked')?.value || state.settings.accent;
  state.settings.appearance = document.querySelector('#appearanceSelect')?.value || state.settings.appearance;
  state.settings.compact = Boolean(document.querySelector('#compactSetting')?.checked);
  state.settings.showTips = Boolean(document.querySelector('#tipsSetting')?.checked);
  state.settings.reduceMotion = Boolean(document.querySelector('#motionSetting')?.checked);
  saveState();
  applySettings();
  renderProfile();
  showToast('Ajustes guardados.');
}

function resetData() {
  const confirmed = window.confirm('Se borrarán tu plan, registros, ejercicios personalizados y ajustes de este dispositivo. ¿Continuar?');
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  state = clone(defaultState);
  applySettings();
  updateProfileShortcut();
  showToast('Datos borrados.');
  setView('home');
}

function renderLockedView(title, description) {
  app.innerHTML = `
    <section class="page empty-state card">
      <div class="empty-icon">＋</div>
      <h1>${esc(title)}</h1>
      <p class="muted">${esc(description)}</p>
      <button class="button button-primary" type="button" id="lockedStartButton">Crear mi plan</button>
    </section>`;
  document.querySelector('#lockedStartButton').addEventListener('click', renderQuestionnaire);
}

// Navegación global

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-nav]');
  if (button) setView(button.dataset.nav);
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  showToast('My Fit Plan se ha instalado.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => console.warn('Service worker no registrado:', error));
  });
}

setView('home');
