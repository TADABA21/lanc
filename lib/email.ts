// Email service integration
export interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// Enhanced Resend API integration for direct email sending
export async function sendEmail(emailData: EmailData): Promise<EmailResponse> {
  const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.warn('No Resend API key found in environment variables. Email will be simulated.');
    return simulateEmailSend(emailData);
  }

  // Validate email data
  if (!emailData.to || !emailData.subject || !emailData.body) {
    return {
      success: false,
      error: 'Missing required email fields (to, subject, or body)',
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailData.to)) {
    return {
      success: false,
      error: 'Invalid email address format',
    };
  }

  try {
    const payload = {
      from: emailData.from || 'Business Manager <noreply@resend.dev>',
      to: [emailData.to],
      subject: emailData.subject,
      html: formatEmailBody(emailData.body),
      text: emailData.body, // Include plain text version
      ...(emailData.cc && emailData.cc.length > 0 && { cc: emailData.cc }),
      ...(emailData.bcc && emailData.bcc.length > 0 && { bcc: emailData.bcc }),
      ...(emailData.replyTo && { reply_to: emailData.replyTo }),
    };

    console.log('📧 Sending email via Resend API...');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);

    let response: Response;
    let responseData: any;
    
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error('❌ Network error when calling Resend API:', fetchError);
      return {
        success: false,
        error: 'Network error: Unable to connect to email service. Please check your internet connection.',
        details: fetchError,
      };
    }

    // Try to parse response as JSON, handle cases where it might not be JSON
    try {
      responseData = await response.json();
    } catch (jsonError) {
      console.error('❌ Failed to parse response as JSON:', jsonError);
      const responseText = await response.text().catch(() => 'Unable to read response');
      console.error('Raw response:', responseText);
      
      return {
        success: false,
        error: `Invalid response from email service. Status: ${response.status}`,
        details: { status: response.status, responseText },
      };
    }

    if (!response.ok) {
      console.error('❌ Resend API Error:', responseData);
      
      // Handle specific Resend API errors
      let errorMessage = 'Failed to send email';
      if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.error) {
        errorMessage = responseData.error;
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your Resend configuration.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'Email service temporarily unavailable. Please try again later.';
      }
      
      return {
        success: false,
        error: errorMessage,
        details: responseData,
      };
    }

    console.log('✅ Email sent successfully via Resend');
    console.log('Message ID:', responseData.id);

    return {
      success: true,
      messageId: responseData.id,
      details: responseData,
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending email',
      details: error,
    };
  }
}

// Send email with template support
export async function sendEmailWithTemplate(
  templateData: {
    to: string;
    templateId?: string;
    variables?: Record<string, any>;
  },
  emailData: Partial<EmailData> = {}
): Promise<EmailResponse> {
  const RESEND_API_KEY = process.env.EXPO_PUBLIC_RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    return simulateEmailSend({
      to: templateData.to,
      subject: 'Template Email',
      body: 'This would be a template-based email.',
      ...emailData,
    });
  }

  try {
    const payload = {
      from: emailData.from || 'Business Manager <noreply@resend.dev>',
      to: [templateData.to],
      ...(templateData.templateId && { template: templateData.templateId }),
      ...(templateData.variables && { template_variables: templateData.variables }),
      ...emailData,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || 'Failed to send template email',
        details: responseData,
      };
    }

    return {
      success: true,
      messageId: responseData.id,
      details: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Fallback simulation for development/testing
async function simulateEmailSend(emailData: EmailData): Promise<EmailResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('📧 Email Simulation (No API Key):');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Body Preview:', emailData.body.substring(0, 100) + '...');
  
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
}

// Enhanced HTML formatting with better styling
function formatEmailBody(body: string): string {
  const htmlBody = body
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        return '<br>';
      }
      // Convert URLs to clickable links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linkedLine = trimmedLine.replace(urlRegex, '<a href="$1" style="color: #3B82F6;">$1</a>');
      return `<p style="margin: 8px 0; line-height: 1.5;">${linkedLine}</p>`;
    })
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      ${htmlBody}
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        Sent via Business Manager
      </p>
    </div>
  `;
}

// Bulk email sending
export async function sendBulkEmails(
  emails: EmailData[]
): Promise<{ success: EmailResponse[]; failed: { email: EmailData; error: string }[] }> {
  const success: EmailResponse[] = [];
  const failed: { email: EmailData; error: string }[] = [];

  // Send emails with a small delay to avoid rate limiting
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      if (result.success) {
        success.push(result);
      } else {
        failed.push({ email, error: result.error || 'Unknown error' });
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failed.push({ 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return { success, failed };
}

// Email validation utility
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Email preview utility
export function previewEmail(emailData: EmailData): string {
  return formatEmailBody(emailData.body);
}

// Alternative email services you can use:
export const EMAIL_SERVICES = {
  RESEND: 'resend',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  SMTP: 'smtp',
  POSTMARK: 'postmark',
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