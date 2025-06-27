/**
 * MailSift AI - Main Content Script
 * Orchestrates email detection, extraction, prioritization, and widget display
 */

class MailSiftAI {
  constructor() {
    this.detector = new EmailDetector();
    this.extractor = new EmailExtractor(this.detector);
    this.prioritizer = new EmailPrioritizer();
    this.widgetManager = new WidgetManager();
    this.summarizer = new EmailSummarizer();
    
    this.isInitialized = false;
    this.consentGiven = false;
    this.currentEmails = [];
    
    // Bind methods
    this.handleEmailsUpdated = this.handleEmailsUpdated.bind(this);
    this.refresh = this.refresh.bind(this);
    this.summarizeEmail = this.summarizeEmail.bind(this);
  }

  /**
   * Initialize the extension
   */
  async init() {
    try {
      // Check if we're on a supported email service
      const service = this.detector.detectService();
      if (!service) {
        console.log('MailSift AI: Not on a supported email service');
        return;
      }

      console.log(`MailSift AI: Detected ${service.name}`);

      // Check if we're on an inbox page
      if (!this.detector.isInboxPage()) {
        console.log('MailSift AI: Not on inbox page');
        return;
      }

      // Check for user consent
      await this.checkConsent();

      // Initialize components
      await this.prioritizer.loadSettings();
      
      // Set up email extraction observer
      this.extractor.onEmailsUpdated = this.handleEmailsUpdated;
      this.extractor.startObserving();

      // Always show widget by default
      this.widgetManager.show();

      // Initial email processing
      await this.processEmails();

      this.isInitialized = true;
      console.log('MailSift AI: Initialized successfully');

    } catch (error) {
      console.error('MailSift AI: Initialization failed:', error);
    }
  }

  /**
   * Check for user consent to use AI features
   */
  async checkConsent() {
    try {
      const result = await chrome.storage.sync.get(['consentGiven', 'privacyConsent']);
      
      if (!result.consentGiven) {
        this.showConsentDialog();
        return;
      }
      
      this.consentGiven = true;
    } catch (error) {
      console.warn('Failed to check consent:', error);
      // Default to showing consent dialog
      this.showConsentDialog();
    }
  }

