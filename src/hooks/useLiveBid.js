import { useMemo } from 'react';

/**
 * Given a bid record and the live jobMaterials array for its job,
 * returns a new bid object with materialSubtotal, taxAmount, totalAmount,
 * and payment schedule amounts all recalculated from live data.
 * Also returns `materialsChanged` flag when the stored subtotal differs.
 */
export function useLiveBid(bid, jobMaterials, markupPct = 0) {
  return useMemo(() => {
    if (!bid) return { liveBid: bid, materialsChanged: false };

    const rawSub = (jobMaterials || []).reduce((sum, m) => sum + (m.totalCost || m.quantity * m.unitCost || 0), 0);
    const markupMultiplier = 1 + ((markupPct || bid.markupPercent || 0) / 100);
    const liveSub = rawSub * markupMultiplier;
    const labor = bid.laborCost || 0;
    const taxRate = bid.taxRate || 0;
    const taxAmount = liveSub * (taxRate / 100);
    const totalAmount = liveSub + labor + taxAmount;

    const storedSub = bid.materialSubtotal || 0;
    const materialsChanged = Math.abs(liveSub - storedSub) > 0.005;

    const liveBid = {
      ...bid,
      materialSubtotal: liveSub,
      taxAmount,
      totalAmount,
    };

    return { liveBid, materialsChanged };
  }, [bid, jobMaterials]);
}