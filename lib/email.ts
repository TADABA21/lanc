// Email service integration
export interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Using Resend API for email sending
export async function sendEmail(emailData: EmailData): Promise<EmailResponse> {
  const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.warn('No Resend API key found. Email will be simulated.');
    return simulateEmailSend(emailData);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailData.from || 'noreply@yourdomain.com',
        to: [emailData.to],
        subject: emailData.subject,
        html: formatEmailBody(emailData.body),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email');
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Fallback simulation for development/testing
async function simulateEmailSend(emailData: EmailData): Promise<EmailResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('📧 Email Simulation:');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Body:', emailData.body);
  
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
}

// Format plain text to HTML
function formatEmailBody(body: string): string {
  return body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join('');
}

// Alternative email services you can use:
export const EMAIL_SERVICES = {
  RESEND: 'resend',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  SMTP: 'smtp',
} as const;

// SendGrid implementation (alternative)
export async function sendEmailWithSendGrid(emailData: EmailData): Promise<EmailResponse> {
  const SENDGRID_API_KEY = process.env.EXPO_PUBLIC_SENDGRID_API_KEY;
  
  if (!SENDGRID_API_KEY) {
    return simulateEmailSend(emailData);
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.to }],
          subject: emailData.subject,
        }],
        from: { email: emailData.from || 'noreply@yourdomain.com' },
        content: [{
          type: 'text/html',
          value: formatEmailBody(emailData.body),
        }],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email via SendGrid');
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || undefined,
    };
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}