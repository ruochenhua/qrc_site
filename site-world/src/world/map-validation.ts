export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface WorldMapObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  properties?: TiledProperty[] | Record<string, unknown>;
}

export interface WorldMapLayer {
  id: number;
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: WorldMapObject[];
}

export interface WorldMapDocument {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: WorldMapLayer[];
}

export function readTiledProperty(object: WorldMapObject, name: string): unknown {
  if (Array.isArray(object.properties)) {
    return object.properties.find((property) => property.name === name)?.value;
  }
  return object.properties?.[name];
}

export function validateWorldMap(map: WorldMapDocument): string[] {
  const errors: string[] = [];
  const requiredLayers = ['Ground', 'Details', 'Blockers', 'Objects'];
  const layersByName = new Map(map.layers.map((layer) => [layer.name, layer]));

  if (map.width <= 0 || map.height <= 0) errors.push('Map dimensions must be positive.');
  if (map.tilewidth !== 16 || map.tileheight !== 16) errors.push('World tiles must be 16 by 16 pixels.');
  for (const name of requiredLayers) {
    if (!layersByName.has(name)) errors.push(`Missing required layer: ${name}.`);
  }

  for (const name of ['Ground', 'Details', 'Blockers']) {
    const layer = layersByName.get(name);
    if (!layer) continue;
    if (layer.type !== 'tilelayer') errors.push(`${name} must be a tile layer.`);
    if (layer.width !== map.width || layer.height !== map.height) errors.push(`${name} dimensions do not match the map.`);
    if (layer.data?.length !== map.width * map.height) errors.push(`${name} must contain one tile value per map cell.`);
  }

  const objectLayer = layersByName.get('Objects');
  if (!objectLayer || objectLayer.type !== 'objectgroup') errors.push('Objects must be an object layer.');
  const objects = objectLayer?.objects ?? [];
  const spawnPoints = objects.filter((object) => object.type === 'player-spawn');
  if (spawnPoints.length !== 1) errors.push('Map must have exactly one player spawn point.');

  const objectIds = new Set<number>();
  const projectIds = new Set<string>();
  for (const object of objects) {
    if (objectIds.has(object.id)) errors.push(`Object ID ${object.id} is duplicated.`);
    objectIds.add(object.id);
    if (object.x < 0 || object.y < 0 || object.x > map.width * map.tilewidth || object.y > map.height * map.tileheight) {
      errors.push(`Object ${object.name || object.id} is outside the map bounds.`);
    }
    if (object.type === 'project-anchor') {
      const projectId = readTiledProperty(object, 'projectId');
      if (typeof projectId !== 'string' || projectId.length === 0) errors.push(`Project anchor ${object.name} has no projectId.`);
      else if (projectIds.has(projectId)) errors.push(`Project anchor ID ${projectId} is duplicated.`);
      else projectIds.add(projectId);
    }
  }
  return errors;
}
