export const C = {
  ground:        '#F4F5F7',
  surface:       '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  border:        '#E2E5EA',
  borderStrong:  '#C9CDD4',
  text1:         '#111318',
  text2:         '#4B5563',
  text3:         '#9CA3AF',
  approve:       '#15803D',
  approveFg:     '#FFFFFF',
  reject:        '#B91C1C',
  rejectFg:      '#FFFFFF',
} as const

export const SEMANTIC = {
  pass:    { label: 'Pass',    bg: '#F0FDF4', text: '#166534', ring: '#BBF7D0' },
  fail:    { label: 'Fail',    bg: '#FFF5F5', text: '#991B1B', ring: '#FECACA' },
  pending: { label: 'Pending', bg: '#FFFBEB', text: '#92400E', ring: '#FDE68A' },
  stale:   { label: 'Stale',   bg: '#F9FAFB', text: '#6B7280', ring: '#E5E7EB' },
} as const

export type Status = keyof typeof SEMANTIC
