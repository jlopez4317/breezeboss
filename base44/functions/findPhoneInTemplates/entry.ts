import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = await base44.asServiceRole.entities.EmailTemplate.list('-created_date', 500);
    
    const found = [];
    templates.forEach(t => {
      if ((t.name === 'Appointment Reminder' || t.name === 'Review Request — Nextdoor') && t.body) {
        if (t.body.includes('321') || t.body.includes('616') || t.body.includes('9707')) {
          found.push({ name: t.name, hasPone: true, snippet: t.body.substring(Math.max(0, t.body.indexOf('Regards') - 100), Math.min(t.body.length, t.body.indexOf('Regards') + 100)) });
        }
      }
    });

    return Response.json({ found });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});