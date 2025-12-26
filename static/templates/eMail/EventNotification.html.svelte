<script lang="ts">
  export let event: {
    summary: string;
    description?: string;
    startDate?: string;
    startDateTime?: Date;
    endDate?: string;
    endDateTime?: Date;
    location?: string;
    recurrence?: string[];
  };

  export let contactInfo: {
    name: string;
    email: string;
    phone?: string;
  };

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

  $: startDate = formatDate(event.startDate, event.startDateTime);
  $: endDate = formatDate(event.endDate, event.endDateTime);
</script>

<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neue Veranstaltung: {event.summary}</title>
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
        <div class="event-title">{event.summary}</div>
    </div>

    <div class="event-details">
        <div class="detail-row">
            <span class="detail-label">Titel:</span> {event.summary}
        </div>

        {#if event.description}
        <div class="detail-row">
            <span class="detail-label">Beschreibung:</span><br>
            {@html event.description.replace(/\n/g, '<br>')}
        </div>
        {/if}

        <div class="detail-row">
            <span class="detail-label">Beginn:</span> {startDate}
        </div>

        {#if endDate !== 'Nicht angegeben'}
        <div class="detail-row">
            <span class="detail-label">Ende:</span> {endDate}
        </div>
        {/if}

        {#if event.location}
        <div class="detail-row">
            <span class="detail-label">Ort:</span> {event.location}
        </div>
        {/if}

        {#if event.recurrence && event.recurrence.length > 0}
        <div class="detail-row">
            <span class="detail-label">Wiederholung:</span> {event.recurrence.join(', ')}
        </div>
        {/if}
    </div>

    <div class="contact-info">
        <h3>Kontaktinformationen</h3>
        <div class="detail-row">
            <span class="detail-label">Name:</span> {contactInfo.name}
        </div>
        <div class="detail-row">
            <span class="detail-label">E-Mail:</span> <a href="mailto:{contactInfo.email}">{contactInfo.email}</a>
        </div>
        {#if contactInfo.phone}
        <div class="detail-row">
            <span class="detail-label">Telefon:</span> <a href="tel:{contactInfo.phone}">{contactInfo.phone}</a>
        </div>
        {/if}
    </div>

    <div class="qr-code">
        <p><strong>QR-Code für schnellen Zugriff:</strong></p>
        <img src="cid:event-qr-code" alt="Event QR Code" style="max-width: 200px;">
    </div>

    <div class="footer">
        <p>Diese E-Mail wurde automatisch von AC-Multiposter generiert.</p>
        <p>Anhänge: iCal-Datei (.ics) für Kalender-Import und vCard (.vcf) für Kontaktdaten.</p>
    </div>
</body>
</html>