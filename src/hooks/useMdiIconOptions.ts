import * as mdiIcons from '@mdi/js';
import type { IconOption } from '../types';

function toLabel(exportName: string): string {
  return exportName
    .replace(/^mdi/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

/**
 * Full list of @mdi/js icons, built once at module load time.
 * Each option pairs the icon's SVG path with a human readable label.
 */
export const mdiIconOptions: IconOption[] = Object.entries(mdiIcons)
  .filter(([exportName]) => exportName.startsWith('mdi'))
  .map(([exportName, path]) => ({
    name: exportName,
    label: toLabel(exportName),
    path: path as string,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function useMdiIconOptions(): IconOption[] {
  return mdiIconOptions;
}
