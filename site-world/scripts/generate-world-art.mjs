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
  outline: '#253b3b',
  deep: '#203b3c',
  grass: '#456b55',
  grassLight: '#628465',
  grassDark: '#355547',
  leaf: '#6e9560',
  mint: '#8fb08a',
  soil: '#9d795d',
  soilLight: '#c29b70',
  soilDark: '#735845',
  stone: '#899080',
  stoneLight: '#b5b59b',
  stoneDark: '#5d6a65',
  water: '#477b7d',
  waterLight: '#79a6a0',
  roof: '#ae6f57',
  roofLight: '#d39369',
  wood: '#805b45',
  woodLight: '#bd8d5d',
  glass: '#8fc5b2',
  glassLight: '#c6dfb4',
  gold: '#f0c878',
  skin: '#e8b28b',
  hair: '#3a3538',
  jacket: '#496a72',
  jacketLight: '#73928a',
  pants: '#343f54',
  boot: '#513f3d',
  flower: '#e7b783',
  red: '#c96f5b',
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
  const surface = makeSurface(12 * tileSize, tileSize);
  const grass = (tile, seed = 0) => {
    tile.rect(0, 0, 16, 16, 'grass');
    for (let i = 0; i < 5; i += 1) {
      const x = (seed * 7 + i * 5 + 3) % 15;
      const y = (seed * 11 + i * 3 + 2) % 15;
      tile.set(x, y, i % 2 ? 'grassLight' : 'grassDark');
    }
  };
  drawTile(surface, 0, (tile) => grass(tile, 0));
  drawTile(surface, 1, (tile) => {
    grass(tile, 3);
    tile.set(5, 6, 'flower'); tile.set(6, 6, 'gold'); tile.set(5, 7, 'leaf');
    tile.set(12, 11, 'red'); tile.set(13, 11, 'flower'); tile.set(12, 12, 'leaf');
  });
  drawTile(surface, 2, (tile) => {
    tile.rect(0, 0, 16, 16, 'soil');
    tile.rect(2, 3, 4, 2, 'soilLight'); tile.rect(10, 10, 3, 2, 'soilDark');
    tile.set(8, 5, 'soilLight'); tile.set(5, 12, 'soilDark');
  });
  drawTile(surface, 3, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark');
    tile.rect(1, 1, 6, 6, 'stone'); tile.rect(8, 1, 7, 6, 'stoneLight');
    tile.rect(1, 8, 6, 7, 'stoneLight'); tile.rect(8, 8, 7, 7, 'stone');
    tile.set(7, 4, 'stoneDark'); tile.set(7, 11, 'stoneDark');
  });
  drawTile(surface, 4, (tile) => {
    tile.rect(0, 0, 16, 16, 'water');
    tile.rect(2, 3, 5, 1, 'waterLight'); tile.rect(9, 9, 4, 1, 'waterLight');
    tile.set(13, 4, 'waterLight'); tile.set(4, 12, 'stoneDark');
  });
  drawTile(surface, 5, (tile) => {
    tile.rect(0, 0, 16, 16, 'wood');
    tile.rect(1, 2, 14, 1, 'woodLight'); tile.rect(1, 9, 14, 1, 'soilDark');
    tile.rect(3, 0, 1, 16, 'soilDark'); tile.rect(11, 0, 1, 16, 'woodLight');
  });
  drawTile(surface, 6, (tile) => {
    grass(tile, 4);
    tile.rect(0, 5, 16, 2, 'wood'); tile.rect(0, 11, 16, 2, 'woodLight');
    tile.rect(2, 3, 3, 11, 'woodLight'); tile.rect(11, 3, 3, 11, 'wood');
  });
  drawTile(surface, 7, (tile) => {
    grass(tile, 7);
    tile.rect(2, 5, 12, 9, 'stoneDark'); tile.rect(3, 4, 10, 8, 'stone');
    tile.set(5, 6, 'stoneLight'); tile.set(11, 9, 'stoneDark');
  });
  drawTile(surface, 8, (tile) => {
    grass(tile, 9);
    tile.rect(1, 5, 14, 9, 'grassDark'); tile.rect(3, 3, 10, 9, 'leaf');
    tile.rect(5, 1, 6, 4, 'grassLight'); tile.set(4, 7, 'mint');
  });
  drawTile(surface, 9, (tile) => {
    tile.rect(0, 0, 16, 16, 'wood');
    tile.rect(1, 2, 14, 12, 'woodLight'); tile.rect(3, 3, 1, 10, 'soilDark');
    tile.rect(8, 3, 1, 10, 'soilDark'); tile.rect(13, 3, 1, 10, 'soilDark');
    tile.rect(1, 14, 14, 2, 'wood');
  });
  drawTile(surface, 10, (tile) => {
    tile.rect(0, 0, 16, 16, 'stoneDark'); tile.rect(1, 1, 14, 14, 'stone');
    tile.rect(3, 3, 10, 10, 'soilDark'); tile.rect(4, 4, 8, 8, 'soil');
    tile.set(7, 7, 'gold');
  });
  drawTile(surface, 11, (tile) => {
    tile.rect(0, 0, 16, 16, 'grassDark'); tile.rect(2, 2, 12, 12, 'grass');
    tile.rect(4, 4, 8, 1, 'leaf'); tile.rect(4, 11, 8, 1, 'grassLight');
    tile.rect(4, 5, 1, 6, 'leaf'); tile.rect(11, 5, 1, 6, 'leaf');
  });
  return surface;
}

