export const getBigBlindFromLimitName = (limitName?: string | null) => {
  if (!limitName) return null;
  const match = limitName.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 100;
};