// lib/email.ts
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

export async function sendEmail(emailData: EmailData): Promise<EmailResponse> {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return {
      success: false,
      error: 'User not authenticated',
    };
  }

  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...emailData,
        from: emailData.from || 'Business Manager <no-reply@resend.dev>'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const responseData = await response.json();
    return {
      success: true,
      messageId: responseData.messageId,
      details: responseData,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendEmailWithTemplate(
  templateData: {
    to: string;
    templateId?: string;
    variables?: Record<string, any>;
  },
  emailData: Partial<EmailData> = {}
): Promise<EmailResponse> {
  return sendEmail({
    to: templateData.to,
    subject: emailData.subject || 'Template Email',
    body: emailData.body || 'Template content goes here',
    ...emailData,
  });
}

async function simulateEmailSend(emailData: EmailData): Promise<EmailResponse> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('📧 Email Simulation (Development Mode):');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Body Preview:', emailData.body.substring(0, 100) + '...');
  
  return {
    success: true,
    messageId: `dev_sim_${Date.now()}`,
  };
}

function formatEmailBody(body: string): string {
  const htmlBody = body
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return '<br>';
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linkedLine = trimmedLine.replace(urlRegex, '<a href="$1" style="color: #3B82F6;">$1</a>');
      return `<p style="margin: 8px 0; line-height: 1.5;">${linkedLine}</p>`;
    })
    .join('');

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      ${htmlBody}
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        Sent via Business Manager
      </p>
    </div>
  `;
}

export async function sendBulkEmails(
  emails: EmailData[]
): Promise<{ success: EmailResponse[]; failed: { email: EmailData; error: string }[] }> {
  const success: EmailResponse[] = [];
  const failed: { email: EmailData; error: string }[] = [];

  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      if (result.success) {
        success.push(result);
      } else {
        failed.push({ email, error: result.error || 'Unknown error' });
      }
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

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function previewEmail(emailData: EmailData): string {
  return formatEmailBody(emailData.body);
}