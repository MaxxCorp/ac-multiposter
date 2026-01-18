export type IconDef = {
  path: string;
  strokeWidth?: number;
};

export const ICONS = {
  calendar: {
    path:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    strokeWidth: 2
  } satisfies IconDef,
  plus: {
    path: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    strokeWidth: 2
  } satisfies IconDef,
  checkSquare: {
    path: 'M9 12l2 2 4-4M7 7h10v10H7z',
    strokeWidth: 2
  } satisfies IconDef,
  mapPin: {
    path: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    strokeWidth: 2
  } satisfies IconDef,
  box: {
    path: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
    strokeWidth: 2
  } satisfies IconDef,
  users: {
    path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    strokeWidth: 2
  } satisfies IconDef,
  monitor: {
    path: 'M2 3h20v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3m10 18v-4m-4 4h8',
    strokeWidth: 2
  } satisfies IconDef,
  megaphone: {
    path: 'M3 11l8-5v12l-8-5v-2zm18 0a5 5 0 00-5-5v10a5 5 0 005-5zM15 6.09v11.82a9 9 0 0 0 0-11.82z',
    strokeWidth: 2
  } satisfies IconDef
} as const;
