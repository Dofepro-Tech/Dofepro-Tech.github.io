import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ShareVerseImageOptions {
  imageUrl?: string | null;
  verseText: string;
  reference: string;
  badge: string;
  appName: string;
  shareText?: string;
  fileName?: string;
}

export interface VerseImageAsset {
  blob: Blob;
  file: File;
  objectUrl: string;
  fileName: string;
  nativeFileUri?: string;
}

export interface DownloadVerseImageResult {
  status: 'saved' | 'shared' | 'failed';
  fileUri?: string;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 900;

function sanitizeFileName(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'biblia-nj-versiculo';
}

function isNativeVerseImagePlatform() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to convert image blob to base64.'));
        return;
      }

      const [, base64Payload = ''] = reader.result.split(',', 2);
      resolve(base64Payload);
    };

    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image blob.'));
    reader.readAsDataURL(blob);
  });
}

async function ensureNativeVerseImageFile(asset: VerseImageAsset) {
  if (!isNativeVerseImagePlatform()) {
    return null;
  }

  if (asset.nativeFileUri) {
    return asset.nativeFileUri;
  }

  const base64Image = await blobToBase64(asset.blob);
  const nativeFile = await Filesystem.writeFile({
    path: `shared-images/${asset.fileName}`,
    data: base64Image,
    directory: Directory.Cache,
    recursive: true,
  });

  asset.nativeFileUri = nativeFile.uri;
  return asset.nativeFileUri;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const imageRatio = image.width / image.height;
  const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

  let drawWidth = CANVAS_WIDTH;
  let drawHeight = CANVAS_HEIGHT;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = CANVAS_HEIGHT;
    drawWidth = drawHeight * imageRatio;
    offsetX = (CANVAS_WIDTH - drawWidth) / 2;
  } else {
    drawWidth = CANVAS_WIDTH;
    drawHeight = drawWidth / imageRatio;
    offsetY = (CANVAS_HEIGHT - drawHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function getImageLuminance(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): number {
  try {
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;
    let colorSum = 0;

    // Sample pixels (every 4th pixel for performance)
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Standard luminance formula
      const avg = (0.299 * r + 0.587 * g + 0.114 * b);
      colorSum += avg;
    }

    return colorSum / (data.length / 16);
  } catch (e) {
    console.warn('Could not analyze image luminance, falling back to dark mode.');
    return 50; // Default to dark (light text)
  }
}

function drawCoverImageInFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.clip();

  const imageRatio = image.width / image.height;
  const frameRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (imageRatio > frameRatio) {
    drawHeight = height;
    drawWidth = drawHeight * imageRatio;
    offsetX = x + (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = drawWidth / imageRatio;
    offsetY = y + (height - drawHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function ensureQuotedText(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return '';
  }

  if ((normalizedText.startsWith('“') && normalizedText.endsWith('”')) || (normalizedText.startsWith('"') && normalizedText.endsWith('"'))) {
    return normalizedText;
  }

  return `“${normalizedText}”`;
}

function fitVerseText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number) {
  // Even larger font sizes for maximum impact
  const fontSizes = [82, 76, 70, 64, 58, 52, 48, 44, 40, 36, 32, 30, 28];

  for (const fontSize of fontSizes) {
    ctx.font = `600 ${fontSize}px "Cormorant Garamond", serif`;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.18; // More generous line spacing for readability

    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize, lines, lineHeight };
    }
  }

  const fallbackFontSize = 28; // Larger fallback
  ctx.font = `600 ${fallbackFontSize}px "Cormorant Garamond", serif`;
  const fallbackLines = wrapText(ctx, text, maxWidth);
  return {
    fontSize: fallbackFontSize,
    lines: fallbackLines,
    lineHeight: fallbackFontSize * 1.18,
  };
}

