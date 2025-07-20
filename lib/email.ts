// lib/email.ts
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function sendEmail(
  emailData: EmailData,
  user?: User | null
): Promise<EmailResponse> {
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
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: JSON.stringify({
        ...emailData,
        from: emailData.from || 
             `${user?.user_metadata?.full_name || 'Business Manager'} <${user?.email || 'noreply@resend.dev'}>`
      }),
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      messageId: data?.messageId,
      details: data,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
      details: error,
    };
  }
}

// Fallback simulation for development/testing
export async function simulateEmailSend(emailData: EmailData): Promise<EmailResponse> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('📧 Email Simulation:');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Body Preview:', emailData.body.substring(0, 100) + '...');
  
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
}

// Format plain text to HTML
export function formatEmailBody(body: string): string {
  return body
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return '<br>';
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linkedLine = trimmedLine.replace(urlRegex, '<a href="$1" style="color: #3B82F6;">$1</a>');
      return `<p style="margin: 8px 0; line-height: 1.5;">${linkedLine}</p>`;
    })
    .join('');
}

// Alternative email services
export const EMAIL_SERVICES = {
  RESEND: 'resend',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  SMTP: 'smtp',
  POSTMARK: 'postmark',
} as const;

// SendGrid implementation (alternative)
export async function sendEmailWithSendGrid(
  emailData: EmailData,
  user?: User | null
): Promise<EmailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email-sendgrid', {
      body: JSON.stringify({
        ...emailData,
        from: emailData.from || 
             `${user?.user_metadata?.full_name || 'Business Manager'} <${user?.email || 'noreply@resend.dev'}>`
      }),
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      messageId: data?.messageId,
    };
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email via SendGrid',
    };
  }
}