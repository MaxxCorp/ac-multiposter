# Email Templates

This directory contains email templates used by the Email sync provider for sending rich notifications about new events.

## Files

### EventNotification.html.svelte
- **Purpose**: HTML email template with responsive design
- **Features**:
  - Mobile-friendly layout with inline CSS
  - German language content
  - Event details (title, description, dates, location, recurrence)
  - Contact information
  - QR code embedding placeholder (`cid:event-qr-code`)
  - Professional styling

### EventNotification.txt
- **Purpose**: Plain text fallback for email clients
- **Features**:
  - Simple text format
  - German language content
  - All essential event information
  - Template variables are replaced at runtime

## Template System

The email templates are rendered using a custom server-side rendering system located in `src/lib/server/email-templates.ts`. This system:

1. **Loads templates** from the static directory
2. **Processes data** through TypeScript interfaces
3. **Renders HTML** using a custom SSR function
4. **Replaces variables** in text templates
5. **Returns formatted content** for email sending

## Usage

Templates are automatically used by the EmailProvider when sending notifications. The system supports:

- **Dynamic content** based on event data
- **Contact resolution** from event/location associations
- **Date formatting** in German locale
- **Conditional rendering** for optional fields
- **Attachment embedding** (QR codes, iCal, vCard)

## Future Development

This template system is designed to be extensible for:

- **Multiple template types** (reminders, updates, cancellations)
- **Template management UI** for editing/customizing templates
- **Template variables** and conditional logic
- **Multi-language support**
- **Template inheritance** and composition

## Template Variables

### Event Data
- `event.summary` - Event title
- `event.description` - Event description (optional)
- `event.startDate/startDateTime` - Start date/time
- `event.endDate/endDateTime` - End date/time
- `event.location` - Event location (optional)
- `event.recurrence` - Recurrence rules (optional)

### Contact Data
- `contactInfo.name` - Contact person's name
- `contactInfo.email` - Contact email address
- `contactInfo.phone` - Contact phone number (optional)

### Computed Variables
- `startDate` - Formatted start date/time in German
- `endDate` - Formatted end date/time in German