import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const artDir = path.join(projectRoot, 'art');
const mapsDir = path.join(projectRoot, 'maps');
const tileSize = 16;
const mapWidth = 48;
const mapHeight = 32;
const palette = {
  transparent: '#00000000',
  outline: '#171a28',
  deep: '#222338',
  grass: '#505248',
  grassLight: '#706b58',
  grassDark: '#393a46',
  leaf: '#62664c',
  mint: '#979274',
  soil: '#79563f',
  soilLight: '#a98159',
  soilDark: '#483943',
  stone: '#686675',
  stoneLight: '#99908b',
  stoneDark: '#3d4053',
  water: '#27364d',
  waterLight: '#546b7b',
  roof: '#37394f',
  roofLight: '#656176',
  wood: '#58413a',
  woodDark: '#382f39',
  woodLight: '#98704d',
  glass: '#657f89',
  glassLight: '#e1b978',
  gold: '#edb867',
  glow: '#ffe0a0',
  skin: '#d69a78',
  hair: '#302a33',
  jacket: '#39445c',
  jacketLight: '#748091',
  pants: '#2b3042',
  boot: '#453433',
  flower: '#c58083',
  red: '#a75355',
  parchment: '#dfc795',
  moss: '#4c5d4b',
  copper: '#bb7959',
  cream: '#ead5ac',
  lavender: '#797589',
  sky: '#3a405d',
};

function colorToBytes(value) {
  const hex = palette[value] ?? value;
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) : 255,
  ];
}

