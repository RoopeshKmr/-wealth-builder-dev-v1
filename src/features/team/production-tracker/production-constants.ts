export const PRODUCTION_TABLE_STATUS_OPTIONS = [
  'Complete',
  'Pending',
  'In Progress',
  'Issue',
  'Incomplete',
  'Trial',
  'Chargeback',
] as const;

export const PRODUCTION_MODAL_STATUS_OPTIONS = ['Active', 'Pending', 'Completed', 'Cancelled'] as const;

export const PRODUCTION_TABLE_DELIVERY_OPTIONS = [
  'Approved',
  'Issued',
  'PDR',
  'Sent to TFA',
  'Pending',
  'Other',
] as const;

export const PRODUCTION_MODAL_DELIVERY_OPTIONS = ['Email', 'Mail', 'In Person', 'Digital'] as const;

export const PRODUCTION_COMPANY_OPTIONS = [
  'TRANSAMERICA',
  'NATIONWIDE',
  'NORTH AMERICAN',
  'EVEREST',
  'OTHER',
] as const;

export const PRODUCTION_SPLIT_OPTIONS = ['50/50', '70/30'] as const;
export const PRODUCTION_AGENT_SPLIT_OPTIONS = ['100/0', ...PRODUCTION_SPLIT_OPTIONS] as const;

export const PRODUCTS_BY_COMPANY: Record<string, string[]> = {
  TRANSAMERICA: [
    'FFIUL II',
    'TERM LB - 10 YEARS',
    'TERM LB - 15 YEARS',
    'TERM LB - 20/25/30 YEARS',
    'FINAL EXPENSE',
  ],
  NATIONWIDE: ['NEW HEIGHTS IUL ACCUMULATOR 2020'],
  'NORTH AMERICAN': [
    'SECURE HORIZON - CLIENT AGE 0-70',
    'SECURE HORIZON - CLIENT AGE 71-75',
    'SECURE HORIZON - CLIENT AGE 76+',
  ],
  EVEREST: ['EVEREST'],
  OTHER: ['OTHER'],
};

export const PRODUCTION_MULTIPLIER_TABLE: Record<string, number> = {
  'TRANSAMERICA|FFIUL II': 1.25,
  'TRANSAMERICA|TERM LB - 10 YEARS': 1.1,
  'TRANSAMERICA|TERM LB - 15 YEARS': 1.16,
  'TRANSAMERICA|TERM LB - 20/25/30 YEARS': 1.26,
  'TRANSAMERICA|FINAL EXPENSE': 1.1,
  'NATIONWIDE|NEW HEIGHTS IUL ACCUMULATOR 2020': 1.09,
  'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 0-70': 0.062888,
  'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 71-75': 0.053496,
  'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 76+': 0.040919,
  'EVEREST|EVEREST': 1,
};
