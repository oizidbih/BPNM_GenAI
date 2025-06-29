/**
 * AI Service Module for BPMN AI Editor
 * 
 * Supports multiple AI providers:
 * - Anthropic Claude
 * - OpenAI GPT
 * - Google Gemini
 * - Groq
 */

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

/**
 * Initialize AI clients based on available API keys
 */
function initializeAIClients() {
  const clients = {};

  // Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    clients.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('✅ Anthropic Claude initialized');
  }

  // OpenAI GPT
  if (process.env.OPENAI_API_KEY) {
    clients.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI GPT initialized');
  }

  // Google Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      clients.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('✅ Google Gemini initialized');
      
      // Validate the API key format (basic check)
      if (!process.env.GEMINI_API_KEY.startsWith('AI')) {
        console.warn('⚠️ Gemini API key might be invalid - should start with "AI"');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Gemini:', error.message);
    }
  }

  // Groq
  if (process.env.GROQ_API_KEY) {
    clients.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    console.log('✅ Groq initialized');
  }

  return clients;
}

/**
 * Get available AI providers
 * @param {Object} clients - Initialized AI clients
 * @returns {Array} Array of available provider names
 */
function getAvailableProviders(clients) {
  return Object.keys(clients);
}

/**
 * Generate AI response using specified provider
 * @param {Object} clients - Initialized AI clients
 * @param {string} provider - AI provider name
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {Promise<string>} AI response text
 */
async function generateResponse(clients, provider, prompt, options = {}) {
  const maxTokens = options.maxTokens || 4000;
  
  console.log(`🤖 Generating response using ${provider}...`);
  
  try {
    switch (provider) {
      case 'anthropic':
        if (!clients.anthropic) throw new Error('Anthropic client not initialized');
        return await generateAnthropicResponse(clients.anthropic, prompt, maxTokens);
      
      case 'openai':
        if (!clients.openai) throw new Error('OpenAI client not initialized');
        return await generateOpenAIResponse(clients.openai, prompt, maxTokens);
      
      case 'gemini':
        if (!clients.gemini) throw new Error('Gemini client not initialized');
        return await generateGeminiResponse(clients.gemini, prompt, maxTokens);
      
      case 'groq':
        if (!clients.groq) throw new Error('Groq client not initialized');
        return await generateGroqResponse(clients.groq, prompt, maxTokens);
      
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    console.error(`❌ Error with ${provider} provider:`, error.message);
    throw error; // Re-throw to be handled by the calling function
  }
}

/**
 * Generate response using Anthropic Claude
 */
async function generateAnthropicResponse(client, prompt, maxTokens) {
  const result = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  
  return result.content[0].text;
}

/**
 * Generate response using OpenAI GPT
 */
async function generateOpenAIResponse(client, prompt, maxTokens) {
  const result = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  
  return result.choices[0].message.content;
}

/**
 * Generate response using Google Gemini
 */
async function generateGeminiResponse(client, prompt, maxTokens) {
  try {
    console.log('🔍 Gemini: Starting request...');
    
    const model = client.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    });
    
    console.log('🔍 Gemini: Model initialized, sending prompt...');
    const result = await model.generateContent(prompt);
    
    console.log('🔍 Gemini: Response received, processing...');
    const response = await result.response;
    
    // Check if response was blocked
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      throw new Error(`Gemini blocked the request: ${response.promptFeedback.blockReason}`);
    }
    
    // Check if response has text
    const text = response.text();
    console.log('🔍 Gemini: Text extracted successfully, length:', text?.length || 0);
    
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    
    return text;
  } catch (error) {
    console.error('❌ Gemini Error Details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details || error.response?.data || 'No additional details'
    });
    
    // Re-throw with more context
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

/**
 * Generate response using Groq
 */
async function generateGroqResponse(client, prompt, maxTokens) {
  const result = await client.chat.completions.create({
    model: "deepseek-r1-distill-llama-70b",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  
  return result.choices[0].message.content;
}

/**
 * Get provider display information
 */
function getProviderInfo() {
  return {
    anthropic: {
      name: "Anthropic Claude",
      model: "claude-sonnet-4-20250514",
      description: "Best for complex reasoning and code generation",
      icon: "🤖"
    },
    openai: {
      name: "OpenAI GPT-4o",
      model: "gpt-4o",
      description: "Excellent general-purpose AI with strong BPMN knowledge",
      icon: "🧠"
    },
    gemini: {
      name: "Google Gemini",
      model: "gemini-1.5-pro",
      description: "Fast and efficient with good multimodal capabilities",
      icon: "💎"
    },
    groq: {
      name: "Groq",
      model: "deepseek-r1-distill-llama-70b",
      description: "Ultra-fast inference with open-source models",
      icon: "⚡"
    }
  };
}

module.exports = {
  initializeAIClients,
  getAvailableProviders,
  generateResponse,
  getProviderInfo
}; 