function makeSurface(width, height) {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height * 4),
    set(x, y, color) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
      this.pixels.set(colorToBytes(color), offset);
    },
    rect(x, y, rectWidth, rectHeight, color) {
      for (let py = y; py < y + rectHeight; py += 1) {
        for (let px = x; px < x + rectWidth; px += 1) this.set(px, py, color);
      }
    },
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(surface) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(surface.width, 0);
  header.writeUInt32BE(surface.height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((surface.width * 4 + 1) * surface.height);
  for (let y = 0; y < surface.height; y += 1) {
    const target = y * (surface.width * 4 + 1);
    scanlines[target] = 0;
    Buffer.from(surface.pixels.buffer, surface.pixels.byteOffset + y * surface.width * 4, surface.width * 4)
      .copy(scanlines, target + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawTile(surface, tileId, draw) {
  const originX = tileId * tileSize;
  const tile = {
    set: (x, y, color) => surface.set(originX + x, y, color),
    rect: (x, y, width, height, color) => surface.rect(originX + x, y, width, height, color),
  };
  draw(tile);
}

function createTileset() {
  const surface = makeSurface(24 * tileSize, tileSize);
  const grass = (tile, seed = 0) => {
    tile.rect(0, 0, 16, 16, 'grass');
    for (let i = 0; i < 8; i += 1) {
      const x = (seed * 7 + i * 5 + 3) % 15;
      const y = (seed * 11 + i * 3 + 2) % 14;
      tile.set(x, y, i % 3 ? 'grassLight' : 'grassDark');
      if (i % 4 === 0) tile.set((x + 1) % 16, y, 'moss');
    }
  };
  drawTile(surface, 0, (tile) => grass(tile, 0));
  drawTile(surface, 1, (tile) => {
    grass(tile, 3);
    tile.set(4, 5, 'flower'); tile.set(5, 5, 'gold'); tile.set(4, 6, 'leaf');
    tile.set(11, 10, 'red'); tile.set(12, 10, 'cream'); tile.set(11, 11, 'leaf');
    tile.rect(8, 12, 2, 2, 'mint'); tile.set(9, 13, 'grassDark');
  });
  drawTile(surface, 2, (tile) => {
    tile.rect(0, 0, 16, 16, 'soilDark');
    tile.rect(0, 1, 16, 13, 'soil');
    tile.rect(2, 3, 5, 1, 'soilLight'); tile.rect(10, 10, 4, 1, 'soilLight');
    tile.rect(4, 7, 2, 1, 'soilDark'); tile.rect(8, 12, 3, 1, 'soilDark');
    tile.set(13, 4, 'wood'); tile.set(3, 11, 'wood'); tile.set(14, 14, 'soilDark');
  });
  drawTile(surface, 3, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark');
    tile.rect(1, 1, 6, 6, 'stone'); tile.rect(8, 1, 7, 6, 'stoneLight');
    tile.rect(1, 8, 6, 7, 'stoneLight'); tile.rect(8, 8, 7, 7, 'stone');
    tile.rect(6, 2, 2, 5, 'stoneDark'); tile.rect(9, 7, 6, 2, 'stoneDark');
    tile.rect(2, 13, 4, 1, 'soilLight'); tile.rect(11, 11, 3, 1, 'soilLight');
  });
  drawTile(surface, 4, (tile) => {
    tile.rect(0, 0, 16, 16, 'water');
    tile.rect(2, 3, 6, 1, 'waterLight'); tile.rect(9, 9, 4, 1, 'waterLight');
    tile.rect(4, 4, 2, 1, 'glass'); tile.set(13, 4, 'waterLight');
    tile.rect(11, 13, 3, 1, 'stoneDark'); tile.set(1, 11, 'mint');
  });
  drawTile(surface, 5, (tile) => {
    tile.rect(0, 0, 16, 16, 'wood');
    tile.rect(1, 2, 14, 1, 'woodLight'); tile.rect(1, 9, 14, 1, 'soilDark');
    tile.rect(3, 0, 1, 16, 'soilDark'); tile.rect(11, 0, 1, 16, 'woodLight');
    tile.set(6, 5, 'gold'); tile.set(13, 12, 'soilDark');
  });
  drawTile(surface, 6, (tile) => {
    grass(tile, 4);
    tile.rect(0, 5, 16, 2, 'wood'); tile.rect(0, 11, 16, 2, 'woodLight');
    tile.rect(2, 3, 3, 11, 'woodLight'); tile.rect(11, 3, 3, 11, 'wood');
    tile.rect(5, 6, 7, 1, 'soilDark'); tile.rect(5, 12, 7, 1, 'soilDark');
    tile.set(3, 4, 'cream'); tile.set(12, 10, 'gold');
  });
  drawTile(surface, 7, (tile) => {
    grass(tile, 7);
    tile.rect(1, 8, 14, 7, 'stoneDark'); tile.rect(2, 5, 12, 9, 'stone');
    tile.rect(4, 5, 6, 2, 'stoneLight'); tile.set(12, 9, 'soilLight');
    tile.set(6, 12, 'stoneDark'); tile.set(3, 13, 'moss');
  });
  drawTile(surface, 8, (tile) => {
    grass(tile, 9);
    tile.rect(1, 8, 14, 7, 'grassDark'); tile.rect(2, 5, 12, 9, 'leaf');
    tile.rect(4, 2, 8, 5, 'grassLight'); tile.rect(5, 4, 6, 5, 'moss');
    tile.set(3, 8, 'mint'); tile.set(11, 9, 'mint'); tile.set(8, 5, 'cream');
  });
  drawTile(surface, 9, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark'); tile.rect(1, 1, 14, 14, 'stone');
    tile.rect(1, 7, 14, 2, 'stoneDark'); tile.rect(7, 1, 2, 14, 'stoneDark');
    tile.rect(2, 2, 4, 1, 'stoneLight'); tile.rect(10, 10, 4, 1, 'stoneLight');
    tile.set(4, 5, 'moss'); tile.set(11, 3, 'moss');
  });
  drawTile(surface, 10, (tile) => {
    tile.rect(0, 0, 16, 16, 'soilDark'); tile.rect(2, 2, 12, 12, 'soil');
    tile.rect(3, 4, 10, 1, 'wood'); tile.rect(3, 11, 10, 1, 'wood');
    tile.rect(4, 5, 2, 5, 'leaf'); tile.rect(9, 5, 3, 5, 'moss');
    tile.set(5, 6, 'flower'); tile.set(10, 8, 'gold');
  });
  drawTile(surface, 11, (tile) => {
    grass(tile, 12);
    tile.rect(2, 7, 5, 5, 'stoneDark'); tile.rect(3, 6, 4, 5, 'stoneLight');
    tile.rect(9, 3, 5, 6, 'stoneDark'); tile.rect(10, 2, 4, 5, 'stone');
    tile.set(4, 7, 'cream'); tile.set(11, 3, 'stoneLight');
  });
  drawTile(surface, 12, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark'); tile.rect(1, 1, 14, 14, 'stone');
    tile.rect(1, 1, 14, 1, 'stoneLight'); tile.rect(1, 8, 14, 1, 'stoneDark');
    tile.rect(7, 2, 2, 6, 'stoneDark'); tile.rect(3, 12, 7, 1, 'soilLight');
  });
  drawTile(surface, 13, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark'); tile.rect(1, 1, 14, 14, 'stone');
    tile.rect(1, 1, 14, 1, 'stoneLight'); tile.rect(1, 14, 14, 1, 'soilDark');
    tile.rect(1, 7, 14, 1, 'stoneDark'); tile.set(4, 4, 'soilLight'); tile.set(12, 10, 'soilLight');
  });
  drawTile(surface, 14, (tile) => {
    tile.rect(0, 0, 16, 16, 'soilDark'); tile.rect(0, 1, 16, 13, 'soilLight');
    tile.rect(0, 1, 16, 2, 'soil'); tile.set(3, 6, 'soil'); tile.set(12, 10, 'wood');
    tile.rect(6, 12, 5, 1, 'soil');
  });
  drawTile(surface, 15, (tile) => {
    tile.rect(0, 0, 16, 16, 'wood'); tile.rect(0, 2, 16, 2, 'woodLight');
    tile.rect(0, 9, 16, 2, 'woodLight'); tile.rect(4, 0, 1, 16, 'soilDark');
    tile.rect(12, 0, 1, 16, 'soilDark');
  });
  // Transparent overlays are used on the Details layer to break up the broad grass fields.
  drawTile(surface, 16, (tile) => {
    tile.set(7, 5, 'flower'); tile.set(8, 5, 'gold'); tile.set(7, 6, 'leaf'); tile.set(8, 6, 'leaf');
  });
  drawTile(surface, 17, (tile) => {
    tile.set(4, 9, 'grassLight'); tile.set(5, 8, 'mint'); tile.set(5, 9, 'leaf');
    tile.set(11, 5, 'grassLight'); tile.set(10, 4, 'mint'); tile.set(10, 5, 'leaf');
  });
  drawTile(surface, 18, (tile) => {
    tile.rect(5, 6, 2, 1, 'copper'); tile.rect(7, 7, 2, 1, 'red'); tile.set(9, 8, 'copper');
    tile.set(11, 9, 'flower');
  });
  drawTile(surface, 19, (tile) => {
    tile.set(3, 6, 'stoneLight'); tile.set(4, 6, 'stone'); tile.set(11, 11, 'stoneLight');
    tile.set(12, 11, 'stone'); tile.set(8, 4, 'soilLight');
  });
  drawTile(surface, 20, (tile) => {
    tile.set(7, 7, 'glow'); tile.set(6, 8, 'gold'); tile.set(8, 8, 'gold'); tile.set(7, 9, 'gold');
  });
  drawTile(surface, 21, (tile) => {
    tile.set(4, 7, 'cream'); tile.set(5, 7, 'flower'); tile.set(4, 8, 'leaf');
    tile.set(11, 10, 'flower'); tile.set(12, 10, 'cream'); tile.set(11, 11, 'leaf');
  });
  drawTile(surface, 22, (tile) => {
    tile.rect(3, 6, 5, 1, 'waterLight'); tile.rect(9, 8, 4, 1, 'waterLight');
    tile.set(7, 5, 'glassLight');
  });
  drawTile(surface, 23, (tile) => {
    tile.set(4, 7, 'leaf'); tile.set(5, 8, 'copper'); tile.set(6, 7, 'leaf');
    tile.set(11, 11, 'leaf'); tile.set(12, 10, 'copper');
  });
  return surface;
}

