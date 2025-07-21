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
  // Use Supabase Edge Function instead of direct Resend API call
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase configuration missing. Email will be simulated.');
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
    // Get the current user's session token
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    console.log('📧 Sending email via Supabase Edge Function...');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);

    // Call Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function Error:', responseData);
      
      return {
        success: false,
        error: responseData.error || 'Failed to send email',
        details: responseData,
      };
    }

    console.log('✅ Email sent successfully via Edge Function');
    console.log('Message ID:', responseData.id);

    return {
      success: true,
      messageId: responseData.messageId,
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
  // For template emails, fall back to regular sendEmail for now
  // In a production app, you could extend the edge function to support templates
  if (!templateData.templateId) {
    return simulateEmailSend({
      to: templateData.to,
      subject: 'Template Email',
      body: 'This would be a template-based email.',
      ...emailData,
    });
  }

  // Use regular sendEmail for now
  return sendEmail({
    to: templateData.to,
    subject: emailData.subject || 'Template Email',
    body: emailData.body || 'Template email content',
    ...emailData,
  });
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