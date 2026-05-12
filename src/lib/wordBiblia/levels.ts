export interface Theme {
  id: string;
  name: string;
  levelsCount: number;
  wordsPool: string[];
  mediumWordsPool: string[];
  hardWordsPool: string[];
}

export const THEMES: Theme[] = [
  {
    id: 'genesis',
    name: 'La Creacion y Genesis',
    levelsCount: 15,
    wordsPool: ['LUZ', 'DIA', 'MAR', 'SOL', 'AVE', 'PEZ', 'EVA', 'NOE', 'ARCA', 'DIOS', 'ANO', 'ROCA', 'SAL', 'VOZ', 'FUEGO', 'AGUA', 'HIJO', 'SEDE', 'ORO', 'PAN'],
    mediumWordsPool: ['TIERRA', 'CIELO', 'ARBOL', 'ADAN', 'CAIN', 'ABEL', 'LLUVIA', 'POLVO', 'FRUTO', 'HUERTO', 'COSTILLA', 'OVEJA', 'MUNDO', 'CREAR', 'ALIENTO', 'SUENO'],
    hardWordsPool: ['PRINCIPIO', 'SERPIENTE', 'DILUVIO', 'ARCOIRIS', 'PATRIARCA', 'CREACION', 'MULTIPLICAR', 'DESCANSO', 'GENERACION', 'DESCENDENCIA'],
  },
  {
    id: 'exodo',
    name: 'Exodo y La Ley',
    levelsCount: 20,
    wordsPool: ['LEY', 'MAR', 'PAN', 'ORO', 'NUBE', 'VARA', 'ROCA', 'VOZ', 'SED', 'VIDA', 'VID', 'MIEL', 'VINO', 'LUZ'],
    mediumWordsPool: ['MOISES', 'AARON', 'PLAGAS', 'SANGRE', 'PASCUA', 'MANA', 'TABLAS', 'SINAI', 'DESIERTO', 'LIBERTAD', 'ESCLAVO', 'CODORNIZ', 'TIENDA'],
    hardWordsPool: ['MANDAMIENTOS', 'TABERNACULO', 'SACERDOTE', 'FARAON', 'ALIANZA', 'REDENCION', 'LIBERACION', 'TESTIMONIO', 'EXPIACION'],
  },
  {
    id: 'reyes',
    name: 'Jueces y Reyes',
    levelsCount: 20,
    wordsPool: ['REY', 'PAZ', 'ORO', 'LEON', 'JUEZ', 'GIG', 'HONDA', 'LIR', 'PIEDRA', 'VIDA', 'DIOS'],
    mediumWordsPool: ['DAVID', 'SAUL', 'SAMUEL', 'TEMPLO', 'ISRAEL', 'JUDA', 'SANSON', 'GOLIAT', 'PROFETA', 'CORONA', 'TRONO', 'ESPADA', 'GUERRERO'],
    hardWordsPool: ['SALOMON', 'SABIDURIA', 'CORONA', 'EJERCITO', 'FILISTEOS', 'BABILONIA', 'REBELION', 'SANTUARIO', 'SOBERANOS'],
  },
  {
    id: 'profetas',
    name: 'Los Profetas',
    levelsCount: 25,
    wordsPool: ['VOZ', 'AYUNO', 'LUZ', 'PAZ', 'SENOR', 'VER', 'FUEGO', 'OIR', 'PAN', 'LEON', 'COPA'],
    mediumWordsPool: ['ELIAS', 'ELISEO', 'ISAIAS', 'VISION', 'SUENO', 'ALTAR', 'LLAMADO', 'DIOSES', 'CARRO', 'PROMESA', 'TRIBUNAL', 'MUNDO'],
    hardWordsPool: ['JEREMIAS', 'EZEQUIEL', 'PROFECIA', 'BABILONIA', 'ARREPENTIMIENTO', 'REVELACION', 'ADVERTENCIA', 'ESPERANZA', 'TESTIMONIO'],
  },
  {
    id: 'evangelios',
    name: 'Los Evangelios',
    levelsCount: 25,
    wordsPool: ['CRUZ', 'FE', 'PAN', 'VID', 'AGUA', 'LUZ', 'AMOR', 'RIO', 'MAR', 'SENOR', 'PAZ', 'VI', 'VIDA'],
    mediumWordsPool: ['JESUS', 'PEDRO', 'JUAN', 'MATEO', 'LUCAS', 'MILAGRO', 'CIEGO', 'SANGRE', 'DISCIPULO', 'MAESTRO', 'CORONA', 'PERDON', 'CAMINO'],
    hardWordsPool: ['PARABOLA', 'RESURRECCION', 'SALVACION', 'BAUTISMO', 'CRUCIFIXION', 'GETSEMANI', 'TRANSFIGURACION', 'EVANGELIO', 'MESIAS'],
  },
  {
    id: 'hechos',
    name: 'Hechos de los Apostoles',
    levelsCount: 25,
    wordsPool: ['DON', 'FE', 'VIDA', 'FUEGO', 'MAR', 'PAN', 'ROCA', 'PAZ', 'LUZ', 'VOZ', 'SOL'],
    mediumWordsPool: ['PABLO', 'PEDRO', 'SILAS', 'IGLESIA', 'CAMINO', 'CARCEL', 'VIAJE', 'VERDAD', 'PODER', 'ORACION', 'ESPIRITU', 'GRIEGOS'],
    hardWordsPool: ['PENTECOSTES', 'APOSTOLES', 'TESTIMONIO', 'PERSECUCION', 'MISIONERO', 'MINISTERIO', 'CONVERSION', 'SANIDAD'],
  },
  {
    id: 'epistolas_pablo',
    name: 'Epistolas de Pablo',
    levelsCount: 30,
    wordsPool: ['AMOR', 'FE', 'PAZ', 'LEY', 'GRACIA', 'CRUZ', 'VIDA', 'LUZ', 'BIEN', 'YUGO'],
    mediumWordsPool: ['ROMA', 'CORINTO', 'GALATAS', 'EFESO', 'CARNE', 'GOZO', 'CUERPO', 'MENTE', 'ESPADA', 'ESCUDO', 'DONES', 'SANTOS', 'HERMANO'],
    hardWordsPool: ['JUSTIFICACION', 'SANTIFICACION', 'REDENCION', 'MISERICORDIA', 'PREDESTINACION', 'EVANGELIO', 'MINISTERIO', 'RESTITUCION'],
  },
  {
    id: 'otras_epistolas',
    name: 'Otras Epistolas',
    levelsCount: 30,
    wordsPool: ['LUZ', 'FE', 'PAZ', 'AMOR', 'VIDA', 'REY', 'VER', 'ROCA', 'SOL', 'PAN', 'MIEL', 'DIA'],
    mediumWordsPool: ['SANTIAGO', 'PEDRO', 'JUAN', 'JUDAS', 'VERDAD', 'PRUEBA', 'OBRAS', 'CASTO', 'FALSOS', 'SANTOS', 'TEMPLO', 'CRISTO'],
    hardWordsPool: ['ESPERANZA', 'HERMANDAD', 'SACRIFICIO', 'PACIENCIA', 'FALSOSMAESTROS', 'PREDESTINADO', 'SANTIFICAR', 'SOBERANOS'],
  },
  {
    id: 'apocalipsis',
    name: 'Apocalipsis',
    levelsCount: 40,
    wordsPool: ['FIN', 'REY', 'LUZ', 'LEON', 'ORO', 'MAR', 'SOL', 'AYE', 'VID', 'AVE', 'VIDA', 'SELLO', 'COPA'],
    mediumWordsPool: ['TRONO', 'ANGEL', 'DRAGON', 'CIUDAD', 'NUEVA', 'LIBRO', 'SELLOS', 'TROMPETA', 'VISION', 'GLORIA', 'CORDERO', 'BESTIA'],
    hardWordsPool: ['REVELACION', 'TRIBULACION', 'VICTORIA', 'ETERNIDAD', 'JERUSALEN', 'ARMAGEDON', 'MILENIO', 'JUICIOFINAL', 'BABILONIA'],
  },
];