function drawLandmark(surface, frame, draw, shadow = { x: 10, y: 73, width: 76, height: 3 }) {
  const originY = frame * 80;
  const p = (x, y, color) => surface.set(x, originY + y, color);
  const r = (x, y, width, height, color) => surface.rect(x, originY + y, width, height, color);
  const d = { p, r };
  r(shadow.x, shadow.y, shadow.width, shadow.height, 'deep');
  draw(d);
}

function createLandmarks() {
  const surface = makeSurface(96, 12 * 80);
  drawLandmark(surface, 0, ({ p, r }) => {
    // The guild hall uses one roof plane and one southern facade, like every building in this map.
    r(15, 63, 66, 11, 'stoneDark'); r(18, 65, 60, 7, 'stoneLight');
    r(19, 35, 58, 32, 'outline'); r(22, 38, 52, 29, 'wood');
    r(26, 40, 44, 25, 'woodLight'); r(29, 40, 3, 25, 'wood'); r(64, 40, 3, 25, 'wood');
    r(15, 22, 66, 22, 'outline'); r(18, 19, 60, 25, 'roof');
    r(24, 14, 48, 7, 'roof'); r(31, 10, 34, 5, 'roofLight');
    r(21, 22, 54, 3, 'roofLight'); r(18, 29, 60, 2, 'deep');
    for (const x of [23, 37, 51, 65]) {
      r(x, 25, 3, 3, 'roofLight'); r(x + 5, 31, 3, 2, 'roofLight');
    }
    r(22, 44, 13, 13, 'wood'); r(24, 46, 9, 9, 'glassLight');
    r(26, 47, 5, 7, 'glass'); p(25, 47, 'glow'); p(31, 53, 'cream');
    r(62, 44, 13, 13, 'wood'); r(64, 46, 9, 9, 'glassLight');
    r(66, 47, 5, 7, 'glass'); p(65, 47, 'glow'); p(71, 53, 'cream');
    r(40, 47, 16, 23, 'outline'); r(43, 50, 10, 20, 'soilDark');
    r(45, 53, 6, 17, 'woodLight'); r(50, 59, 2, 2, 'gold');
    r(39, 65, 18, 5, 'stoneLight'); r(34, 68, 28, 4, 'stoneDark');
    r(14, 39, 4, 24, 'wood'); r(8, 36, 13, 11, 'woodDark');
    r(10, 38, 9, 7, 'red'); r(12, 39, 5, 2, 'gold');
    r(76, 36, 5, 15, 'wood'); r(76, 33, 9, 8, 'copper'); p(78, 35, 'cream');
    p(20, 35, 'stoneLight'); p(74, 35, 'stoneLight');
  });
  drawLandmark(surface, 1, ({ p, r }) => {
    r(18, 60, 61, 12, 'stoneDark'); r(22, 63, 53, 7, 'stoneLight');
    r(22, 38, 52, 27, 'outline'); r(26, 42, 44, 23, 'wood');
    r(31, 46, 34, 19, 'soilDark'); r(35, 49, 26, 15, 'woodLight');
    r(15, 31, 67, 15, 'outline'); r(19, 29, 63, 15, 'roof');
    r(27, 24, 48, 7, 'roof'); r(36, 20, 30, 5, 'roofLight');
    r(16, 42, 12, 4, 'woodLight'); r(69, 42, 12, 4, 'woodLight');
    r(39, 49, 18, 16, 'deep'); r(41, 52, 14, 13, 'wood');
    r(43, 54, 10, 11, 'woodLight');
    // Packed touring bicycle: two pixel wheels, frame, saddle, and handlebar.
    r(8, 61, 12, 2, 'outline'); r(10, 58, 2, 2, 'outline'); r(8, 60, 2, 2, 'stoneLight');
    r(18, 58, 2, 2, 'outline'); r(17, 60, 2, 2, 'stoneLight');
    r(10, 58, 8, 1, 'gold'); r(12, 55, 5, 1, 'copper'); r(14, 55, 1, 5, 'gold');
    r(16, 56, 3, 1, 'gold'); r(9, 56, 2, 1, 'woodLight');
    r(69, 51, 11, 12, 'soilDark'); r(71, 53, 7, 8, 'woodLight');
    r(73, 55, 3, 4, 'cream');
    r(31, 66, 34, 4, 'wood');
  });
  drawLandmark(surface, 2, ({ p, r }) => {
    r(12, 63, 72, 11, 'stoneDark'); r(17, 66, 62, 5, 'stoneLight');
    r(17, 35, 62, 33, 'outline'); r(21, 40, 54, 28, 'wood');
    r(26, 46, 44, 17, 'deep'); r(30, 49, 36, 14, 'soilDark');
    r(16, 25, 64, 19, 'outline'); r(20, 22, 56, 19, 'roof');
    r(27, 17, 42, 7, 'roof'); r(36, 13, 24, 5, 'roofLight');
    r(24, 25, 48, 2, 'copper'); r(28, 31, 40, 2, 'roofLight');
    r(24, 43, 3, 24, 'woodLight'); r(69, 43, 3, 24, 'woodLight');
    r(36, 52, 24, 13, 'wood'); r(39, 55, 18, 8, 'stoneDark');
    // Firework racks and hand-built rockets.
    r(7, 47, 12, 21, 'wood'); r(9, 50, 8, 15, 'outline');
    r(11, 46, 2, 9, 'red'); r(10, 43, 4, 4, 'gold');
    r(14, 50, 2, 8, 'copper'); p(13, 48, 'cream');
    r(77, 48, 11, 19, 'wood'); r(79, 51, 7, 13, 'outline');
    r(81, 46, 2, 9, 'red'); r(80, 43, 4, 4, 'gold');
    r(83, 52, 2, 8, 'copper'); p(82, 49, 'cream');
    // Warm pennants and lanterns make the open stage read clearly at dusk.
    r(29, 31, 3, 4, 'gold'); r(64, 31, 3, 4, 'gold');
    p(30, 36, 'glow'); p(65, 36, 'glow');
    r(43, 28, 10, 4, 'red'); p(47, 27, 'gold');
  });
  drawLandmark(surface, 3, ({ p, r }) => {
    r(12, 62, 72, 12, 'stoneDark'); r(16, 65, 64, 6, 'stoneLight');
    r(17, 31, 62, 35, 'outline'); r(20, 36, 56, 28, 'glass');
    r(20, 37, 56, 3, 'glassLight'); r(20, 60, 56, 4, 'leaf');
    r(19, 31, 58, 5, 'wood'); r(25, 25, 46, 8, 'woodLight');
    r(31, 19, 34, 8, 'glass'); r(37, 14, 22, 7, 'glassLight');
    r(46, 13, 4, 50, 'wood'); r(25, 37, 3, 25, 'wood'); r(69, 37, 3, 25, 'wood');
    r(35, 54, 27, 9, 'soil'); r(38, 55, 21, 6, 'soilDark');
    // Golden money tree under the glass ridge, rooted in a shared community planter.
    r(44, 37, 8, 22, 'wood'); r(47, 33, 3, 7, 'woodLight');
    r(35, 31, 24, 5, 'leaf'); r(38, 27, 18, 6, 'mint');
    r(40, 23, 15, 6, 'leaf'); r(44, 20, 8, 5, 'grassLight');
    for (const [x, y] of [[38, 30], [54, 30], [41, 25], [50, 25], [46, 21], [45, 34]]) {
      p(x, y, 'gold'); p(x + 1, y, 'glow');
    }
    r(10, 49, 7, 11, 'soilDark'); r(12, 51, 4, 7, 'waterLight');
    r(11, 46, 5, 2, 'stoneLight'); p(20, 39, 'glow'); p(75, 41, 'glassLight');
  });
  drawLandmark(surface, 4, ({ p, r }) => {
    r(13, 63, 70, 11, 'stoneDark'); r(18, 66, 60, 5, 'stone');
    r(17, 34, 62, 35, 'outline'); r(21, 38, 54, 29, 'stoneDark');
    r(25, 41, 46, 26, 'stone'); r(31, 45, 34, 22, 'deep');
    r(36, 49, 24, 20, 'outline'); r(40, 52, 16, 17, 'deep');
    r(15, 29, 16, 22, 'stoneDark'); r(17, 27, 12, 22, 'stoneLight');
    r(65, 29, 16, 22, 'stoneDark'); r(67, 27, 12, 22, 'stoneLight');
    r(27, 26, 42, 10, 'stoneDark'); r(32, 22, 32, 8, 'stone');
    r(37, 17, 22, 7, 'stoneDark'); r(42, 13, 12, 6, 'stone');
    r(36, 64, 24, 6, 'stoneLight'); r(30, 69, 36, 3, 'stoneDark');
    r(33, 43, 3, 10, 'moss'); r(62, 47, 3, 8, 'moss');
    r(46, 52, 4, 11, 'copper'); p(46, 50, 'gold'); p(49, 58, 'glow');
    r(20, 55, 5, 9, 'leaf'); r(71, 58, 5, 6, 'moss');
  });
  drawLandmark(surface, 5, ({ p, r }) => {
    r(36, 47, 24, 26, 'outline'); r(40, 49, 16, 24, 'wood');
    r(43, 50, 10, 21, 'woodLight'); r(32, 68, 32, 5, 'soilDark');
    // Stepped clusters make a canopy silhouette without switching into an isometric view.
    r(35, 11, 26, 8, 'outline'); r(27, 17, 42, 9, 'outline');
    r(21, 24, 54, 14, 'outline'); r(18, 35, 60, 15, 'outline');
    r(24, 47, 48, 12, 'outline'); r(31, 56, 34, 8, 'outline');
    r(38, 9, 20, 8, 'leaf'); r(30, 15, 35, 9, 'leaf');
    r(24, 22, 48, 12, 'grassLight'); r(21, 32, 54, 12, 'leaf');
    r(26, 43, 44, 12, 'moss'); r(34, 53, 28, 8, 'leaf');
    r(32, 26, 15, 9, 'mint'); r(52, 25, 13, 8, 'mint');
    r(26, 36, 15, 8, 'grassLight'); r(53, 37, 16, 7, 'grassLight');
    r(40, 20, 8, 14, 'leaf'); r(44, 34, 8, 13, 'grassDark');
    for (const [x, y, color] of [[33, 24, 'gold'], [59, 30, 'copper'], [29, 41, 'cream'], [65, 45, 'gold'], [39, 51, 'copper'], [55, 54, 'cream']]) {
      p(x, y, color); p(x + 1, y, 'glow');
    }
    p(48, 13, 'glassLight'); p(24, 29, 'grassLight'); p(70, 39, 'mint');
  });
  drawLandmark(surface, 6, ({ p, r }) => {
    // An always-visible quest board ties the in-world scene to the development journal.
    r(15, 62, 66, 11, 'stoneDark'); r(19, 65, 58, 6, 'stoneLight');
    r(19, 23, 9, 44, 'outline'); r(68, 23, 9, 44, 'outline');
    r(22, 24, 4, 40, 'wood'); r(70, 24, 4, 40, 'wood');
    r(19, 16, 58, 39, 'outline'); r(23, 20, 50, 32, 'wood');
    r(27, 24, 42, 24, 'soilDark'); r(30, 27, 36, 18, 'parchment');
    r(32, 29, 32, 2, 'woodLight'); r(32, 34, 26, 2, 'woodLight');
    r(32, 39, 30, 2, 'woodLight'); r(36, 30, 2, 2, 'red');
    r(60, 35, 2, 2, 'copper'); r(35, 40, 2, 2, 'red');
    r(39, 9, 18, 10, 'copper'); r(42, 11, 12, 6, 'gold');
    p(47, 12, 'glow'); r(45, 6, 7, 4, 'woodLight');
    r(12, 57, 6, 8, 'soilDark'); r(78, 57, 6, 8, 'soilDark');
  });
  drawLandmark(surface, 7, ({ p, r }) => {
    r(45, 31, 7, 42, 'outline'); r(47, 34, 3, 37, 'woodLight');
    r(36, 25, 25, 6, 'outline'); r(39, 22, 19, 8, 'wood');
    r(40, 23, 17, 4, 'gold'); r(43, 19, 11, 3, 'woodLight');
    r(41, 29, 16, 4, 'woodLight'); r(43, 34, 11, 2, 'copper');
    r(39, 68, 20, 4, 'stoneDark'); p(46, 24, 'glow'); p(51, 24, 'glow');
  }, { x: 35, y: 70, width: 26, height: 4 });
  drawLandmark(surface, 8, ({ p, r }) => {
    r(22, 60, 22, 12, 'stoneDark'); r(24, 48, 17, 18, 'wood');
    r(27, 50, 11, 12, 'woodLight'); r(30, 52, 1, 8, 'soilDark');
    r(29, 45, 17, 18, 'outline'); r(32, 47, 11, 13, 'woodLight');
    r(35, 49, 1, 8, 'soilDark'); r(51, 55, 24, 17, 'outline');
    r(54, 58, 18, 11, 'wood'); r(56, 60, 14, 7, 'woodLight');
    r(58, 62, 4, 2, 'red'); r(64, 62, 4, 2, 'gold'); p(29, 51, 'cream');
  }, { x: 18, y: 71, width: 60, height: 3 });
  drawLandmark(surface, 9, ({ p, r }) => {
    r(20, 64, 56, 9, 'stoneDark'); r(28, 47, 40, 17, 'outline');
    r(31, 49, 34, 9, 'wood'); r(33, 51, 30, 5, 'woodLight');
    r(29, 57, 4, 14, 'wood'); r(63, 57, 4, 14, 'wood');
    r(23, 42, 50, 5, 'woodLight'); r(27, 39, 42, 4, 'wood');
    r(39, 40, 18, 2, 'copper'); p(43, 41, 'cream'); p(51, 41, 'cream');
  }, { x: 20, y: 70, width: 56, height: 4 });
  drawLandmark(surface, 10, ({ p, r }) => {
    r(31, 57, 34, 16, 'outline'); r(35, 60, 26, 11, 'stoneDark');
    r(39, 57, 18, 4, 'stoneLight'); r(41, 53, 14, 4, 'copper');
    r(44, 47, 8, 9, 'gold'); r(45, 43, 6, 6, 'glow');
    p(38, 49, 'red'); p(57, 47, 'flower'); p(40, 44, 'gold');
    r(24, 68, 48, 4, 'stoneDark');
  }, { x: 28, y: 70, width: 40, height: 4 });
  drawLandmark(surface, 11, ({ p, r }) => {
    r(20, 62, 56, 11, 'stoneDark'); r(23, 65, 50, 5, 'stoneLight');
    r(24, 47, 48, 17, 'wood'); r(27, 50, 42, 11, 'soil');
    for (const [x, y, color] of [[31, 46, 'flower'], [39, 43, 'gold'], [47, 47, 'red'], [55, 42, 'cream'], [62, 46, 'flower']]) {
      r(x, y, 4, 4, 'leaf'); p(x + 1, y - 1, color); p(x + 2, y - 2, color);
    }
    r(28, 54, 40, 2, 'woodLight'); r(29, 60, 38, 2, 'woodLight');
    r(26, 45, 2, 14, 'wood'); r(68, 45, 2, 14, 'wood');
  });
  return surface;
}