function resolveCanvasHeight(ctx: CanvasRenderingContext2D, verseText: string) {
  const frameWidth = CANVAS_WIDTH - 52;
  const imageWidth = frameWidth - 36;
  const baseImageHeight = CANVAS_HEIGHT - 88;
  const baseVerseMaxHeight = baseImageHeight - 210;
  const normalizedText = ensureQuotedText(verseText);
  const { lines, lineHeight } = fitVerseText(ctx, normalizedText, imageWidth - 96, baseVerseMaxHeight);
  const requiredVerseHeight = lines.length * lineHeight;

  return Math.max(CANVAS_HEIGHT, Math.ceil(requiredVerseHeight + 298));
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function createVerseImageAsset({ imageUrl, verseText, reference, badge, appName, fileName }: ShareVerseImageOptions) {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const canvasHeight = resolveCanvasHeight(ctx, verseText);
  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;

  const frameX = 26;
  const frameY = 26;
  const frameWidth = CANVAS_WIDTH - 52;
  const frameHeight = canvasHeight - 52;
  const frameRadius = 34;
  const imageX = frameX + 18;
  const imageY = frameY + 18;
  const imageWidth = frameWidth - 36;
  const imageHeight = frameHeight - 36;
  const imageRadius = 28;
  let coverImage: HTMLImageElement | null = null;

  if (imageUrl) {
    try {
      coverImage = await loadImage(imageUrl);
    } catch (error) {
      console.error('Error loading verse image:', error);
    }
  }

  const background = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  background.addColorStop(0, '#244d83');
  background.addColorStop(0.54, '#173763');
  background.addColorStop(1, '#102949');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  const glowTop = ctx.createRadialGradient(170, 110, 0, 170, 110, 420);
  glowTop.addColorStop(0, 'rgba(125, 195, 255, 0.2)');
  glowTop.addColorStop(1, 'rgba(125, 195, 255, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  const glowBottom = ctx.createRadialGradient(980, canvasHeight - 240, 0, 980, canvasHeight - 240, 420);
  glowBottom.addColorStop(0, 'rgba(24, 103, 179, 0.24)');
  glowBottom.addColorStop(1, 'rgba(24, 103, 179, 0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, frameRadius);
  ctx.fillStyle = '#173763';
  ctx.fill();
  ctx.restore();

  let isDarkImage = true;
  if (coverImage) {
    try {
      drawCoverImageInFrame(ctx, coverImage, imageX, imageY, imageWidth, imageHeight, imageRadius);

      // Analyze luminance of the drawn image
      const luminance = getImageLuminance(ctx, imageX, imageY, imageWidth, imageHeight);
      isDarkImage = luminance < 155; // Threshold for dark vs light mode

      const frameOverlay = ctx.createLinearGradient(imageX, imageY, imageX, imageY + imageHeight);

      if (isDarkImage) {
        // Subtle protection for already dark images
        frameOverlay.addColorStop(0, 'rgba(7, 13, 24, 0.45)');
        frameOverlay.addColorStop(0.5, 'rgba(7, 13, 24, 0.15)');
        frameOverlay.addColorStop(1, 'rgba(7, 13, 24, 0.65)');
      } else {
        // Stronger top/bottom protection for bright images to ensure text/attribution legibility
        frameOverlay.addColorStop(0, 'rgba(7, 13, 24, 0.2)');
        frameOverlay.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        frameOverlay.addColorStop(1, 'rgba(7, 13, 24, 0.3)');
      }

      ctx.save();
      drawRoundedRect(ctx, imageX, imageY, imageWidth, imageHeight, imageRadius);
      ctx.fillStyle = frameOverlay;
      ctx.fill();
      ctx.strokeStyle = isDarkImage ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } catch (error) {
      console.error('Error drawing verse image frame:', error);
    }
  }

  if (!coverImage) {
    const fallbackGradient = ctx.createLinearGradient(imageX, imageY, imageX + imageWidth, imageY + imageHeight);
    fallbackGradient.addColorStop(0, '#173763');
    fallbackGradient.addColorStop(1, '#0a1830');
    ctx.save();
    drawRoundedRect(ctx, imageX, imageY, imageWidth, imageHeight, imageRadius);
    ctx.fillStyle = fallbackGradient;
    ctx.fill();
    ctx.restore();
    isDarkImage = true;
  }

  const overlayText = ensureQuotedText(verseText);
  const verseMaxHeight = imageHeight - 240;
  const { fontSize: verseFontSize, lines: verseLines, lineHeight } = fitVerseText(ctx, overlayText, imageWidth - 120, verseMaxHeight);
  const verseHeight = verseLines.length * lineHeight;
  const verseY = imageY + (imageHeight - verseHeight) / 2 - 30;

  // Dynamic colors based on image brightness
  const textColor = isDarkImage ? 'rgba(255,255,255,1)' : 'rgba(7, 22, 43, 0.98)';
  const shadowColor = isDarkImage ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.75)';
  const shadowBlur = isDarkImage ? 12 : 6;
  const shadowOffset = isDarkImage ? 4 : 2;

  ctx.fillStyle = textColor;
  ctx.font = `600 ${verseFontSize}px "Cormorant Garamond", serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffset;

  const centerX = imageX + imageWidth / 2;

  verseLines.forEach((line, index) => {
    ctx.fillText(line, centerX, verseY + index * lineHeight);
  });

  // Draw reference centered below the verse
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = 'italic 700 34px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = isDarkImage ? 'rgba(255,255,255,0.95)' : 'rgba(7, 22, 43, 0.85)';
  ctx.fillText(reference.toUpperCase(), centerX, verseY + verseHeight + 48);

  // App name attribution at the bottom
  ctx.textAlign = 'left';
  ctx.fillStyle = isDarkImage ? 'rgba(255,255,255,0.6)' : 'rgba(7, 22, 43, 0.5)';
  ctx.font = '600 22px "Inter", sans-serif';
  ctx.fillText(appName, frameX + 24, frameY + frameHeight - 18);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) {
    return null;
  }

  const safeFileName = `${sanitizeFileName(fileName ?? reference)}.png`;
  const sharedFile = new File([blob], safeFileName, { type: 'image/png' });

  return {
    blob,
    file: sharedFile,
    objectUrl: URL.createObjectURL(blob),
    fileName: safeFileName,
  } satisfies VerseImageAsset;
}

export function canNativeShareVerseImage(asset: VerseImageAsset) {
  if (isNativeVerseImagePlatform()) {
    return true;
  }

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!nav.share) {
    return false;
  }

  if (!nav.canShare) {
    return true;
  }

  return nav.canShare({ files: [asset.file] });
}

export async function nativeShareVerseImage(asset: VerseImageAsset, title: string, text?: string) {
  if (isNativeVerseImagePlatform()) {
    try {
      const nativeFileUri = await ensureNativeVerseImageFile(asset);
      if (!nativeFileUri) {
        return 'unsupported' as const;
      }

      await Share.share({
        title,
        text,
        files: [nativeFileUri],
        dialogTitle: title,
      });

      return 'shared' as const;
    } catch (error) {
      console.error('Error sharing native verse image:', error);
      return 'unsupported' as const;
    }
  }

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!nav.share) {
    return 'unsupported' as const;
  }

  try {
    if (!nav.canShare || nav.canShare({ files: [asset.file] })) {
      await nav.share({
        files: [asset.file],
        title,
        text,
      });
      return 'shared' as const;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled' as const;
    }

    console.error('Error sharing verse image:', error);
  }

  return 'unsupported' as const;
}

export async function downloadVerseImage(asset: VerseImageAsset): Promise<DownloadVerseImageResult> {
  if (isNativeVerseImagePlatform()) {
    try {
      const base64Image = await blobToBase64(asset.blob);
      const nativeFile = await Filesystem.writeFile({
        path: `Biblia-DJ/${asset.fileName}`,
        data: base64Image,
        directory: Directory.Documents,
        recursive: true,
      });

      asset.nativeFileUri = nativeFile.uri;
      return {
        status: 'saved',
        fileUri: nativeFile.uri,
      };
    } catch (error) {
      console.error('Error saving verse image to device:', error);

      try {
        const nativeFileUri = await ensureNativeVerseImageFile(asset);
        if (!nativeFileUri) {
          return { status: 'failed' };
        }

        await Share.share({
          title: asset.fileName,
          files: [nativeFileUri],
          dialogTitle: asset.fileName,
        });

        return {
          status: 'shared',
          fileUri: nativeFileUri,
        };
      } catch (shareError) {
        console.error('Error opening Android save/share options for verse image:', shareError);
        return { status: 'failed' };
      }
    }
  }

  downloadBlob(asset.blob, asset.fileName);
  return { status: 'saved' };
}

export function revokeVerseImageAsset(asset: VerseImageAsset | null) {
  if (!asset) {
    return;
  }

  URL.revokeObjectURL(asset.objectUrl);
}