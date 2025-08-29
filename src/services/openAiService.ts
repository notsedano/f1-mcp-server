import { Message } from '../types';
import { createRagContext } from './ragService';

interface OpenAIResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Function to call OpenAI API with RAG context
export const callOpenAI = async (
  prompt: string,
  apiKey: string,
  systemPrompt: string = "You are Agent DareDevil, an AI sports betting advisor specializing in NBA analytics. You provide insightful, data-driven betting advice with confidence and personality. Your responses should be concise, informative, and focus on statistics, trends, and strategic betting opportunities. Speak in a confident, slightly edgy tone."
): Promise<string> => {
  try {
    // Get RAG context based on the prompt
    const ragContext = createRagContext(prompt);
    
    // Add RAG context to the prompt if available
    const enhancedPrompt = ragContext 
      ? `${ragContext}\n\nUser question: ${prompt}\n\nPlease answer based on the provided information and your knowledge.`
      : prompt;
    
    // Enhanced system prompt with RAG instructions if context is available
    const enhancedSystemPrompt = ragContext
      ? `${systemPrompt}\n\nYou have been provided with additional context from sports betting and NBA-related websites. Use this information to enhance your responses when relevant. Always prioritize the most recent and relevant information from the provided context.`
      : systemPrompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: enhancedSystemPrompt
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return "I'm experiencing some technical difficulties with my analytics systems. Let me get back to you with that insight shortly.";
  }
};

// Generate a DareDevil response using OpenAI
export const generateDareDevilOpenAIResponse = async (
  content: string,
  apiKey: string
): Promise<Message> => {
  try {
    const responseContent = await callOpenAI(content, apiKey);
    
    return {
      id: `daredevil-${Date.now()}`,
      sender: 'daredevil',
      content: responseContent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating DareDevil response:', error);
    
    // Fallback response if API fails
    return {
      id: `daredevil-${Date.now()}`,
      sender: 'daredevil',
      content: "My analytics systems are currently processing. I'll have insights for you shortly.",
      timestamp: new Date().toISOString(),
    };
  }
}; 