function drawPlayerFrame(surface, column, row, phase) {
  const ox = column * 16;
  const oy = row * 24;
  const p = (x, y, color) => surface.set(ox + x, oy + y, color);
  const r = (x, y, width, height, color) => surface.rect(ox + x, oy + y, width, height, color);
  const facing = ['down', 'left', 'right', 'up'][row];
  r(4, 22, 8, 1, 'deep');
  const stride = phase === 0 ? -1 : phase === 2 ? 1 : 0;
  if (facing === 'left' || facing === 'right') {
    const profile = facing === 'left';
    r(6 + stride, 17, 3, 4, 'pants'); r(9 - stride, 17, 3, 4, 'pants');
    r(5 + stride, 20, 4, 2, 'boot'); r(9 - stride, 20, 4, 2, 'boot');
    r(profile ? 4 : 6, 5, 7, 7, 'outline'); r(profile ? 5 : 6, 6, 6, 5, 'skin');
    r(profile ? 4 : 6, 3, 8, 4, 'hair'); r(profile ? 3 : 6, 4, 3, 4, 'hair');
    r(4, 11, 9, 8, 'outline'); r(5, 12, 7, 6, 'jacket');
    r(6, 12, 4, 2, 'jacketLight'); r(5, 16, 7, 2, 'red');
    r(8, 15, 3, 1, 'gold'); r(5, 13 + phase % 2, 2, 4, 'jacketLight');
    r(11, 13 + (phase + 1) % 2, 2, 4, 'jacket');
    r(profile ? 4 : 12, 8, 1, 2, 'outline'); p(8, 10, 'copper');
    if (profile) { r(11, 12, 3, 5, 'soilDark'); p(12, 13, 'woodLight'); }
    else { r(2, 12, 3, 5, 'soilDark'); p(3, 13, 'woodLight'); }
  } else {
    r(5 + stride, 17, 3, 4, 'pants'); r(9 - stride, 17, 3, 4, 'pants');
    r(4 + stride, 20, 4, 2, 'boot'); r(9 - stride, 20, 4, 2, 'boot');
    r(3, 10, 10, 9, 'outline'); r(4, 11, 8, 7, 'jacket');
    r(5, 11, 6, 2, 'jacketLight'); r(4, 16, 8, 2, 'red');
    r(6, 14, 4, 2, 'woodLight'); r(7, 14, 2, 1, 'gold');
    r(4, 4, 8, 8, 'skin');
    r(4, 2, 8, 5, 'hair'); r(3, 5, 2, 4, 'hair'); r(11, 5, 2, 4, 'hair');
    if (facing === 'down') {
      p(6, 9, 'outline'); p(9, 9, 'outline'); p(7, 10, 'red');
      r(4, 3, 8, 2, 'hair'); p(10, 5, 'cream');
    } else {
      r(3, 6, 10, 5, 'hair'); r(4, 8, 8, 3, 'jacketLight');
      r(4, 9, 8, 2, 'outline'); p(7, 8, 'gold');
    }
    r(3, 13 + phase % 2, 2, 4, 'jacketLight');
    r(11, 13 + (phase + 1) % 2, 2, 4, 'jacket');
    r(3, 12, 2, 4, 'soilDark'); r(11, 12, 2, 4, 'soilDark');
    p(4, 13, 'woodLight'); p(12, 13, 'woodLight');
  }
}

