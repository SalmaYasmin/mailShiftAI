/**
 * Email Prioritizer
 * Calculates priority scores based on user-defined keywords and applies visual highlighting
 */

class EmailPrioritizer {
  constructor() {
    this.keywords = [];
    this.settings = {
      highlightMode: true,
      summarizationEnabled: true
    };
    this.loadSettings();
  }

  /**
   * Load user settings and keywords from storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['keywords', 'settings']);
      this.keywords = result.keywords || [];
      this.settings = { ...this.settings, ...result.settings };
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  /**
   * Calculate priority score for an email
   * @param {Object} email - Email object
   * @returns {number} Priority score (0-100)
   */
  calculatePriority(email) {
    let score = 0;
    const text = `${email.subject} ${email.sender} ${email.content}`.toLowerCase();

    // Check for keyword matches
    this.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower)) {
        // Higher score for subject matches
        if (email.subject.toLowerCase().includes(keywordLower)) {
          score += 30;
        }
        // Medium score for sender matches
        if (email.sender.toLowerCase().includes(keywordLower)) {
          score += 20;
        }
        // Lower score for content matches
        if (email.content.toLowerCase().includes(keywordLower)) {
          score += 10;
        }
      }
    });

    // Bonus for unread emails
    if (!email.isRead) {
      score += 5;
    }

    // Bonus for recent emails (within last 24 hours)
    const emailDate = new Date(email.timestamp);
    const now = new Date();
    const hoursDiff = (now - emailDate) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      score += 10;
    }

    const finalScore = Math.min(score, 100);
    
    // Debug log for priority calculation
    if (finalScore > 0) {
      console.log('EmailPrioritizer: Email scored:', {
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        score: finalScore,
        keywords: this.keywords
      });
    }

    return finalScore;
  }

  /**
   * Prioritize a list of emails
   * @param {Array} emails - Array of email objects
   * @returns {Array} Sorted emails by priority
   */
  prioritizeEmails(emails) {
    return emails
      .map(email => ({
        ...email,
        priority: this.calculatePriority(email)
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply visual highlighting to prioritized emails
   * @param {Array} emails - Array of prioritized emails
   */
  applyHighlighting(emails) {
    if (!this.settings.highlightMode) return;

    // Remove existing highlighting
    this.removeHighlighting();

    // Apply highlighting to top priority emails
    const topEmails = emails.slice(0, 5);
    
    topEmails.forEach((email, index) => {
      if (email.priority > 0 && email.element) {
        this.highlightEmail(email.element, email.priority, index);
      }
    });
  }

  /**
   * Highlight a single email element
   * @param {Element} element - Email DOM element
   * @param {number} priority - Priority score
   * @param {number} index - Position in top emails
   */
  highlightEmail(element, priority, index) {
    // Add highlighting classes
    element.classList.add('mailsift-highlighted');
    element.classList.add(`mailsift-priority-${Math.min(Math.floor(priority / 20), 4)}`);
    
    // Add priority badge
    const badge = document.createElement('div');
    badge.className = 'mailsift-priority-badge';
    badge.textContent = `#${index + 1}`;
    badge.title = `Priority Score: ${priority}`;
    
    // Insert badge at the beginning of the element
    element.insertBefore(badge, element.firstChild);
    
    // Add subtle animation
    element.style.animation = 'mailsift-highlight-pulse 2s ease-in-out';
  }

  /**
   * Remove all highlighting from emails
   */
  removeHighlighting() {
    // Remove highlighting classes
    document.querySelectorAll('.mailsift-highlighted').forEach(element => {
      element.classList.remove('mailsift-highlighted');
      element.classList.remove('mailsift-priority-0');
      element.classList.remove('mailsift-priority-1');
      element.classList.remove('mailsift-priority-2');
      element.classList.remove('mailsift-priority-3');
      element.classList.remove('mailsift-priority-4');
      element.style.animation = '';
    });

    // Remove priority badges
    document.querySelectorAll('.mailsift-priority-badge').forEach(badge => {
      badge.remove();
    });
  }

  /**
   * Move prioritized emails to the top of the inbox
   * @param {Array} emails - Array of prioritized emails
   */
  moveToTop(emails) {
    if (!this.settings.highlightMode) return;

    const topEmails = emails.slice(0, 5).filter(email => email.priority > 0);
    const inboxContainer = this.findInboxContainer();
    
    if (!inboxContainer) return;

    // Create a container for prioritized emails
    let priorityContainer = document.getElementById('mailsift-priority-container');
    if (!priorityContainer) {
      priorityContainer = document.createElement('div');
      priorityContainer.id = 'mailsift-priority-container';
      priorityContainer.className = 'mailsift-priority-section';
      
      const header = document.createElement('div');
      header.className = 'mailsift-priority-header';
      header.innerHTML = `
        <span>🚀 Priority Emails</span>
        <button class="mailsift-collapse-btn" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">−</button>
      `;
      priorityContainer.appendChild(header);
      
      // Insert at the top of the inbox
      inboxContainer.insertBefore(priorityContainer, inboxContainer.firstChild);
    }

    // Clear existing priority emails
    const existingEmails = priorityContainer.querySelectorAll('.mailsift-priority-email');
    existingEmails.forEach(email => email.remove());

    // Add prioritized emails to the container
    topEmails.forEach((email, index) => {
      const emailClone = email.element.cloneNode(true);
      emailClone.classList.add('mailsift-priority-email');
      
      // Add priority indicator
      const priorityIndicator = document.createElement('div');
      priorityIndicator.className = 'mailsift-priority-indicator';
      priorityIndicator.textContent = `#${index + 1}`;
      emailClone.insertBefore(priorityIndicator, emailClone.firstChild);
      
      priorityContainer.appendChild(emailClone);
    });
  }

  /**
   * Find the main inbox container
   * @returns {Element|null} Inbox container element
   */
  findInboxContainer() {
    const selectors = [
      '[role="main"]',
      '.mail-app',
      '.inbox',
      '[data-test-id="message-list"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  /**
   * Get top 5 prioritized emails
   * @param {Array} emails - Array of all emails
   * @returns {Array} Top 5 prioritized emails
   */
  getTopEmails(emails) {
    const prioritized = this.prioritizeEmails(emails);
    const topEmails = prioritized.slice(0, 5).filter(email => email.priority > 0);
    
    console.log('EmailPrioritizer: getTopEmails called with', emails.length, 'emails');
    console.log('EmailPrioritizer: Prioritized emails count:', prioritized.filter(e => e.priority > 0).length);
    console.log('EmailPrioritizer: Returning top emails:', topEmails.map(e => ({
      id: e.id,
      subject: e.subject,
      priority: e.priority
    })));
    
    return topEmails;
  }

  /**
   * Update keywords and refresh prioritization
   * @param {Array} newKeywords - New keywords array
   */
  async updateKeywords(newKeywords) {
    this.keywords = newKeywords;
    
    try {
      await chrome.storage.sync.set({ keywords: newKeywords });
    } catch (error) {
      console.warn('Failed to save keywords:', error);
    }
  }

  /**
   * Update settings and refresh display
   * @param {Object} newSettings - New settings object
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    try {
      await chrome.storage.sync.set({ settings: this.settings });
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }
}

// Export for use in other modules
window.EmailPrioritizer = EmailPrioritizer; 