  /**
   * Show consent dialog for AI features
   */
  showConsentDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'mailsift-consent-dialog';
    dialog.innerHTML = `
      <div class="mailsift-consent-content">
        <h3>🚀 Welcome to MailSift AI!</h3>
        <p>This extension helps prioritize your emails using AI. To provide the best experience, we need your consent to:</p>
        <ul>
          <li>Analyze email content for prioritization</li>
          <li>Send email content to OpenAI for summarization (optional)</li>
          <li>Store your keywords and preferences locally</li>
        </ul>
        <p><strong>Privacy Promise:</strong> We never store your emails, only send content (not metadata) to OpenAI, and you can opt-out anytime.</p>
        <div class="mailsift-consent-buttons">
          <button class="mailsift-consent-btn mailsift-consent-accept">Accept & Continue</button>
          <button class="mailsift-consent-btn mailsift-consent-decline">Decline</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    dialog.querySelector('.mailsift-consent-accept').addEventListener('click', () => {
      this.acceptConsent();
      dialog.remove();
    });

    dialog.querySelector('.mailsift-consent-decline').addEventListener('click', () => {
      this.declineConsent();
      dialog.remove();
    });
  }

  /**
   * Accept consent and enable features
   */
  async acceptConsent() {
    try {
      await chrome.storage.sync.set({ 
        consentGiven: true, 
        privacyConsent: new Date().toISOString() 
      });
      this.consentGiven = true;
      console.log('MailSift AI: Consent accepted');
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }

  /**
   * Decline consent and disable AI features
   */
  async declineConsent() {
    try {
      await chrome.storage.sync.set({ 
        consentGiven: false,
        settings: { highlightMode: true, summarizationEnabled: false }
      });
      this.consentGiven = false;
      console.log('MailSift AI: Consent declined - AI features disabled');
    } catch (error) {
      console.error('Failed to save consent decline:', error);
    }
  }

  /**
   * Process emails: extract, prioritize, and display
   */
  async processEmails() {
    try {
      // Extract emails from DOM
      this.currentEmails = this.extractor.extractEmails();
      
      if (this.currentEmails.length === 0) {
        console.log('MailSift AI: No emails found');
        return;
      }

      console.log(`MailSift AI: Found ${this.currentEmails.length} emails`);

      // Prioritize emails
      const prioritizedEmails = this.prioritizer.prioritizeEmails(this.currentEmails);
      console.log('MailSift AI: Prioritized emails:', prioritizedEmails.slice(0, 3)); // Log first 3 for debugging
      
      // Apply visual highlighting
      this.prioritizer.applyHighlighting(prioritizedEmails);
      
      // Get top emails for widget
      const topEmails = this.prioritizer.getTopEmails(this.currentEmails);
      console.log('MailSift AI: Top emails for widget:', topEmails);
      
      // Update widget
      if (this.widgetManager.isVisible) {
        console.log('MailSift AI: Updating widget with', topEmails.length, 'emails');
        this.widgetManager.updateContent(topEmails);
      } else {
        console.log('MailSift AI: Widget not visible, skipping update');
      }

      // Auto-summarize top emails if enabled
      if (this.consentGiven && this.prioritizer.settings.summarizationEnabled) {
        this.autoSummarizeTopEmails(topEmails);
      }

    } catch (error) {
      console.error('MailSift AI: Error processing emails:', error);
    }
  }

  /**
   * Handle emails updated event
   */
  handleEmailsUpdated() {
    console.log('MailSift AI: Emails updated, reprocessing...');
    setTimeout(() => {
      this.processEmails();
    }, 1000); // Small delay to ensure DOM is stable
  }

  /**
   * Refresh email processing
   */
  async refresh() {
    console.log('MailSift AI: Refreshing...');
    
    // Reload settings
    await this.prioritizer.loadSettings();
    
    // Reprocess emails
    await this.processEmails();
    
    // Update widget
    if (this.widgetManager.isVisible) {
      const topEmails = this.prioritizer.getTopEmails(this.currentEmails);
      this.widgetManager.updateContent(topEmails);
    }
  }

  /**
   * Summarize a specific email
   * @param {string} emailId - Email ID to summarize
   */
  async summarizeEmail(emailId) {
    if (!this.consentGiven) {
      alert('Please accept the privacy consent to use AI summarization features.');
      return;
    }

    const email = this.currentEmails.find(e => e.id === emailId);
    if (!email) {
      console.warn('Email not found for summarization:', emailId);
      return;
    }

    try {
      // Show loading state in widget
      this.widgetManager.showLoading();
      
      // Get full email content (this would need to be implemented per service)
      const fullContent = await this.getFullEmailContent(email);
      
      // Summarize using AI
      const summary = await this.summarizer.summarize(fullContent || email.content || email.subject);
      
      if (summary) {
        // Update widget with summary
        this.widgetManager.updateSummary(emailId, summary);
        console.log('Email summarized successfully');
      }
    } catch (error) {
      console.error('Failed to summarize email:', error);
      this.widgetManager.showError('Failed to summarize email. Please try again.');
    }
  }

  /**
   * Auto-summarize top priority emails
   * @param {Array} topEmails - Top priority emails
   */
  async autoSummarizeTopEmails(topEmails) {
    if (!this.consentGiven || !this.prioritizer.settings.summarizationEnabled) {
      return;
    }

    // Only summarize top 3 emails to avoid rate limits
    const emailsToSummarize = topEmails.slice(0, 3);
    
    for (const email of emailsToSummarize) {
      // Check if already summarized
      if (this.widgetManager.summaries[email.id]) {
        continue;
      }

      try {
        const summary = await this.summarizer.summarize(email.content || email.subject);
        if (summary) {
          this.widgetManager.updateSummary(email.id, summary);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn('Failed to auto-summarize email:', error);
      }
    }
  }

  /**
   * Get full email content (to be implemented per service)
   * @param {Object} email - Email object
   * @returns {Promise<string>} Full email content
   */
  async getFullEmailContent(email) {
    // This is a placeholder - would need service-specific implementation
    // to open email and extract full content
    return email.content;
  }

  /**
   * Update keywords and refresh
   * @param {Array} keywords - New keywords array
   */
  async updateKeywords(keywords) {
    await this.prioritizer.updateKeywords(keywords);
    await this.refresh();
  }

  /**
   * Update settings and refresh
   * @param {Object} settings - New settings object
   */
  async updateSettings(settings) {
    await this.prioritizer.updateSettings(settings);
    
    // Show/hide widget based on settings
    if (settings.highlightMode && !this.widgetManager.isVisible) {
      this.widgetManager.show();
    } else if (!settings.highlightMode && this.widgetManager.isVisible) {
      this.widgetManager.hide();
    }
    
    await this.refresh();
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    this.extractor.stopObserving();
    this.widgetManager.hide();
  }
}

// Initialize when DOM is ready
let mailSiftAI = null;

function initializeMailSiftAI() {
  if (mailSiftAI) {
    mailSiftAI.cleanup();
  }
  
  mailSiftAI = new MailSiftAI();
  mailSiftAI.init();
  
  // Make globally accessible
  window.mailSiftAI = mailSiftAI;
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMailSiftAI);
} else {
  initializeMailSiftAI();
}

// Handle navigation in SPA (Gmail, Outlook, Yahoo)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('MailSift AI: URL changed, reinitializing...');
    setTimeout(initializeMailSiftAI, 1000); // Delay to ensure new page is loaded
  }
}).observe(document, { subtree: true, childList: true });

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (mailSiftAI) {
    mailSiftAI.cleanup();
  }
});

console.log('MailSift AI: Content script loaded');

// Listen for messages from the popup to scroll to an email
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'gotoEmail' && message.emailId) {
    console.log('Content script: Received gotoEmail for', message.emailId);
    // Try to find the email element by ID
    const selector = `[data-email-id='${message.emailId}'], [id='${message.emailId}']`;
    const emailElement = document.querySelector(selector);
    console.log('Content script: Using selector', selector, 'Found:', !!emailElement);
    if (emailElement) {
      emailElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailElement.classList.add('mailsift-highlighted');
      setTimeout(() => emailElement.classList.remove('mailsift-highlighted'), 2000);
    } else {
      console.warn('Content script: Could not find email element for', message.emailId);
    }
  }
}); 