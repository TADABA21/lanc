// EmailJS service integration for React Native - FIXED VERSION
import emailjs from '@emailjs/react-native';

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

// Initialize EmailJS with your credentials
const initEmailJS = () => {
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
  
  if (publicKey) {
    emailjs.init({
      publicKey,
    });
  }
};

// Call initialization
initEmailJS();

// Enhanced email validation with more comprehensive checks
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const trimmedEmail = email.trim();
  
  // Basic format check
  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }
  
  // Additional checks
  if (trimmedEmail.length > 254) return false; // RFC 5321 limit
  if (trimmedEmail.includes('..')) return false; // No consecutive dots
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) return false;
  if (trimmedEmail.includes('@.') || trimmedEmail.includes('.@')) return false;
  
  return true;
}

// Clean and normalize email address
function cleanEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  return email
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove any whitespace
    .replace(/[^\w@.-]/g, ''); // Remove special characters except valid email chars
}

// Enhanced EmailJS integration for direct email sending
export async function sendEmail(emailData: EmailData): Promise<EmailResponse> {
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
  
  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS configuration is missing. Falling back to simulation.');
    return simulateEmailSend(emailData);
  }

  // Clean and validate email with detailed logging
  console.log('🔍 Original email data:', JSON.stringify(emailData, null, 2));
  
  const cleanedEmail = cleanEmail(emailData.to);
  console.log('🧹 Cleaned email:', cleanedEmail);
  
  // Enhanced validation with specific error messages
  if (!emailData.to) {
    return { success: false, error: 'Recipient email is required' };
  }
  
  if (!cleanedEmail) {
    return { success: false, error: 'Recipient email cannot be empty after cleaning' };
  }

  if (!validateEmail(cleanedEmail)) {
    return { 
      success: false, 
      error: `Invalid email format: "${cleanedEmail}". Please use format: user@example.com` 
    };
  }

  // Validate subject and body
  if (!emailData.subject?.trim()) {
    return { success: false, error: 'Email subject is required' };
  }

  if (!emailData.body?.trim()) {
    return { success: false, error: 'Email body is required' };
  }

  try {
    console.log('📧 Sending email via EmailJS...');
    console.log('Service ID:', serviceId);
    console.log('Template ID:', templateId);
    console.log('To:', cleanedEmail);
    console.log('Subject:', emailData.subject);

    // Prepare template parameters for EmailJS with careful string handling
    const templateParams = {
      // Core recipient info - ensuring clean strings
      to_email: cleanedEmail,
      to_name: cleanedEmail.split('@')[0] || 'User',
      
      // Sender info with fallbacks
      from_name: (emailData.from || 'Business Manager').trim(),
      from_email: cleanEmail(emailData.from || 'noreply@businessmanager.com'),
      
      // Content with proper trimming
      subject: emailData.subject.trim(),
      message: emailData.body.trim(),
      
      // Reply-to with validation
      reply_to: cleanEmail(emailData.replyTo || emailData.from || 'noreply@businessmanager.com'),
      
      // Optional fields with proper handling
      ...(emailData.cc?.length && { 
        cc: emailData.cc
          .map(email => cleanEmail(email))
          .filter(email => validateEmail(email))
          .join(', ') 
      }),
      
      ...(emailData.bcc?.length && { 
        bcc: emailData.bcc
          .map(email => cleanEmail(email))
          .filter(email => validateEmail(email))
          .join(', ') 
      }),
    };

    console.log('📨 Template params:', JSON.stringify(templateParams, null, 2));

    // Validate all email fields in template params
    const emailFields = ['to_email', 'from_email', 'reply_to'];
    for (const field of emailFields) {
      const email = templateParams[field as keyof typeof templateParams];
      if (email && typeof email === 'string' && !validateEmail(email)) {
        return { 
          success: false, 
          error: `Invalid ${field.replace('_', ' ')}: ${email}` 
        };
      }
    }

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams
    );

    console.log('✅ Email sent successfully via EmailJS');
    console.log('Response:', response);

    return {
      success: true,
      messageId: response.text || 'emailjs_' + Date.now(),
      details: response,
    };
    
  } catch (error) {
    console.error('❌ Error sending email via EmailJS:', error);
    
    // Enhanced error handling with specific EmailJS error codes
    let errorMessage = 'Failed to send email. Please try again.';
    
    if (error && typeof error === 'object') {
      const emailError = error as any;
      
      // Handle EmailJS specific errors
      if (emailError.status) {
        switch (emailError.status) {
          case 400:
            errorMessage = 'Bad request - please check your email data format';
            break;
          case 401:
            errorMessage = 'Unauthorized - please check your EmailJS public key';
            break;
          case 403:
            errorMessage = 'Forbidden - please check your EmailJS service permissions';
            break;
          case 404:
            errorMessage = 'Service or template not found - please check your EmailJS configuration';
            break;
          case 422:
            if (emailError.text?.includes('recipients address is corrupted')) {
              errorMessage = `Invalid recipient email format. Email: "${emailData.to}" was processed as: "${cleanedEmail}"`;
            } else if (emailError.text?.includes('template')) {
              errorMessage = 'Email template error - please check your EmailJS template configuration';
            } else {
              errorMessage = `Email data validation failed: ${emailError.text || 'Unknown validation error'}`;
            }
            break;
          case 429:
            errorMessage = 'Rate limit exceeded - please wait before sending another email';
            break;
          case 500:
            errorMessage = 'Server error - please try again later';
            break;
          default:
            errorMessage = `EmailJS error (${emailError.status}): ${emailError.text || 'Unknown error'}`;
        }
      } else if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else {
          errorMessage = `Send failed: ${error.message}`;
        }
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error,
    };
  }
}