function createPlayer() {
  const surface = makeSurface(48, 96);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) drawPlayerFrame(surface, column, row, column);
  }
  return surface;
}

function tileId(x, y) {
  return y * mapWidth + x;
}

function createMap() {
  const ground = new Array(mapWidth * mapHeight).fill(1);
  const details = new Array(mapWidth * mapHeight).fill(0);
  const blockers = new Array(mapWidth * mapHeight).fill(0);
  const set = (layer, x, y, gid) => {
    if (x >= 0 && y >= 0 && x < mapWidth && y < mapHeight) layer[tileId(x, y)] = gid;
  };
  const solidRect = (x0, y0, x1, y1, gid = 10) => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) set(blockers, x, y, gid);
    }
  };
  const solidRun = (y, x0, x1, openings = []) => {
    for (let x = x0; x <= x1; x += 1) if (!openings.includes(x)) set(blockers, x, y, 10);
  };

  // The 1536 x 1024 map art is drawn at half scale; these hidden walls follow its footprints.
  solidRect(16, 4, 33, 10); // Adventurers' guild hall
  solidRun(11, 16, 33, [23, 24, 25]);
  solidRun(12, 16, 33, [23, 24, 25]);
  solidRect(2, 5, 13, 10); // Bicycle courier stable
  solidRun(11, 2, 13, [5, 6, 7, 8]);
  solidRun(12, 2, 13, [5, 6, 7, 8]);
  solidRect(35, 6, 46, 10); // Firework workshop
  solidRun(11, 35, 46, [39, 40, 41, 42]);
  solidRun(12, 35, 46, [39, 40, 41, 42]);
  solidRect(1, 17, 14, 24); // Money-tree greenhouse
  solidRun(25, 1, 14, [5, 6, 7]);
  solidRun(26, 1, 14, [5, 6, 7]);
  solidRect(34, 15, 46, 23); // Sealed dungeon gate
  solidRun(24, 34, 46, [39, 40, 41]);
  solidRun(25, 34, 46, [39, 40, 41]);

  // Fountain collision leaves narrow paved approaches open on both sides.
  solidRect(22, 17, 25, 23);
  for (let y = 0; y < mapHeight; y += 1) {
    set(blockers, 0, y, 8);
    set(blockers, mapWidth - 1, y, 8);
  }
  for (let x = 0; x < mapWidth; x += 1) {
    set(blockers, x, 0, 8);
    set(blockers, x, mapHeight - 1, 8);
  }

  const point = (id, name, type, x, y, frame, extra = {}) => ({
    id,
    name,
    type,
    x,
    y,
    point: true,
    properties: [
      ...(frame === null ? [] : [{ name: 'spriteFrame', type: 'int', value: frame }]),
      ...(type === 'scenery' ? [{ name: 'label', type: 'string', value: extra.label ?? name }] : []),
      ...Object.entries(extra).map(([key, value]) => ({ name: key, type: typeof value === 'number' ? 'int' : 'string', value })),
    ],
  });
  const objects = [
    point(1, 'player-spawn', 'player-spawn', 384, 244, null),
    point(2, 'about-studio', 'project-anchor', 384, 212, null, { projectId: 'about' }),
    point(3, 'cybertravel-station', 'project-anchor', 128, 208, null, { projectId: 'cybertravel' }),
    point(4, 'firework-stage', 'project-anchor', 648, 212, null, { projectId: 'firework-master' }),
    point(5, 'money-tree-greenhouse', 'project-anchor', 112, 440, null, { projectId: 'cyber-money-tree' }),
    point(6, 'kings-field-ruins', 'project-anchor', 648, 432, null, { projectId: 'kings-field' }),
  ];

  const tileLayer = (id, name, data, visible = true) => ({
    id,
    name,
    type: 'tilelayer',
    x: 0,
    y: 0,
    width: mapWidth,
    height: mapHeight,
    opacity: 1,
    visible,
    parallaxx: 1,
    parallaxy: 1,
    data,
  });
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: mapWidth,
    height: mapHeight,
    tilewidth: tileSize,
    tileheight: tileSize,
    infinite: false,
    nextlayerid: 5,
    nextobjectid: 7,
    tilesets: [{
      firstgid: 1,
      name: 'world-tiles',
      tilewidth: tileSize,
      tileheight: tileSize,
      tilecount: 24,
      columns: 24,
      image: '../art/world-tiles.png',
      imagewidth: 384,
      imageheight: 16,
      tiles: [
        { id: 4, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 6, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 7, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 8, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 9, properties: [{ name: 'solid', type: 'bool', value: true }] },
      ],
    }],
    layers: [
      tileLayer(1, 'Ground', ground),
      tileLayer(2, 'Details', details),
      tileLayer(3, 'Blockers', blockers),
      { id: 4, name: 'Objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, objects },
    ],
  };
}