function drawLandmark(surface, frame, draw) {
  const originY = frame * 80;
  const p = (x, y, color) => surface.set(x, originY + y, color);
  const r = (x, y, width, height, color) => surface.rect(x, originY + y, width, height, color);
  const d = { p, r };
  r(10, 69, 76, 6, 'deep');
  draw(d);
}

function createLandmarks() {
  const surface = makeSurface(96, 7 * 80);
  drawLandmark(surface, 0, ({ p, r }) => {
    r(16, 28, 64, 42, 'outline'); r(19, 32, 58, 36, 'wood');
    r(12, 19, 72, 23, 'outline'); r(16, 18, 64, 20, 'roof');
    r(22, 14, 52, 5, 'roofLight'); r(25, 23, 46, 3, 'red');
    r(23, 36, 13, 13, 'gold'); r(60, 36, 13, 13, 'gold');
    r(24, 38, 9, 9, 'glass'); r(61, 38, 9, 9, 'glass');
    r(40, 48, 16, 22, 'soilDark'); r(43, 51, 10, 19, 'woodLight');
    r(49, 59, 2, 2, 'gold'); r(16, 63, 64, 5, 'woodLight');
    p(18, 27, 'roofLight'); p(77, 27, 'roofLight');
  });
  drawLandmark(surface, 1, ({ p, r }) => {
    r(18, 43, 60, 24, 'outline'); r(21, 47, 54, 17, 'stone');
    r(23, 28, 50, 19, 'roof'); r(28, 24, 40, 6, 'roofLight');
    r(30, 50, 8, 12, 'gold'); r(59, 50, 8, 12, 'gold');
    r(31, 52, 5, 8, 'glass'); r(60, 52, 5, 8, 'glass');
    r(43, 43, 12, 24, 'wood'); r(46, 47, 7, 20, 'woodLight');
    r(42, 67, 14, 3, 'stoneDark');
    r(11, 47, 8, 18, 'soilDark'); r(8, 43, 14, 4, 'woodLight');
    r(73, 46, 9, 3, 'woodLight'); p(74, 40, 'gold'); p(78, 41, 'gold');
  });
  drawLandmark(surface, 2, ({ p, r }) => {
    r(12, 48, 72, 21, 'outline'); r(16, 52, 64, 14, 'stone');
    r(22, 34, 52, 15, 'roof'); r(27, 28, 42, 7, 'roofLight');
    r(28, 42, 5, 24, 'wood'); r(63, 42, 5, 24, 'wood');
    r(35, 53, 26, 12, 'soilDark'); r(38, 55, 20, 8, 'deep');
    r(42, 57, 12, 4, 'gold'); p(16, 48, 'gold'); p(78, 48, 'gold');
    r(45, 15, 6, 13, 'woodLight'); r(40, 11, 16, 5, 'red');
    r(42, 7, 12, 4, 'gold');
  });
  drawLandmark(surface, 3, ({ p, r }) => {
    r(13, 39, 70, 31, 'outline'); r(17, 43, 62, 24, 'glass');
    r(17, 43, 62, 4, 'mint'); r(17, 61, 62, 6, 'leaf');
    r(20, 32, 56, 8, 'wood'); r(24, 29, 48, 4, 'woodLight');
    for (const x of [25, 39, 53, 67]) {
      r(x, 46, 2, 16, 'mint'); r(x - 2, 51, 7, 3, 'leaf');
      r(x - 1, 47, 4, 4, 'glassLight');
    }
    r(42, 53, 12, 17, 'soilDark'); r(44, 56, 8, 12, 'soil');
    r(10, 68, 76, 3, 'stoneDark'); p(20, 40, 'glassLight');
  });
  drawLandmark(surface, 4, ({ p, r }) => {
    r(14, 36, 68, 34, 'outline'); r(18, 40, 60, 27, 'stoneDark');
    r(26, 44, 44, 26, 'stone'); r(34, 48, 28, 22, 'deep');
    r(38, 52, 20, 18, 'outline'); r(22, 34, 12, 17, 'stoneLight');
    r(62, 34, 12, 17, 'stoneLight'); r(28, 30, 40, 8, 'stone');
    r(34, 24, 28, 7, 'stoneDark'); p(31, 38, 'gold'); p(66, 39, 'gold');
    r(38, 68, 20, 3, 'stoneLight');
  });
  drawLandmark(surface, 5, ({ p, r }) => {
    r(39, 46, 18, 25, 'wood'); r(43, 48, 10, 20, 'woodLight');
    r(19, 28, 58, 31, 'grassDark'); r(24, 19, 48, 34, 'leaf');
    r(31, 13, 34, 28, 'grassLight'); r(37, 9, 22, 13, 'mint');
    r(31, 29, 8, 8, 'mint'); r(59, 34, 8, 8, 'grassDark');
    p(37, 23, 'glassLight'); p(53, 29, 'glassLight');
    r(36, 69, 24, 4, 'soilDark');
  });
  drawLandmark(surface, 6, ({ p, r }) => {
    r(14, 35, 68, 34, 'outline'); r(18, 39, 60, 28, 'wood');
    r(23, 27, 50, 18, 'roof'); r(28, 24, 40, 5, 'roofLight');
    r(27, 48, 42, 17, 'stoneDark'); r(30, 51, 36, 11, 'gold');
    r(33, 53, 30, 7, 'wood'); r(43, 49, 10, 18, 'red');
    r(46, 52, 4, 10, 'glass'); p(20, 59, 'woodLight');
  });
  return surface;
}

