import type { NavigateFunction } from 'react-router-dom';

export const navigateRef: { current: NavigateFunction | null } = { current: null };
