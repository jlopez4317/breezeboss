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
    const results = [];

    for (const template of templates) {
      if (!template.body) continue;

      let newBody = template.body;

      // Remove all variations of "Best regards, [COMPANY_NAME]" closing signatures
      // These are redundant because the footer injected by resolveBody() already includes the company name
      newBody = newBody.replace(/<p>Best regards,<br\s*\/?><strong>\[COMPANY_NAME\]<\/strong><\/p>\s*/gi, '');
      newBody = newBody.replace(/<p>Best regards,<br><strong>\[COMPANY_NAME\]<\/strong><\/p>\s*/gi, '');
      newBody = newBody.replace(/<p>Best regards,<br\/><strong>\[COMPANY_NAME\]<\/strong><\/p>\s*/gi, '');

      if (newBody !== template.body) {
        await base44.asServiceRole.entities.EmailTemplate.update(template.id, { body: newBody });
        updated++;
        results.push(template.name);
      }
    }

    return Response.json({ success: true, updated, templates: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});