await mkdir(artDir, { recursive: true });
await mkdir(mapsDir, { recursive: true });
const tileset = createTileset();
const player = createPlayer();
const landmarks = createLandmarks();
const playerFrames = {};
const directions = ['down', 'left', 'right', 'up'];
for (let row = 0; row < directions.length; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    playerFrames[`player-${directions[row]}-${column}`] = {
      frame: { x: column * 16, y: row * 24, w: 16, h: 24 },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: 16, h: 24 },
      sourceSize: { w: 16, h: 24 },
      duration: 125,
    };
  }
}
await Promise.all([
  writeFile(path.join(artDir, 'world-tiles.png'), encodePng(tileset)),
  writeFile(path.join(artDir, 'player.png'), encodePng(player)),
  writeFile(path.join(artDir, 'landmarks.png'), encodePng(landmarks)),
  writeFile(path.join(artDir, 'player-animations.json'), JSON.stringify({
    frames: playerFrames,
    meta: {
      app: 'https://www.aseprite.org/',
      version: '1.3',
      image: 'player.png',
      format: 'RGBA8888',
      size: { w: 48, h: 96 },
      scale: '1',
      frameTags: directions.map((direction, row) => ({
        name: `walk-${direction}`,
        from: row * 3,
        to: row * 3 + 2,
        direction: 'pingpong',
      })),
    },
  }, null, 2)),
  writeFile(path.join(mapsDir, 'workshop-town.json'), JSON.stringify(createMap(), null, 2)),
]);
  console.log('Generated deterministic dusk guild assets, animation metadata, and orthogonal Tiled map.');
