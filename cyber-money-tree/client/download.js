import { CARD_RARITY_PRESENTATION, normalizeCardRarity } from '../shared/card-rarity.js';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 900;

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Poster image failed to load.'));
    image.src = source;
  });
}

function wrapText(context, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const character of text) {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Poster export failed.'))), 'image/png');
  });
}

export async function createPosterBlob(card, imageSource) {
  const image = await loadImage(imageSource);
  const rarity = card?.rarity === null ? null : normalizeCardRarity(card?.rarity);
  const presentation = rarity ? CARD_RARITY_PRESENTATION[rarity] : null;
  const frame = presentation
    ? await loadImage(new URL(`../${presentation.frameAsset}`, import.meta.url).href)
    : null;
  const rarityIcon = presentation
    ? await loadImage(new URL(`../${presentation.iconAsset}`, import.meta.url).href)
    : null;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');

  const scale = Math.max(CANVAS_WIDTH / image.width, CANVAS_HEIGHT / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, (CANVAS_WIDTH - width) / 2, (CANVAS_HEIGHT - height) / 2, width, height);

  const shade = context.createLinearGradient(0, 480, 0, CANVAS_HEIGHT);
  shade.addColorStop(0, 'rgba(16, 48, 34, 0)');
  shade.addColorStop(0.36, 'rgba(16, 48, 34, 0.48)');
  shade.addColorStop(1, 'rgba(16, 48, 34, 0.88)');
  context.fillStyle = shade;
  context.fillRect(0, 440, CANVAS_WIDTH, 460);

  if (presentation) {
    context.drawImage(frame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const { x, y, width, height } = presentation.iconRect;
    context.drawImage(rarityIcon, x, y, width, height);
    context.fillStyle = presentation.badgeBackground;
    context.fillRect(52, 42, 92, 38);
    context.strokeStyle = presentation.badgeBorder;
    context.lineWidth = 3;
    context.strokeRect(52, 42, 92, 38);
    context.fillStyle = presentation.badgeText;
    context.font = 'bold 22px Trebuchet MS, Microsoft YaHei, sans-serif';
    context.textAlign = 'center';
    context.fillText(presentation.label, 98, 68);
  } else {
    context.fillStyle = '#ffe078';
    context.fillRect(596, 44, 74, 74);
    context.strokeStyle = '#193a2d';
    context.lineWidth = 6;
    context.strokeRect(596, 44, 74, 74);
    context.fillStyle = '#193a2d';
    context.font = 'bold 48px Trebuchet MS, Microsoft YaHei, sans-serif';
    context.textAlign = 'center';
    context.fillText('✳', 633, 98);
  }

  context.textAlign = 'left';
  context.fillStyle = '#fff9da';
  context.font = 'bold 26px Trebuchet MS, Microsoft YaHei, sans-serif';
  context.fillText('给路过的树友', 52, 642);
  context.fillStyle = '#ffffff';
  context.font = 'bold 57px Trebuchet MS, Microsoft YaHei, sans-serif';
  const lines = wrapText(context, card.phrase, CANVAS_WIDTH - 104);
  const fontSize = lines.length > 3 ? 45 : lines.length > 2 ? 50 : 57;
  context.font = `bold ${fontSize}px Trebuchet MS, Microsoft YaHei, sans-serif`;
  const lineHeight = fontSize * 1.32;
  const textTop = Math.min(698, 782 - lines.length * lineHeight);
  lines.forEach((line, index) => context.fillText(line, 52, textTop + (index + 1) * lineHeight, CANVAS_WIDTH - 104));

  context.fillStyle = '#ffedb5';
  context.font = 'bold 22px Trebuchet MS, Microsoft YaHei, sans-serif';
  const signature = card.waterNo
    ? `第 ${Number(card.waterNo).toLocaleString('zh-CN')} 滴水 · 一份心意`
    : '树主赠礼 · 一份心意';
  context.fillText(signature, 52, 854);
  return canvasBlob(canvas);
}

export async function downloadPoster(card, imageSource) {
  const blob = await createPosterBlob(card, imageSource);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `leaf-${card.waterNo ?? card.id ?? 'wish'}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
