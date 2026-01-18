import { Frequency } from '../types';

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Using pt-MZ (Mozambique) for correct local formatting
  return new Date(dateStr).toLocaleDateString('pt-MZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const addPeriod = (dateStr: string, frequency: Frequency, count: number): string => {
  const date = new Date(dateStr);
  if (frequency === Frequency.DAILY) {
    date.setDate(date.getDate() + count);
  } else if (frequency === Frequency.WEEKLY) {
    date.setDate(date.getDate() + (7 * count));
  } else {
    date.setMonth(date.getMonth() + count);
  }
  return date.toISOString();
};

export const calculateDuration = (frequency: Frequency, count: number, lang: 'pt' | 'en' = 'pt'): string => {
  if (lang === 'pt') {
    if (frequency === Frequency.DAILY) return `${count} Dias`;
    if (frequency === Frequency.WEEKLY) return `${count} Semanas`;
    return `${count} Meses`;
  }
  if (frequency === Frequency.DAILY) return `${count} Days`;
  if (frequency === Frequency.WEEKLY) {
    return `${count} Weeks`;
  }
  return `${count} Months`;
};