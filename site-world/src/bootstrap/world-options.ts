export interface WorldOptions {
  width?: number;
  height?: number;
  fitMapToViewport?: boolean;
}

export interface NormalizedWorldOptions {
  width: number;
  height: number;
  fitMapToViewport: boolean;
}

const DEFAULT_WORLD_OPTIONS: NormalizedWorldOptions = {
  width: 640,
  height: 360,
  fitMapToViewport: false,
};

export function normalizeWorldOptions(options: WorldOptions): NormalizedWorldOptions {
  return {
    width: options.width ?? DEFAULT_WORLD_OPTIONS.width,
    height: options.height ?? DEFAULT_WORLD_OPTIONS.height,
    fitMapToViewport: options.fitMapToViewport ?? DEFAULT_WORLD_OPTIONS.fitMapToViewport,
  };
}
