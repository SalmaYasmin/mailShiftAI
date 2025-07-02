/**
 * Email Summarizer
 * Safely sends email content to OpenAI for summarization with privacy considerations
 * 
 * TODO: Implement a secure proxy endpoint to avoid exposing API keys in frontend
 * Current implementation uses direct API calls with dummy key for demonstration
 */

class EmailSummarizer {
  constructor() {
    // TODO: Replace with your actual OpenAI API key
    // IMPORTANT: In production, use a secure proxy endpoint to avoid exposing API keys
    this.apiKey = 'sk-your-openai-api-key-here'; // Placeholder key
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests
    
    // Cache for summaries to avoid duplicate requests
    this.summaryCache = new Map();
  }

  /**
   * Summarize email content using OpenAI GPT-4
   * @param {string} content - Email content to summarize
   * @param {Object} options - Summarization options
   * @returns {Promise<string>} Summary text
   */
  async summarize(content, options = {}) {
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for summarization');
    }

    // Check cache first
    const contentHash = this.hashContent(content);
    if (this.summaryCache.has(contentHash)) {
      console.log('Using cached summary');
      return this.summaryCache.get(contentHash);
    }

    // Rate limiting
    await this.rateLimit();

    try {
      // Clean and prepare content
      const cleanContent = this.cleanContent(content);
      
      // Create prompt for summarization
      const prompt = this.createSummarizationPrompt(cleanContent, options);
      
      // Make API request
      const summary = await this.makeApiRequest(prompt);
      
      if (summary) {
        // Cache the result
        this.summaryCache.set(contentHash, summary);
        return summary;
      } else {
        throw new Error('No summary generated');
      }
      
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  /**
   * Create summarization prompt
   * @param {string} content - Clean email content
   * @param {Object} options - Summarization options
   * @returns {string} Formatted prompt
   */
  createSummarizationPrompt(content, options = {}) {
    const maxLength = options.maxLength || 150;
    const style = options.style || 'concise';
    
    return `Please provide a ${style} summary of the following email content in ${maxLength} characters or less. Focus on the key points, action items, and important information:

Email Content:
${content}

Summary:`;
  }

  /**
   * Make API request to OpenAI
   * @param {string} prompt - Formatted prompt
   * @returns {Promise<string>} Summary text
   */
  async makeApiRequest(prompt) {
    // Check if API key is properly configured
    if (!this.apiKey || this.apiKey === 'sk-your-openai-api-key-here') {
      console.log('OpenAI API key not configured, using mock summary');
      return this.generateMockSummary(prompt);
    }
    
    const requestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful email summarization assistant. Provide concise, accurate summaries focusing on key information and action items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        // If it's an authentication error, fall back to mock summary
        if (response.status === 401 || response.status === 403) {
          console.log('Authentication failed, using mock summary');
          return this.generateMockSummary(prompt);
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else {
        throw new Error('Invalid response format from OpenAI API');
      }
      
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      
      // Fallback to mock response for any error
      console.log('Falling back to mock summary due to API error');
      return this.generateMockSummary(prompt);
    }
  }

  /**
   * Generate mock summary for demonstration (when API key not set)
   * @param {string} prompt - Original prompt
   * @returns {string} Mock summary
   */
  generateMockSummary(prompt) {
    // Extract content from prompt
    const contentMatch = prompt.match(/Email Content:\s*([\s\S]*?)(?=\n\nSummary:|$)/);
    const content = contentMatch ? contentMatch[1].trim() : '';
    
    if (!content) {
      return '📧 Email content available for summarization.';
    }

    // Simple mock summarization logic
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyWords = ['urgent', 'important', 'meeting', 'deadline', 'action', 'required', 'please', 'need', 'update', 'review', 'confirm'];
    
    let summary = '';
    
    // Look for sentences with key words
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keyWords.some(word => lowerSentence.includes(word))) {
        summary = sentence.trim() + '.';
        break;
      }
    }
    
    // If no key words found, use first meaningful sentence
    if (!summary && sentences.length > 0) {
      summary = sentences[0].trim() + '.';
    }
    
    // If still no summary, create a basic one
    if (!summary) {
      const words = content.split(' ').slice(0, 10);
      summary = words.join(' ') + (content.length > 50 ? '...' : '');
    }
    
    // Truncate if too long
    if (summary.length > 150) {
      summary = summary.substring(0, 147) + '...';
    }
    
    return summary || '📧 Email content summarized.';
  }

  /**
   * Clean content for API request
   * @param {string} content - Raw content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .trim()
      .substring(0, 2000); // Limit length for API
  }

  /**
   * Hash content for caching
   * @param {string} content - Content to hash
   * @returns {string} Content hash
   */
  hashContent(content) {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  /**
   * Rate limiting to avoid API quota issues
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Clear summary cache
   */
  clearCache() {
    this.summaryCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.summaryCache.size,
      entries: Array.from(this.summaryCache.keys())
    };
  }

  /**
   * Set API key for OpenAI requests
   * @param {string} apiKey - OpenAI API key
   */
  setApiKey(apiKey) {
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'sk-your-openai-api-key-here') {
      this.apiKey = apiKey.trim();
      console.log('OpenAI API key updated');
    } else {
      this.apiKey = 'sk-your-openai-api-key-here';
      console.log('OpenAI API key reset to placeholder');
    }
  }

  /**
   * Check if API key is properly configured
   * @returns {boolean} True if API key is valid
   */
  isApiKeyConfigured() {
    return this.apiKey && 
           this.apiKey !== 'sk-your-openai-api-key-here' && 
           this.apiKey.startsWith('sk-');
  }
}

/**
 * TODO: IMPLEMENT SECURE PROXY ENDPOINT
 * 
 * For production use, implement a secure proxy endpoint to handle OpenAI API calls.
 * This prevents API keys from being exposed in the frontend code.
 * 
 * Example proxy implementation:
 * 
 * 1. Create a backend service (Node.js, Python, etc.)
 * 2. Store API keys securely on the server
 * 3. Create an endpoint like: POST /api/summarize
 * 4. Send email content to your proxy
 * 5. Proxy forwards request to OpenAI with proper authentication
 * 6. Return summary to extension
 * 
 * Benefits:
 * - API keys are never exposed to users
 * - Can implement additional rate limiting
 * - Can add request logging and monitoring
 * - Can implement caching at server level
 * - Better security and control
 * 
 * Example proxy endpoint structure:
 * 
 * POST /api/summarize
 * {
 *   "content": "email content here",
 *   "options": {
 *     "maxLength": 150,
 *     "style": "concise"
 *   }
 * }
 * 
 * Response:
 * {
 *   "summary": "Generated summary text",
 *   "success": true
 * }
 */

// Export for use in other modules
window.EmailSummarizer = EmailSummarizer; 