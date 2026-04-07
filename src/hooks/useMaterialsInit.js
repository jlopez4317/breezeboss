import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SEED_MATERIALS } from '@/lib/materialsSeedData';

const PRICING_UPDATE_INTERVAL_DAYS = 7;
const CHUNK_SIZE = 50; // how many materials to send per AI pricing request

async function seedIfEmpty() {
  const existing = await base44.entities.Material.list('name', 1);
  if (existing.length > 0) return;

  const today = new Date().toISOString().split('T')[0];
  const withDate = SEED_MATERIALS.map(m => ({ ...m, lastPriceUpdate: today }));

  // Bulk create in batches of 50
  for (let i = 0; i < withDate.length; i += 50) {
    await base44.entities.Material.bulkCreate(withDate.slice(i, i + 50));
  }
}

async function runPricingUpdate(materials, onDone) {
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < materials.length; i += CHUNK_SIZE) {
    const chunk = materials.slice(i, i + CHUNK_SIZE);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an HVAC materials pricing expert. Research current 2025 US wholesale contractor prices from major HVAC distributors (Johnstone Supply, Wittichen Supply, Baker Distributing, Ferguson HVAC, Gemaire). For each material below, return its updated wholesale cost as a number. Return ONLY a JSON object with the material ID as the key and the price (number) as the value. No commentary.

Materials:
${chunk.map(m => `"${m.id}": "${m.name}" (${m.category}, ${m.unit}) - current: $${m.defaultCost}`).join('\n')}`,
      response_json_schema: {
        type: 'object',
        properties: { prices: { type: 'object', additionalProperties: { type: 'number' } } }
      },
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    if (res?.prices) {
      for (const [matId, price] of Object.entries(res.prices)) {
        if (typeof price === 'number' && price > 0) {
          await base44.entities.Material.update(matId, { defaultCost: price, lastPriceUpdate: today });
        }
      }
    }
  }

  onDone();
}

function needsPricingUpdate(materials) {
  if (!materials || materials.length === 0) return false;
  const oldest = materials.reduce((oldest, m) => {
    if (!m.lastPriceUpdate) return oldest;
    return !oldest || m.lastPriceUpdate < oldest ? m.lastPriceUpdate : oldest;
  }, null);
  if (!oldest) return true;
  const daysSince = (Date.now() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= PRICING_UPDATE_INTERVAL_DAYS;
}

export function useMaterialsInit(onPricingStart, onPricingEnd) {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      // Step 1: Seed if empty (silently)
      await seedIfEmpty();

      // Step 2: Fetch current materials to check pricing staleness
      const materials = await base44.entities.Material.list('name', 500);
      queryClient.setQueryData(['materials'], materials);

      // Step 3: Auto-pricing update if needed
      if (needsPricingUpdate(materials)) {
        onPricingStart();
        runPricingUpdate(materials, () => {
          queryClient.invalidateQueries({ queryKey: ['materials'] });
          onPricingEnd(true);
        }).catch(() => {
          onPricingEnd(false); // fail silently
        });
      }
    };

    run().catch(() => {}); // never throw to the user
  }, []);
}