function drawPlayerFrame(surface, column, row, phase) {
  const ox = column * 16;
  const oy = row * 24;
  const p = (x, y, color) => surface.set(ox + x, oy + y, color);
  const r = (x, y, width, height, color) => surface.rect(ox + x, oy + y, width, height, color);
  const facing = ['down', 'left', 'right', 'up'][row];
  r(5, 21, 6, 1, 'deep');
  const stride = phase === 0 ? -1 : phase === 2 ? 1 : 0;
  if (facing === 'left' || facing === 'right') {
    r(6 + stride, 17, 3, 4, 'pants'); r(9 - stride, 17, 3, 4, 'pants');
    r(5 + stride, 20, 4, 2, 'boot'); r(9 - stride, 20, 4, 2, 'boot');
    r(facing === 'left' ? 4 : 6, 5, 7, 7, 'skin');
    r(facing === 'left' ? 4 : 6, 3, 8, 4, 'hair');
    r(5, 10, 7, 8, 'jacket'); r(4, 12 + phase % 2, 3, 5, 'jacketLight');
    r(10, 12 + (phase + 1) % 2, 3, 5, 'jacket');
    r(facing === 'left' ? 4 : 12, 8, 1, 2, 'outline');
  } else {
    r(5 + stride, 17, 3, 4, 'pants'); r(9 - stride, 17, 3, 4, 'pants');
    r(4 + stride, 20, 4, 2, 'boot'); r(9 - stride, 20, 4, 2, 'boot');
    r(4, 4, 8, 8, 'skin');
    r(4, 2, 8, 5, 'hair'); r(3, 5, 2, 4, 'hair'); r(11, 5, 2, 4, 'hair');
    if (facing === 'down') { p(6, 9, 'outline'); p(9, 9, 'outline'); p(7, 10, 'red'); }
    else { r(4, 7, 8, 4, 'hair'); p(5, 10, 'jacketLight'); p(10, 10, 'jacketLight'); }
    r(4, 11, 8, 7, 'jacket'); r(3, 13 + phase % 2, 2, 4, 'jacketLight');
    r(11, 13 + (phase + 1) % 2, 2, 4, 'jacket'); r(6, 12, 4, 2, 'gold');
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
  const path = (x, y, gid = 3) => set(ground, x, y, gid);

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      if (((x * 13 + y * 7) % 37) === 0) set(ground, x, y, 2);
    }
  }
  for (let x = 0; x < mapWidth; x += 1) path(x, 16, 4);
  for (let y = 5; y < 29; y += 1) {
    path(24, y, 4);
  }
  for (let y = 16; y <= 25; y += 1) path(10, y);
  for (let y = 10; y <= 16; y += 1) path(38, y);
  for (let y = 8; y <= 16; y += 1) path(24, y);
  for (let x = 5; x <= 42; x += 1) path(x, 25);

  // Water garden and stepping-stone edge.
  for (let y = 20; y <= 23; y += 1) {
    for (let x = 2; x <= 6; x += 1) set(ground, x, y, 5);
  }
  for (let x = 3; x <= 5; x += 1) set(ground, x, 24, 6);
  // A visible fence across the east side of the starting intersection doubles as a collision test target.
  set(blockers, 26, 16, 7);
  set(blockers, 27, 16, 7);
  // A few stone and hedge obstacles frame the world without blocking its paths.
  for (const [x, y, gid] of [[5, 7, 8], [6, 7, 8], [42, 5, 9], [43, 5, 9], [5, 27, 9], [42, 28, 8]]) {
    set(blockers, x, y, gid);
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
    point(1, 'player-spawn', 'player-spawn', 384, 264, null),
    point(2, 'about-studio', 'project-anchor', 384, 136, null, { projectId: 'about' }),
    point(3, 'cybertravel-station', 'project-anchor', 160, 264, null, { projectId: 'cybertravel' }),
    point(4, 'firework-stage', 'project-anchor', 608, 160, null, { projectId: 'firework-master' }),
    point(5, 'money-tree-greenhouse', 'project-anchor', 160, 416, null, { projectId: 'cyber-money-tree' }),
    point(6, 'kings-field-ruins', 'project-anchor', 608, 416, null, { projectId: 'kings-field' }),
    point(7, 'garden-tree', 'scenery', 456, 432, 5),
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
    nextobjectid: 8,
    tilesets: [{
      firstgid: 1,
      name: 'world-tiles',
      tilewidth: tileSize,
      tileheight: tileSize,
      tilecount: 12,
      columns: 12,
      image: '../art/world-tiles.png',
      imagewidth: 192,
      imageheight: 16,
      tiles: [
        { id: 4, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 6, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 7, properties: [{ name: 'solid', type: 'bool', value: true }] },
        { id: 8, properties: [{ name: 'solid', type: 'bool', value: true }] },
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
console.log('Generated deterministic PNG atlases, animation metadata, and Tiled workshop-town map.');
