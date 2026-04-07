import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = await base44.asServiceRole.entities.EmailTemplate.list('-created_date', 500);
    
    const apptTemplate = templates.find(t => t.name === 'Appointment Reminder');

    return Response.json({ 
      apptFound: !!apptTemplate,
      apptBody: apptTemplate?.body,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});