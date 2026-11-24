// Textos del video (español). Cifras verificadas con Apple (especificaciones
// técnicas) e iFixit (desmontaje del iPhone 16 Pro Max, sept. 2024).
const NB = ' '; // espacio fino para separar miles (4 685) sin romper línea

export const ORDER = [
  'backGlass', 'magsafe', 'cameraModule', 'logicBoard', 'battery',
  'taptic', 'bottomAssy', 'cameraControl', 'trueDepth', 'frame', 'display',
];

export const SHORT = {
  backGlass: 'Cristal trasero',
  magsafe: 'MagSafe',
  cameraModule: 'Módulo de cámaras',
  logicBoard: 'Placa lógica · A18 Pro',
  battery: 'Batería',
  taptic: 'Taptic Engine',
  bottomAssy: 'Altavoz y USB‑C',
  cameraControl: 'Control de Cámara',
  trueDepth: 'TrueDepth · Face ID',
  frame: 'Chasis de titanio',
  display: 'Pantalla',
};

export const CONTENT = {
  backGlass: {
    eyebrow: 'Exterior',
    title: 'Cristal trasero',
    lead: 'Lo primero que tocas: vidrio texturizado mate con el color integrado.',
    bullets: [
      'Meseta de cámaras con cubiertas de lente de cristal de zafiro',
      'Se desmonta por detrás, sin quitar la pantalla: reparación más sencilla',
      'Es vidrio y no metal, así deja pasar la carga inalámbrica',
    ],
  },
  magsafe: {
    eyebrow: 'Carga inalámbrica',
    title: 'MagSafe',
    lead: 'Un anillo de imanes y una bobina de cobre justo bajo el cristal.',
    bullets: [
      'Los imanes alinean cargadores, carteras y soportes',
      'La bobina transfiere energía por inducción',
      'El imán inferior fija la orientación de los accesorios',
      'Compatible también con cargadores Qi2 y Qi',
    ],
    stat: ['25 W', 'con cargador MagSafe y adaptador de 30 W'],
  },
  cameraModule: {
    eyebrow: 'Fotografía',
    title: 'Sistema de cámaras Pro',
    lead: 'Tres cámaras, escáner LiDAR y flash en un solo módulo.',
    bullets: [
      'Fusion 48 MP · ƒ/1.78 · 24 mm · estabilización por desplazamiento del sensor (2.ª gen.)',
      'Ultra gran angular 48 MP · ƒ/2.2 · 13 mm · 120°',
      'Teleobjetivo 5x · 12 MP · 120 mm · diseño tetraprisma',
      'Escáner LiDAR para enfoque rápido y profundidad',
    ],
    stat: ['4K 120', 'cps en Dolby Vision'],
  },
  logicBoard: {
    eyebrow: 'El cerebro',
    title: 'Placa lógica',
    lead: 'Dos placas apiladas tipo sándwich para ahorrar espacio.',
    bullets: [
      'Chip A18 Pro con tecnología de 3 nm de 2.ª generación',
      'CPU de 6 núcleos (2 de rendimiento + 4 de eficiencia) y GPU de 6 núcleos',
      'Neural Engine de 16 núcleos para Apple Intelligence',
      'Módem 5G Qualcomm (SDX71M) · Wi‑Fi 7 · UWB 2.ª gen. · NFC',
    ],
    stat: ['8 GB', 'de RAM · hasta 1 TB de almacenamiento'],
  },
  battery: {
    eyebrow: 'Energía',
    title: 'Batería',
    lead: 'La pieza más grande del interior.',
    bullets: [
      `Ion de litio de aprox. 4${NB}685 mAh`,
      'En el Pro Max va sin carcasa metálica (el 16 Pro sí la lleva)',
      'Se fija con lengüetas adhesivas que se estiran para retirarla',
    ],
    stat: ['33 h', 'de reproducción de video, según Apple'],
  },
  taptic: {
    eyebrow: 'Tacto',
    title: 'Taptic Engine',
    lead: 'Un motor lineal que convierte electricidad en vibraciones precisas.',
    bullets: [
      'Respuesta háptica en el teclado, alertas y gestos',
      'Golpes cortos y nítidos en lugar de un simple zumbido',
      'Ubicado en la parte inferior, junto al altavoz',
    ],
  },
  bottomAssy: {
    eyebrow: 'Sonido y conexión',
    title: 'Altavoz, micrófonos y USB‑C',
    lead: 'Todo lo que entra y sale por la parte inferior.',
    bullets: [
      'Sonido estéreo: altavoz inferior + auricular superior',
      '4 micrófonos con calidad de estudio',
      'USB‑C con USB 3: hasta 10 Gb/s (20 veces más que USB 2)',
      'Carga por cable y salida de video DisplayPort',
    ],
    stat: ['10 Gb/s', 'con un cable USB 3'],
  },
  cameraControl: {
    eyebrow: 'Nuevo en la serie 16',
    title: 'Control de Cámara',
    lead: 'Un botón hecho de capas de sensores bajo un cristal de zafiro.',
    bullets: [
      'Sensor de fuerza: distingue un toque ligero de una pulsación completa',
      'Sensor capacitivo: desliza el dedo para ajustar zoom o exposición',
      'Motor háptico propio que simula el “clic”',
      'Abre la cámara y dispara al instante',
    ],
  },
  trueDepth: {
    eyebrow: 'Cámara frontal',
    title: 'TrueDepth y Face ID',
    lead: 'Escondido dentro de la Dynamic Island.',
    bullets: [
      'Cámara frontal de 12 MP · ƒ/1.9 con enfoque automático',
      `Proyector de más de 30${NB}000 puntos infrarrojos invisibles`,
      'Iluminador y cámara infrarroja leen el relieve de tu cara',
      'Funciona incluso a oscuras',
    ],
  },
  frame: {
    eyebrow: 'Estructura',
    title: 'Chasis de titanio',
    lead: 'El esqueleto que lo sostiene todo.',
    bullets: [
      'Titanio de grado 5, aleación de calidad aeroespacial',
      'Subestructura de aluminio 100 % reciclado que ayuda a disipar el calor',
      'Arquitectura térmica rediseñada: hasta 20 % más rendimiento sostenido',
      'Integra antenas, Botón de Acción, volumen y botón lateral',
    ],
    stat: ['227 g', '163 × 77.6 × 8.25 mm'],
  },
  display: {
    eyebrow: 'Pantalla',
    title: 'Super Retina XDR',
    lead: 'Bordes más delgados que nunca en un producto Apple (2024).',
    bullets: [
      'OLED de 6.9″ · 2868 × 1320 px · 460 ppp',
      'ProMotion de 1 a 120 Hz y pantalla siempre activa',
      'Hasta 2000 nits en exteriores y solo 1 nit en la oscuridad',
      'Frente con Ceramic Shield de última generación',
    ],
    stat: ['6.9″', 'la más grande en un iPhone hasta 2024'],
  },
};
