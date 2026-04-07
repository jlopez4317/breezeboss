import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      to, cc, subject,
      body,        // plain text (used for proposals)
      htmlBody,    // HTML (used for invoices)
      pdfBase64,
      fileName,
      fromName,
      fromEmail,
      resendApiKey: inlineKey, // caller can pass key directly
    } = await req.json();

    if (!to || !subject) {
      return Response.json({ error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    // Resolve Resend credentials: prefer inline, fall back to Settings
    let resendApiKey = inlineKey;
    let resendFrom = fromEmail;
    let senderName = fromName;

    if (!resendApiKey || !resendFrom) {
      const settings = await base44.asServiceRole.entities.Settings.list();
      const s = settings[0] || {};
      resendApiKey = resendApiKey || s.resendApiKey;
      resendFrom = resendFrom || s.resendFromEmail;
      senderName = senderName || s.resendFromName || s.companyName || 'BreezeBoss';
    }

    if (!resendApiKey) {
      return Response.json({ error: 'NO_RESEND_KEY', message: 'Resend API key not configured in Settings.' }, { status: 422 });
    }
    if (!resendFrom) {
      return Response.json({ error: 'NO_FROM_EMAIL', message: 'Resend sender email not configured in Settings.' }, { status: 422 });
    }

    const payload = {
      from: `${senderName} <${resendFrom}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    // Use HTML body if provided, otherwise plain text
    if (htmlBody) {
      payload.html = htmlBody;
    } else if (body) {
      payload.text = body;
    }

    // CC recipients
    if (cc && cc.length > 0) {
      payload.cc = Array.isArray(cc) ? cc : [cc];
    }

    // PDF attachment
    if (pdfBase64 && fileName) {
      payload.attachments = [{ filename: fileName, content: pdfBase64 }];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: 'RESEND_ERROR', message: result.message || 'Resend API error', details: result }, { status: 500 });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});