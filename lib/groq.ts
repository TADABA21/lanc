const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateWithGroq(messages: GroqMessage[]): Promise<string> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error('Failed to generate content with AI');
  }
}

export const invoicePrompts = {
  generateInvoice: (clientName: string, projectName: string, items: any[]) => [
    {
      role: 'system' as const,
      content: 'You are a professional business invoice specialist. Generate comprehensive, professional invoice content that includes detailed terms and conditions, clear payment instructions, and professional notes. Focus on creating content that maintains good client relationships while protecting business interests.',
    },
    {
      role: 'user' as const,
      content: `Generate professional invoice content for:
Client: ${clientName}
Project: ${projectName}
Line Items: ${items.map(item => `${item.description} (Qty: ${item.quantity}, Rate: $${item.rate}, Amount: $${item.amount})`).join('; ')}

Please provide two distinct sections:

**NOTES SECTION:**
- Professional thank you message
- Brief project summary or description
- Any relevant project details or deliverables completed
- Appreciation for the business relationship
- Contact information for questions

**TERMS & CONDITIONS SECTION:**
- Clear payment due date (30 days standard)
- Accepted payment methods
- Late payment fees and policies
- Dispute resolution process
- Professional business terms
- Legal protections for the service provider

Make both sections professional, clear, and client-friendly while protecting business interests. Use a warm but professional tone.`,
    },
  ],
};

export const contractPrompts = {
  generateContract: (type: string, clientName: string, projectName: string, scope: string) => [
    {
      role: 'system' as const,
      content: 'You are a legal contract specialist. Generate professional, legally sound contract content based on the provided information. Include all necessary clauses, terms, and conditions appropriate for the contract type.',
    },
    {
      role: 'user' as const,
      content: `Generate a ${type} contract for:
Client: ${clientName}
Project: ${projectName}
Scope: ${scope}

Please provide a complete contract with:
1. Parties section
2. Scope of work
3. Payment terms
4. Timeline and deliverables
5. Intellectual property rights
6. Termination clauses
7. Liability limitations
8. Signature sections`,
    },
  ],
};

export const emailPrompts = {
  generateEmail: (purpose: string, clientName: string, context: string) => [
    {
      role: 'system' as const,
      content: 'You are a professional business communication specialist. Generate professional, clear, and engaging email content based on the provided context and purpose.',
    },
    {
      role: 'user' as const,
      content: `Generate a professional email for:
Purpose: ${purpose}
Client: ${clientName}
Context: ${context}

Please provide:
1. Professional subject line
2. Well-structured email body
3. Appropriate tone and language
4. Clear call-to-action if needed`,
    },
  ],
};