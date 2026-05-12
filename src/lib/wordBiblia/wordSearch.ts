export interface GridCell {
  letter: string;
  x: number;
  y: number;
  isPartOfFoundWord: boolean;
  highlighted: boolean;
  justFound?: boolean;
}

export interface PlacedWord {
  word: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  found: boolean;
}

export interface WordSearchGrid {
  grid: GridCell[][];
  words: PlacedWord[];
}

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];

function tryPlaceWords(words: string[], size: number, index: number, grid: GridCell[][], placedWords: PlacedWord[]): boolean {
  if (index >= words.length) {
    return true;
  }

  const word = words[index];
  const options: { x: number; y: number; dir: number[] }[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      for (const dir of DIRS) {
        options.push({ x, y, dir });
      }
    }
  }

  for (let optionIndex = options.length - 1; optionIndex > 0; optionIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (optionIndex + 1));
    [options[optionIndex], options[randomIndex]] = [options[randomIndex], options[optionIndex]];
  }

  for (const { x: startX, y: startY, dir } of options) {
    const endX = startX + dir[0] * (word.length - 1);
    const endY = startY + dir[1] * (word.length - 1);

    if (endX < 0 || endX >= size || endY < 0 || endY >= size) {
      continue;
    }

    let fits = true;
    for (let letterIndex = 0; letterIndex < word.length; letterIndex += 1) {
      const cellX = startX + dir[0] * letterIndex;
      const cellY = startY + dir[1] * letterIndex;
      if (grid[cellY][cellX].letter !== '' && grid[cellY][cellX].letter !== word[letterIndex]) {
        fits = false;
        break;
      }
    }

    if (!fits) {
      continue;
    }

    const backup: string[] = [];
    for (let letterIndex = 0; letterIndex < word.length; letterIndex += 1) {
      const cellX = startX + dir[0] * letterIndex;
      const cellY = startY + dir[1] * letterIndex;
      backup.push(grid[cellY][cellX].letter);
      grid[cellY][cellX].letter = word[letterIndex];
    }

    placedWords.push({ word, startX, startY, endX, endY, found: false });

    if (tryPlaceWords(words, size, index + 1, grid, placedWords)) {
      return true;
    }

    placedWords.pop();
    for (let letterIndex = 0; letterIndex < word.length; letterIndex += 1) {
      const cellX = startX + dir[0] * letterIndex;
      const cellY = startY + dir[1] * letterIndex;
      grid[cellY][cellX].letter = backup[letterIndex];
    }
  }

  return false;
}

export function generateWordSearch(words: string[], baseSize: number): WordSearchGrid {
  const upperWords = words
    .map((word) => word.toUpperCase().replace(/[^A-ZÑ]/g, ''))
    .sort((left, right) => right.length - left.length);

  let size = Math.max(baseSize, ...upperWords.map((word) => word.length));
  let placed = false;
  let grid: GridCell[][] = [];
  const placedWords: PlacedWord[] = [];

  while (!placed) {
    grid = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => ({
        letter: '',
        x,
        y,
        isPartOfFoundWord: false,
        highlighted: false,
      }))
    );

    placedWords.length = 0;
    placed = tryPlaceWords(upperWords, size, 0, grid, placedWords);

    if (!placed) {
      size += 1;
    }
  }

  const alphabet = 'QWERTYUIOPASDFGHJKLZXCVBNMÑ';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (grid[y][x].letter === '') {
        grid[y][x].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return { grid, words: placedWords };
}