/**
 * Email Service Detector
 * Detects which email service is being used based on URL and DOM analysis
 */

class EmailDetector {
  constructor() {
    this.currentService = null;
    this.serviceConfigs = {
      gmail: {
        name: 'Gmail',
        urlPatterns: ['mail.google.com'],
        selectors: {
          inbox: '[role="main"]',
          emailItems: 'tr.zA',
          subject: 'span.bog, h2.hP',
          sender: 'span.yX.xY',
          content: '.y2'
        }
      },
      outlook: {
        name: 'Outlook',
        urlPatterns: ['outlook.live.com', 'outlook.office.com'],
        selectors: {
          inbox: '[role="main"]',
          emailItems: '[role="row"]',
          subject: '[title]',
          sender: '[title]',
          content: '[role="main"]'
        }
      },
      yahoo: {
        name: 'Yahoo Mail',
        urlPatterns: ['mail.yahoo.com'],
        selectors: {
          inbox: '.mail-app',
          emailItems: '[data-test-id="message-list-item"]',
          subject: '[data-test-id="message-subject"]',
          sender: '[data-test-id="message-sender"]',
          content: '.message-body'
        }
      }
    };
  }

  /**
   * Detect the current email service
   * @returns {Object|null} Service configuration or null if not detected
   */
  detectService() {
    const currentUrl = window.location.href;
    
    for (const [serviceKey, config] of Object.entries(this.serviceConfigs)) {
      if (config.urlPatterns.some(pattern => currentUrl.includes(pattern))) {
        this.currentService = serviceKey;
        return config;
      }
    }
    
    return null;
  }

  /**
   * Get the current service configuration
   * @returns {Object|null}
   */
  getCurrentService() {
    if (!this.currentService) {
      return this.detectService();
    }
    return this.serviceConfigs[this.currentService] || null;
  }

  /**
   * Check if we're on an inbox page
   * @returns {boolean}
   */
  isInboxPage() {
    const service = this.getCurrentService();
    if (!service) return false;

    const url = window.location.href;
    
    switch (this.currentService) {
      case 'gmail':
        return url.includes('/mail/u/') && !url.includes('/compose/');
      case 'outlook':
        return url.includes('/mail/') && !url.includes('/compose/');
      case 'yahoo':
        return (url.includes('/inbox') || url.includes('/n/inbox')) && !url.includes('/compose/');
      default:
        return false;
    }
  }

  /**
   * Get service-specific selectors
   * @returns {Object|null}
   */
  getSelectors() {
    const service = this.getCurrentService();
    return service ? service.selectors : null;
  }
}

// Export for use in other modules
window.EmailDetector = EmailDetector; 