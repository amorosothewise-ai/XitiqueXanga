export const formatCurrency = (amount: number): string => {
  // Using standard Mozambican Metical formatting
  return new Intl.NumberFormat('pt-MZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' MT';
};

export const formatCurrencyInput = (val: string): number => {
  // Helper to parse currency strings back to numbers if needed
  return Number(val.replace(/[^0-9.-]+/g, ""));
};