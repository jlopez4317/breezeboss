import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const templates = await base44.asServiceRole.entities.EmailTemplate.list('-created_date', 500);
    let updated = 0;

    for (const template of templates) {
      if ((template.name === 'Appointment Reminder' || template.name === 'Review Request — Nextdoor') && template.body) {
        let newBody = template.body;
        // Remove any variation of the phone number from closing signature
        newBody = newBody.replace(/321-616-9707/g, '');
        newBody = newBody.replace(/\(321\)\s*616-9707/g, '');
        newBody = newBody.replace(/<br\/>\s*321-616-9707/g, '');
        newBody = newBody.replace(/<br\/>\s*\(321\)\s*616-9707/g, '');
        
        if (newBody !== template.body) {
          await base44.asServiceRole.entities.EmailTemplate.update(template.id, { body: newBody });
          updated++;
        }
      }
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});