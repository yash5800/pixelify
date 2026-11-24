export const makeId = (): string => crypto.randomUUID();

export const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) return '0 KB';
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const downloadName = (name: string): string =>
  `${name.replace(/\.[^.]+$/, '') || 'image'}-cutout.png`;

export const formatDuration = (milliseconds?: number): string => {
  if (!milliseconds) return '';
  return milliseconds < 1000
    ? `${milliseconds} ms`
    : `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} sec`;
};
