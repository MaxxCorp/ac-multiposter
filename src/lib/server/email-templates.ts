import EventNotificationHtml from '../../../static/templates/eMail/EventNotification.html.svelte';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface EmailTemplateData {
  event: {
    summary: string;
    description?: string;
    startDate?: string;
    startDateTime?: Date;
    endDate?: string;
    endDateTime?: Date;
    location?: string;
    recurrence?: string[];
  };
  isAnnouncement?: boolean;
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
  };
}

export async function renderEmailTemplates(data: EmailTemplateData): Promise<{ html: string; text: string }> {
  // Render HTML template using Svelte SSR
  const html = renderSvelteComponent(EventNotificationHtml, data);

  // Read and process text template
  const textTemplatePath = join(process.cwd(), 'static', 'templates', 'eMail', 'EventNotification.txt');
  let text = readFileSync(textTemplatePath, 'utf-8');

  // Replace template variables
  const startDate = formatDate(data.event.startDate, data.event.startDateTime);
  const endDate = formatDate(data.event.endDate, data.event.endDateTime);

  text = text
    .replace('{event.summary}', data.event.summary)
    .replace('{event.description ? `Beschreibung: ${event.description}\\n\\n` : \'\'}', data.event.description ? `Beschreibung: ${data.event.description}\n\n` : '')
    .replace('{startDate}', data.isAnnouncement ? '' : `Beginn: ${startDate}\n`)
    .replace('{endDate !== \'Nicht angegeben\' ? `Ende: ${endDate}\\n` : \'\'}', !data.isAnnouncement && endDate !== 'Nicht angegeben' ? `Ende: ${endDate}\n` : '')
    .replace('{event.location ? `Ort: ${event.location}\\n` : \'\'}', data.event.location ? `Ort: ${data.event.location}\n` : '')
    .replace('{event.recurrence && event.recurrence.length > 0 ? `Wiederholung: ${event.recurrence.join(\', \')}\\n` : \'\'}', data.event.recurrence && data.event.recurrence.length > 0 ? `Wiederholung: ${data.event.recurrence.join(', ')}\n` : '')
    .replace('{contactInfo.name}', data.contactInfo.name)
    .replace('{contactInfo.email}', data.contactInfo.email)
    .replace('{contactInfo.phone ? `Telefon: ${contactInfo.phone}\\n` : \'\'}', data.contactInfo.phone ? `Telefon: ${data.contactInfo.phone}\n` : '');

  return { html, text };
}

function formatDate(dateStr?: string, dateTime?: Date): string {
  if (dateTime) {
    return dateTime.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (dateStr) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return 'Nicht angegeben';
}

// Server-side rendering utility for Svelte components
function renderSvelteComponent(Component: any, props: any): string {
  // For now, we'll implement a simple template renderer
  // In a full implementation, you'd use Svelte's SSR capabilities
  // For this email template, we'll create a simple renderer

  const event = props.event;
  const contactInfo = props.contactInfo;

  const startDate = formatDate(event.startDate, event.startDateTime);
  const endDate = formatDate(event.endDate, event.endDateTime);

  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Veranstaltung: ${event.summary}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .event-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
        .event-details { background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; }
        .detail-row { margin-bottom: 15px; }
        .detail-label { font-weight: bold; color: #495057; }
        .contact-info { background-color: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .qr-code { text-align: center; margin: 20px 0; }
        .footer { font-size: 12px; color: #6c757d; margin-top: 30px; border-top: 1px solid #dee2e6; padding-top: 20px; }
        @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .header, .event-details, .contact-info { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Neue Veranstaltung</h1>
        <div class="event-title">${event.summary}</div>
    </div>

    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">Titel:</span> ${event.summary}
        </div>

        ${event.description ? `
        <div class="detail-row">
            <span class="detail-label">Beschreibung:</span><br>
            ${event.description.replace(/\n/g, '<br>')}
        </div>
        ` : ''}

        ${!props.isAnnouncement ? `
        <div class="detail-row">
            <span class="detail-label">Beginn:</span> ${startDate}
        </div>

        ${endDate !== 'Nicht angegeben' ? `
        <div class="detail-row">
            <span class="detail-label">Ende:</span> ${endDate}
        </div>
        ` : ''}
        ` : ''}

        ${event.location ? `
        <div class="detail-row">
            <span class="detail-label">Ort:</span> ${event.location}
        </div>
        ` : ''}

        ${!props.isAnnouncement && event.recurrence && event.recurrence.length > 0 ? `
        <div class="detail-row">
            <span class="detail-label">Wiederholung:</span> ${event.recurrence.join(', ')}
        </div>
        ` : ''}
    </div>

    <div class="contact-info">
        <h3>Kontaktinformationen</h3>
        <div class="detail-row">
            <span class="detail-label">Name:</span> ${contactInfo.name}
        </div>
        <div class="detail-row">
            <span class="detail-label">E-Mail:</span> <a href="mailto:${contactInfo.email}">${contactInfo.email}</a>
        </div>
        ${contactInfo.phone ? `
        <div class="detail-row">
            <span class="detail-label">Telefon:</span> <a href="tel:${contactInfo.phone}">${contactInfo.phone}</a>
        </div>
        ` : ''}
    </div>

    <div class="qr-code">
        <p><strong>QR-Code für schnellen Zugriff:</strong></p>
        <img src="cid:event-qr-code" alt="Event QR Code" style="max-width: 200px;">
    </div>

    <div class="footer">
        <p>Diese E-Mail wurde automatisch von AC-Multiposter generiert.</p>
        <p>Anhänge: ${props.isAnnouncement ? '' : 'iCal-Datei (.ics) für Kalender-Import und '}vCard (.vcf) für Kontaktdaten.</p>
    </div>
</body>
</html>`;
}