/** Party list printouts show only parties that still carry a due or advance balance. */
export function partiesWithBalance<T extends { currentDue?: number; currentAdvance?: number }>(parties: T[]): T[] {
  return (parties || []).filter(
    (p) => p && (Math.abs(Number(p.currentDue) || 0) >= 0.01 || Math.abs(Number(p.currentAdvance) || 0) >= 0.01)
  );
}
