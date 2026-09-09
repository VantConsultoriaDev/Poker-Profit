export const formatCurrency = (value: number, currency: 'BRL' | 'USD' = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

export const formatNumber = (value: number, decimals = 0) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatBB = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyBR = (raw: string | number | null | undefined) => {
  if (raw === null || raw === undefined || raw === '') return 0;

  const cleaned = String(raw).replace(/\s/g, '').replace(/[Rr]\$?/g, '');
  const commaIndex = cleaned.lastIndexOf(',');
  if (commaIndex >= 0) {
    const integer = cleaned.slice(0, commaIndex).replace(/\D/g, '') || '0';
    const decimal = cleaned.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2).padEnd(2, '0');
    return Number(`${integer}.${decimal}`);
  }

  const dotParts = cleaned.split('.');
  if (dotParts.length === 2 && dotParts[1].length > 0 && dotParts[1].length <= 2) {
    const integer = dotParts[0].replace(/\D/g, '') || '0';
    const decimal = dotParts[1].replace(/\D/g, '').padEnd(2, '0');
    return Number(`${integer}.${decimal}`);
  }

  return Number(cleaned.replace(/\D/g, '')) || 0;
};