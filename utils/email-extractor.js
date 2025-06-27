/**
 * Email Content Extractor
 * Extracts email subjects, senders, and content from DOM for different email services
 */

class EmailExtractor {
  constructor(detector) {
    this.detector = detector;
    this.observer = null;
  }

  /**
   * Extract all visible emails from the inbox
   * @returns {Array} Array of email objects
   */
  extractEmails() {
    const service = this.detector.getCurrentService();
    if (!service) return [];

    const selectors = this.detector.getSelectors();
    const emailElements = document.querySelectorAll(selectors.emailItems);
    
    const emails = [];
    
    emailElements.forEach((element, index) => {
      try {
        const email = this.extractEmailFromElement(element, selectors);
        if (email) {
          email.index = index;
          emails.push(email);
        }
      } catch (error) {
        console.warn('Failed to extract email:', error);
      }
    });

    return emails;
  }

  /**
   * Extract email data from a single DOM element
   * @param {Element} element - DOM element containing email
   * @param {Object} selectors - Service-specific selectors
   * @returns {Object|null} Email object or null if extraction fails
   */
  extractEmailFromElement(element, selectors) {
    try {
      const subject = this.extractSubject(element, selectors);
      const sender = this.extractSender(element, selectors);
      const content = this.extractContent(element, selectors);
      const timestamp = this.extractTimestamp(element, selectors);
      const isRead = this.isEmailRead(element, selectors);
      const id = this.generateEmailId(element);

      if (!subject && !sender) return null;

      const email = {
        id: id,
        subject: subject || 'No Subject',
        sender: sender || 'Unknown Sender',
        content: content || '',
        timestamp: timestamp || new Date().toISOString(),
        isRead: isRead,
        element: element,
        priority: 0 // Will be calculated by prioritizer
      };

      // Debug log for extracted email data
      console.log('EmailExtractor: Extracted email:', {
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        contentLength: email.content.length,
        timestamp: email.timestamp,
        isRead: email.isRead
      });

      return email;
    } catch (error) {
      console.warn('Error extracting email from element:', error);
      return null;
    }
  }

  /**
   * Extract subject from email element
   * @param {Element} element - Email DOM element
   * @param {Object} selectors - Service selectors
   * @returns {string} Subject text
   */
  extractSubject(element, selectors) {
    // Special handling for Gmail inbox: span.bog may contain a nested span with the subject
    if (selectors.subject && selectors.subject.includes('span.bog')) {
      const bog = element.querySelector('span.bog');
      if (bog) {
        // Get the full text content, including nested spans
        const text = bog.textContent?.trim();
        if (text) return text;
      }
    }

    // Fallback to other selectors
    const subjectSelectors = [
      selectors.subject,
      '[data-test-id="message-subject"]',
      '[title]',
      '.subject',
      '.email-subject'
    ];

    for (const selector of subjectSelectors) {
      const subjectElement = element.querySelector(selector);
      if (subjectElement) {
        const text = subjectElement.textContent?.trim() || subjectElement.title?.trim();
        if (text) return text;
      }
    }

    return '';
  }

  /**
   * Extract sender from email element
   * @param {Element} element - Email DOM element
   * @param {Object} selectors - Service selectors
   * @returns {string} Sender text
   */
  extractSender(element, selectors) {
    const senderSelectors = [
      selectors.sender,
      '[data-test-id="message-sender"]',
      '[email]',
      '.sender',
      '.from'
    ];

    for (const selector of senderSelectors) {
      const senderElement = element.querySelector(selector);
      if (senderElement) {
        const text = senderElement.textContent?.trim() || senderElement.title?.trim();
        if (text) return text;
      }
    }

    return '';
  }

  /**
   * Extract content from email element
   * @param {Element} element - Email DOM element
   * @param {Object} selectors - Service selectors
   * @returns {string} Content text
   */
  extractContent(element, selectors) {
    const contentSelectors = [
      selectors.content,
      '.snippet',
      '.preview',
      '.email-preview',
      '[data-test-id="message-snippet"]'
    ];

    for (const selector of contentSelectors) {
      const contentElement = element.querySelector(selector);
      if (contentElement) {
        const text = contentElement.textContent?.trim();
        if (text) return text;
      }
    }

    return '';
  }

  /**
   * Extract timestamp from email element
   * @param {Element} element - Email DOM element
   * @param {Object} selectors - Service selectors
   * @returns {string} Timestamp string
   */
  extractTimestamp(element, selectors) {
    const timeSelectors = [
      '[data-test-id="message-time"]',
      '.time',
      '.timestamp',
      '[title*=":"]'
    ];

    for (const selector of timeSelectors) {
      const timeElement = element.querySelector(selector);
      if (timeElement) {
        const text = timeElement.textContent?.trim() || timeElement.title?.trim();
        if (text) return text;
      }
    }

    return '';
  }

  /**
   * Check if email is marked as read
   * @param {Element} element - Email DOM element
   * @param {Object} selectors - Service selectors
   * @returns {boolean} True if email is read
   */
  isEmailRead(element, selectors) {
    // Check for common read/unread indicators
    const readIndicators = [
      '.unread',
      '[data-test-id="unread"]',
      '.email-unread'
    ];

    return !readIndicators.some(indicator => 
      element.querySelector(indicator) || element.classList.contains(indicator.replace('.', ''))
    );
  }

  /**
   * Generate unique ID for email element
   * @param {Element} element - Email DOM element
   * @returns {string} Unique ID
   */
  generateEmailId(element) {
    // Try to use existing ID or generate one
    if (element.id) return element.id;
    
    // Use data attributes if available
    const dataId = element.getAttribute('data-thread-perm-id') || 
                   element.getAttribute('data-test-id') ||
                   element.getAttribute('data-message-id');
    
    if (dataId) return dataId;
    
    // Generate hash from element content
    const content = element.textContent || '';
    return btoa(content.substring(0, 50)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Start observing DOM changes for dynamic email loading
   */
  startObserving() {
    if (this.observer) {
      this.observer.disconnect();
    }

    let retryCount = 0;
    const maxRetries = 3;
    const tryExtract = () => {
      const emails = this.extractEmails();
      if (emails.length === 0 && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryExtract, 1000);
      } else {
        this.onEmailsUpdated();
      }
    };

    // Always trigger a re-extraction after a short delay on start
    setTimeout(tryExtract, 500);

    this.observer = new MutationObserver((mutations) => {
      let shouldReExtract = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new email elements were added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const selectors = this.detector.getSelectors();
              if (node.matches?.(selectors.emailItems) || 
                  node.querySelector?.(selectors.emailItems)) {
                shouldReExtract = true;
              }
            }
          });
        }
      });

      if (shouldReExtract) {
        // Trigger re-extraction after a short delay
        setTimeout(() => {
          this.onEmailsUpdated();
        }, 500);
      }
    });

    const selectors = this.detector.getSelectors();
    if (selectors.inbox) {
      const inboxElement = document.querySelector(selectors.inbox);
      if (inboxElement) {
        this.observer.observe(inboxElement, {
          childList: true,
          subtree: true
        });
      }
    }
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Callback for when emails are updated
   * Override this in the main content script
   */
  onEmailsUpdated() {
    // This will be overridden by the main content script
    console.log('Emails updated - re-extraction needed');
  }
}

// Export for use in other modules
window.EmailExtractor = EmailExtractor; 