// Debug function to test email formatting
export function debugEmail(email: string): {
  original: string;
  cleaned: string;
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const cleaned = cleanEmail(email);
  
  if (!email) issues.push('Email is empty');
  if (email !== email.trim()) issues.push('Email has leading/trailing whitespace');
  if (email.includes(' ')) issues.push('Email contains spaces');
  if (email !== cleaned) issues.push('Email contains invalid characters');
  if (!validateEmail(cleaned)) issues.push('Email format is invalid');
  
  return {
    original: email,
    cleaned,
    valid: validateEmail(cleaned),
    issues
  };
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
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = templateData.templateId || process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  
  if (!serviceId || !templateId) {
    return simulateEmailSend({
      to: templateData.to,
      subject: 'Template Email',
      body: 'This would be a template-based email.',
      ...emailData,
    });
  }

  // Clean and validate the recipient email
  const cleanedEmail = cleanEmail(templateData.to);
  if (!validateEmail(cleanedEmail)) {
    return {
      success: false,
      error: `Invalid recipient email: ${templateData.to}`,
    };
  }

  try {
    const templateParams = {
      to_email: cleanedEmail,
      ...templateData.variables,
      ...Object.fromEntries(
        Object.entries(emailData).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      ),
    };

    const response = await emailjs.send(serviceId, templateId, templateParams);

    return {
      success: true,
      messageId: response.text || 'emailjs_template_' + Date.now(),
      details: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    };
  }
}

// Rest of the functions remain the same...
async function simulateEmailSend(emailData: EmailData): Promise<EmailResponse> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('📧 Email Simulation (EmailJS not configured):');
  console.log('To:', emailData.to);
  console.log('Subject:', emailData.subject);
  console.log('Body Preview:', emailData.body.substring(0, 100) + '...');
  
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failed.push({ 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return { success, failed };
}

export function previewEmail(emailData: EmailData): string {
  return formatEmailBody(emailData.body);
}

function formatEmailBody(body: string): string {
  const htmlBody = body
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        return '<br>';
      }
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

export const EMAIL_SERVICES = {
  EMAILJS: 'emailjs',
  SMTP: 'smtp',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
} as const;

export const getEmailJSConfig = () => {
  return {
    serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID,
    templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID,
    publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY,
  };
};

export const isEmailJSConfigured = (): boolean => {
  const config = getEmailJSConfig();
  return !!(config.serviceId && config.templateId && config.publicKey);
};