export const FILTER_KEYS = {
  BPM: 'BPM Attendance',
  BIG_EVENT: 'Big Event',
  KEY_PLAYER: 'Key Player',
  LICENSED: 'Licensed',
  NET_LICENSED: 'Net Licensed',
  CLIENT: 'Client',
} as const;

export const FILTER_COLORS: Record<string, string> = {
  [FILTER_KEYS.BPM]: '#E85BB0',
  [FILTER_KEYS.BIG_EVENT]: '#F4B63E',
  [FILTER_KEYS.KEY_PLAYER]: '#C7641A',
  [FILTER_KEYS.LICENSED]: '#83D0DA',
  [FILTER_KEYS.NET_LICENSED]: '#0E6E2D',
  [FILTER_KEYS.CLIENT]: '#31A24C',
};
