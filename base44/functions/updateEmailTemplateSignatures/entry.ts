import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all templates
    const templates = await base44.asServiceRole.entities.EmailTemplate.list('-created_date', 100);

    const updates = [];

    templates.forEach(t => {
      let updatedBody = t.body;
      let changed = false;

      // Remove duplicate [COMPANY_PHONE] from closing signatures
      // Pattern: <br/>[COMPANY_PHONE] appearing after [COMPANY_NAME] in closing p tags
      if (updatedBody.includes('<br/>[COMPANY_PHONE]</p>')) {
        updatedBody = updatedBody.replace(/<br\/>\[COMPANY_PHONE\]<\/p>/g, '</p>');
        changed = true;
      }

      if (changed) {
        updates.push({ id: t.id, body: updatedBody });
      }
    });

    // Batch update templates
    for (const update of updates) {
      await base44.asServiceRole.entities.EmailTemplate.update(update.id, { body: update.body });
    }

    return Response.json({ 
      success: true, 
      message: `Updated ${updates.length} templates`,
      count: updates.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});