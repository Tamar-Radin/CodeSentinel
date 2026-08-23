import type { LoginResponse } from '@architect/shared';

type UserInfo = LoginResponse['user'];

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const ROLE_LABELS: Record<string, string> = {
  admin: 'מנהל',
  manager: 'מנהל',
  user: 'משתמש',
};

export const getRoleLabel = (role: string): string =>
  ROLE_LABELS[role] ?? role;

export type { UserInfo };
