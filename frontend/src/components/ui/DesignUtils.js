export const DEPT_HUE = {
  indigo: '#5b54e6',
  teal: '#19a89a',
  amber: '#c98a1e',
  rose: '#d2553f',
  violet: '#9b3d8f',
};

export const deptHueKey = (code) =>
  ({ CSE: 'indigo', ECE: 'teal', MECH: 'amber', CIVIL: 'rose', IT: 'violet' }[code] || 'indigo');

export const deptColor = (code) => DEPT_HUE[deptHueKey(code)] || 'var(--accent)';

export const AVATAR_HUES = ['#5b54e6', '#19a89a', '#c98a1e', '#d2553f', '#9b3d8f', '#3b7ec9', '#2f9968'];

export function hueFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % AVATAR_HUES.length;
  return AVATAR_HUES[h];
}

export function initials(first, last = '') {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}