export interface LevelDef {
  levelNumber: number;
  themeId: string;
  themeName: string;
  words: string[];
  gridSize: number;
}

function getRandomWord(pool: string[]) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateLevels() {
  const levels: LevelDef[] = [];
  let currentLevel = 1;

  for (const theme of THEMES) {
    for (let index = 0; index < theme.levelsCount; index += 1) {
      const progressInTheme = index / theme.levelsCount;

      let wordsCount = 6 + Math.floor(progressInTheme * 6);
      if (currentLevel > 50) wordsCount += 2;
      if (currentLevel > 100) wordsCount += 3;
      if (currentLevel > 150) wordsCount += 4;
      if (currentLevel > 200) wordsCount += 5;

      let gridSize = 8 + Math.floor(progressInTheme * 4);
      if (currentLevel > 50) gridSize += 2;
      if (currentLevel > 100) gridSize += 2;
      if (currentLevel > 150) gridSize += 2;
      if (currentLevel > 200) gridSize += 2;

      const levelWords = new Set<string>();

      for (let wordIndex = 0; wordIndex < wordsCount; wordIndex += 1) {
        const random = Math.random();
        if (random < 0.3) {
          levelWords.add(getRandomWord(theme.wordsPool));
        } else if (random < 0.7) {
          levelWords.add(getRandomWord(theme.mediumWordsPool));
        } else {
          levelWords.add(getRandomWord(theme.hardWordsPool));
        }
      }

      if (levelWords.size === 0) {
        levelWords.add(theme.wordsPool[0]);
      }

      levels.push({
        levelNumber: currentLevel,
        themeId: theme.id,
        themeName: theme.name,
        words: Array.from(levelWords),
        gridSize: Math.max(10, Math.min(gridSize, 18)),
      });

      currentLevel += 1;
    }
  }

  return levels;
}

export const LEVELS = generateLevels();