export interface ThemePalette {
  id: string;
  name: string;
  color: string;
  hover: string;
}

export const lightThemePalettes: ThemePalette[] = [
  { id: 'brand-light', name: 'Colores del logo', color: '#0879d1', hover: '#0665b0' },
  { id: 'azul-cielo', name: 'Azul eléctrico', color: '#0F52BA', hover: '#0B418F' },
  { id: 'esmeralda', name: 'Esmeralda', color: '#008f5b', hover: '#006f46' },
  { id: 'rojo-rubi', name: 'Rojo', color: '#8A0303', hover: '#700202' },
  { id: 'violeta', name: 'Violeta', color: '#8056d9', hover: '#6740bb' },
  { id: 'turquesa', name: 'Turquesa', color: '#078e9d', hover: '#08727d' },
  { id: 'coral', name: 'Coral', color: '#e76542', hover: '#c64c2d' },
  { id: 'ambar', name: 'Ámbar', color: '#bd7900', hover: '#996100' },
  { id: 'rosa', name: 'Rosa', color: '#d64287', hover: '#b32d6d' },
  { id: 'grafito', name: 'Grafito', color: '#526173', hover: '#3e4b5b' },
];

export const darkThemePalettes: ThemePalette[] = [
  { id: 'brand-dark', name: 'Azul del logo', color: '#35a8ff', hover: '#1689df' },
  { id: 'azul-electrico', name: 'Azul eléctrico', color: '#0F52BA', hover: '#0B418F' },
  { id: 'esmeralda-nocturna', name: 'Esmeralda nocturna', color: '#00e0a0', hover: '#00b982' },
  { id: 'cobre-nocturno', name: 'Cobre nocturno', color: '#f19a4b', hover: '#d77c2e' },
  { id: 'voltaje-atomico', name: 'Voltaje atómico', color: '#a0e94c', hover: '#7fc52f' },
  { id: 'ocaso-dorado', name: 'Ocaso dorado', color: '#f2bf4a', hover: '#d99f25' },
  { id: 'carmesi-nocturno', name: 'Rojo', color: '#8A0303', hover: '#700202' },
  { id: 'abismo-marino', name: 'Abismo marino', color: '#16c6d4', hover: '#08a5b3' },
  { id: 'amatista-neon', name: 'Amatista neón', color: '#bd83ff', hover: '#995bea' },
  { id: 'monocromo-industrial', name: 'Monocromo industrial', color: '#b5c0cd', hover: '#929eac' },
];

export function getThemePalette(id: string, isDarkMode: boolean) {
  const palettes = isDarkMode ? darkThemePalettes : lightThemePalettes;
  return palettes.find((palette) => palette.id === id) || palettes[0];
}
