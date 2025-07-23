// File: supabase/functions/send-email/index.ts

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// @ts-ignore - Deno global type
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      // @ts-ignore - Deno global type
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore - Deno global type
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse the request body
    const emailData: EmailRequest = await req.json();

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.body) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, and body are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email address format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Resend API key from environment
    // @ts-ignore - Deno global type
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user profile for sender information
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Prepare sender information
    const senderName = userProfile?.full_name || user.email?.split('@')[0] || 'LANCELOT';
    const senderEmail = user.email || 'noreply@resend.dev';
    const fromAddress = emailData.from || `${senderName} <${senderEmail}>`;

    // Format email body as HTML
    const formatEmailBody = (body: string): string => {
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
            Sent via LANCEOT
          </p>
        </div>
      `;
    };

    // Prepare Resend payload
    const resendPayload = {
      from: fromAddress,
      to: [emailData.to],
      subject: emailData.subject,
      html: formatEmailBody(emailData.body),
      text: emailData.body,
      ...(emailData.cc && emailData.cc.length > 0 && { cc: emailData.cc }),
      ...(emailData.bcc && emailData.bcc.length > 0 && { bcc: emailData.bcc }),
      ...(emailData.replyTo && { reply_to: emailData.replyTo }),
    };

    console.log('📧 Sending email via Resend API...');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Resend API Error:', resendData);
      
      let errorMessage = 'Failed to send email';
      if (resendData.message) {
        errorMessage = resendData.message;
      } else if (resendResponse.status === 401) {
        errorMessage = 'Invalid API key. Please check your Resend configuration.';
      } else if (resendResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (resendResponse.status >= 500) {
        errorMessage = 'Email service temporarily unavailable. Please try again later.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: resendData 
        }),
        { 
          status: resendResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Email sent successfully via Resend');
    console.log('Message ID:', resendData.id);

    // Log the email activity in the database
    try {
      await supabaseClient
        .from('activities')
        .insert([{
          type: 'email_sent',
          title: `Email sent: ${emailData.subject}`,
          description: `To: ${emailData.to}${resendData.id ? `\nMessage ID: ${resendData.id}` : ''}`,
          entity_type: 'email',
          entity_id: resendData.id,
          user_id: user.id,
        }]);
    } catch (activityError) {
      console.error('Failed to log activity (non-critical):', activityError);
    }

    const response: EmailResponse = {
      success: true,
      messageId: resendData.id,
      details: resendData,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});