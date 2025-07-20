// lib/groq.ts
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const invoicePrompts = {
  generateInvoice: (clientName: string, projectName: string, items: any[]): GroqMessage[] => [
    {
      role: 'system',
      content: `You are an expert at generating professional invoices. 
      Create invoice content including notes and terms based on the provided information.
      The notes should include a thank you message and any relevant details.
      The terms should include payment conditions and other important terms.
      Format the response with clear sections for Notes and Terms.`
    },
    {
      role: 'user',
      content: `Client: ${clientName}
Project: ${projectName}
Items: ${JSON.stringify(items)}`
    }
  ],
  
  parseSummary: (summary: string): GroqMessage[] => [
    {
      role: 'system',
      content: `You are an expert at parsing work summaries and extracting line items for invoices. 
      Extract the items, quantities, and prices from the following summary and return them as a JSON array. 
      Each item should have description, quantity (default to 1 if not specified), and rate (price). 
      Return ONLY valid JSON. Example output: 
      [{"description": "Website design", "quantity": 1, "rate": 500}, 
      {"description": "SEO optimization", "quantity": 1, "rate": 200}]`
    },
    {
      role: 'user',
      content: summary
    }
  ]
};

export const contractPrompts = {
  generateContract: (type: string, clientName: string, projectName: string, scope: string): GroqMessage[] => [
    {
      role: 'system',
      content: 'You are a legal contract specialist. Generate professional, legally sound contract content based on the provided information. Include all necessary clauses, terms, and conditions appropriate for the contract type.',
    },
    {
      role: 'user',
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
  generateEmail: (purpose: string, clientName: string, context: string): GroqMessage[] => [
    {
      role: 'system',
      content: 'You are a professional business communication specialist. Generate professional, clear, and engaging email content based on the provided context and purpose.',
    },
    {
      role: 'user',
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

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateWithGroq(messages: GroqMessage[]): Promise<string> {
  const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || 'your-api-key-here';
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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