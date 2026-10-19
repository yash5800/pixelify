export const makeId = (): string => crypto.randomUUID();

export const formatBytes = (size: number): string =>
  `${(size / 1024 / 1024).toFixed(size > 1024 * 1024 ? 1 : 0)} MB`;

export const downloadName = (name: string): string =>
  `${name.replace(/\.[^.]+$/, '') || 'image'}-cutout.png`;

export const formatDuration = (milliseconds?: number): string => {
  if (!milliseconds) return '';
  return milliseconds < 1000
    ? `${milliseconds} ms`
    : `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} sec`;
};
