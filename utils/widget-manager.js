/**
 * Widget Manager
 * Manages the floating widget that displays top emails and summaries
 */

class WidgetManager {
  constructor() {
    this.widget = null;
    this.isVisible = false;
    this.isMinimized = false;
    this.topEmails = [];
    this.summaries = {};
    this.expandedSummaries = {};
  }

  /**
   * Create and initialize the floating widget
   */
  createWidget() {
    if (this.widget) return;

    this.widget = document.createElement('div');
    this.widget.id = 'mailsift-widget';
    this.widget.className = 'mailsift-widget';
    
    this.widget.innerHTML = `
      <div class="mailsift-widget-header">
        <div class="mailsift-widget-title">
          <span>📧 MailSift AI</span>
          <span class="mailsift-widget-subtitle">Top Priority Emails</span>
        </div>
        <div class="mailsift-widget-controls">
          <button class="mailsift-widget-btn mailsift-minimize-btn" title="Minimize">−</button>
          <button class="mailsift-widget-btn mailsift-close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="mailsift-widget-content">
        <div class="mailsift-loading">Loading priority emails...</div>
      </div>
      <div class="mailsift-widget-footer">
        <button class="mailsift-widget-btn mailsift-settings-btn" title="Settings">⚙️</button>
        <button class="mailsift-widget-btn mailsift-refresh-btn" title="Refresh">🔄</button>
      </div>
    `;

    // Add event listeners
    this.addEventListeners();
    
    // Add to page
    document.body.appendChild(this.widget);
    
    // Make draggable
    this.makeDraggable();
  }

  /**
   * Add event listeners to widget controls
   */
  addEventListeners() {
    const minimizeBtn = this.widget.querySelector('.mailsift-minimize-btn');
    const closeBtn = this.widget.querySelector('.mailsift-close-btn');
    const settingsBtn = this.widget.querySelector('.mailsift-settings-btn');
    const refreshBtn = this.widget.querySelector('.mailsift-refresh-btn');

    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    closeBtn.addEventListener('click', () => this.hide());
    settingsBtn.addEventListener('click', () => this.openSettings());
    refreshBtn.addEventListener('click', () => this.refresh());
  }

  /**
   * Make the widget draggable
   */
  makeDraggable() {
    const header = this.widget.querySelector('.mailsift-widget-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mailsift-widget-controls')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(this.widget.style.left) || 20;
      startTop = parseInt(this.widget.style.top) || 20;
      
      this.widget.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.widget.style.left = (startLeft + deltaX) + 'px';
      this.widget.style.top = (startTop + deltaY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.widget.style.cursor = 'grab';
      }
    });
  }

  /**
   * Show the widget
   */
  show() {
    if (!this.widget) {
      this.createWidget();
    }
    this.widget.style.display = 'block'; // Force visible
    this.isVisible = true;
    console.log('WidgetManager: show() called, widget should be visible');
  }

  /**
   * Hide the widget
   */
  hide() {
    if (this.widget) {
      this.widget.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    if (!this.widget) return;
    
    this.isMinimized = !this.isMinimized;
    const content = this.widget.querySelector('.mailsift-widget-content');
    const footer = this.widget.querySelector('.mailsift-widget-footer');
    const minimizeBtn = this.widget.querySelector('.mailsift-minimize-btn');
    
    if (this.isMinimized) {
      content.style.display = 'none';
      footer.style.display = 'none';
      minimizeBtn.textContent = '+';
      minimizeBtn.title = 'Expand';
    } else {
      content.style.display = 'block';
      footer.style.display = 'flex';
      minimizeBtn.textContent = '−';
      minimizeBtn.title = 'Minimize';
    }
  }

  /**
   * Update widget with top emails
   * @param {Array} topEmails - Array of top priority emails
   */
  updateContent(topEmails) {
    // Save top email IDs for popup access
    if (chrome && chrome.storage && chrome.storage.sync) {
      const topIds = (topEmails || []).map(e => e.id);
      chrome.storage.sync.set({ mailsift_top_emails: topIds });
    }
    console.log('WidgetManager: updateContent called with:', topEmails);
    console.log('WidgetManager: topEmails length:', topEmails?.length || 0);
    
    this.topEmails = topEmails;
    const content = this.widget.querySelector('.mailsift-widget-content');
    
    if (!topEmails || topEmails.length === 0) {
      console.log('WidgetManager: No emails to display, showing empty state');
      content.innerHTML = `
        <div class="mailsift-no-emails">
          <p>No priority emails found</p>
          <p class="mailsift-hint">Add keywords in settings to prioritize emails</p>
        </div>
      `;
      return;
    }

    // Track expanded state per email
    if (!this.expandedSummaries) this.expandedSummaries = {};

    const emailsHtml = topEmails.map((email, index) => {
      const summary = this.summaries[email.id] || '';
      const hasSummary = summary.length > 0;
      const isExpanded = !!this.expandedSummaries[email.id];
      let summaryHtml = '';
      if (hasSummary) {
        const preview = summary.substring(0, 100);
        const rest = summary.substring(100);
        summaryHtml = `
          <div class="mailsift-email-summary">
            <div class="mailsift-summary-toggle${isExpanded ? ' expanded' : ''}" data-summary-toggle="true" data-email-id="${email.id}">
              <span class="mailsift-summary-preview" style="${isExpanded ? 'display:none;' : ''}">${this.truncateText(preview, 100)}${rest ? '...' : ''}</span>
              <span class="mailsift-summary-full" style="${isExpanded ? 'display:inline;' : 'display:none;'}">${this.escapeHtml(summary)}</span>
              <span class="mailsift-toggle-icon">${isExpanded ? '▲' : '▼'}</span>
              <span class="mailsift-toggle-text">${isExpanded ? 'Show less' : 'Show more'}</span>
            </div>
          </div>
        `;
      }
      return `
        <div class="mailsift-email-item" data-email-id="${email.id}">
          <div class="mailsift-email-header">
            <span class="mailsift-email-rank">#${index + 1}</span>
            <span class="mailsift-email-sender">${this.truncateText(email.sender, 25)}</span>
            <span class="mailsift-email-time">${this.formatTime(email.timestamp)}</span>
          </div>
          <div class="mailsift-email-subject">${this.truncateText(email.subject, 50)}</div>
          ${hasSummary ? summaryHtml : `<div class="mailsift-email-snippet">${this.truncateText(email.content, 60)}</div>`}
          <div class="mailsift-email-actions">
            <button class="mailsift-action-btn mailsift-goto-btn" data-email-id="${email.id}" title="Go to email">📍</button>
            ${!hasSummary ? `
              <button class="mailsift-action-btn mailsift-summarize-btn" data-email-id="${email.id}" title="Summarize">🤖</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = emailsHtml;
    console.log('WidgetManager: Widget content updated successfully');

    // Event delegation for summarize, go-to-email, and summary toggle
    content.addEventListener('click', (e) => {
      // Summarize button
      if (e.target.classList.contains('mailsift-summarize-btn')) {
        const emailId = e.target.getAttribute('data-email-id');
        if (window.mailSiftAI && emailId) {
          window.mailSiftAI.summarizeEmail(emailId);
        }
      }
      // Go to email button
      if (e.target.classList.contains('mailsift-goto-btn')) {
        const emailItem = e.target.closest('.mailsift-email-item');
        if (emailItem) {
          emailItem.scrollIntoView({behavior: 'smooth'});
        }
      }
      // Summary toggle
      const toggle = e.target.closest('[data-summary-toggle]');
      if (toggle) {
        const emailId = toggle.getAttribute('data-email-id');
        this.expandedSummaries[emailId] = !this.expandedSummaries[emailId];
        this.updateContent(this.topEmails);
      }
    });
  }

  /**
   * Update summary for a specific email
   * @param {string} emailId - Email ID
   * @param {string} summary - Summary text
   */
  updateSummary(emailId, summary) {
    this.summaries[emailId] = summary;
    // Save summary to chrome.storage for popup access
    if (chrome && chrome.storage && chrome.storage.sync) {
      const key = `mailsift_summary_${emailId}`;
      chrome.storage.sync.set({ [key]: summary });
    }
    // Re-render the widget to show the new summary
    this.updateContent(this.topEmails);
  }

  /**
   * Show loading state
   */
  showLoading() {
    const content = this.widget.querySelector('.mailsift-widget-content');
    content.innerHTML = '<div class="mailsift-loading">Analyzing emails...</div>';
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    const content = this.widget.querySelector('.mailsift-widget-content');
    content.innerHTML = `
      <div class="mailsift-error">
        <p>⚠️ ${message}</p>
        <button class="mailsift-retry-btn" onclick="window.mailSiftAI.refresh()">Retry</button>
      </div>
    `;
  }

  /**
   * Open settings popup
   */
  openSettings() {
    // Trigger the extension popup
    chrome.runtime.sendMessage({ action: 'openPopup' });
  }

  /**
   * Refresh widget content
   */
  refresh() {
    if (window.mailSiftAI) {
      window.mailSiftAI.refresh();
    }
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Format timestamp for display
   * @param {string} timestamp - Timestamp string
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get widget position
   * @returns {Object} Position object
   */
  getPosition() {
    if (!this.widget) return { left: 20, top: 20 };
    
    return {
      left: parseInt(this.widget.style.left) || 20,
      top: parseInt(this.widget.style.top) || 20
    };
  }

  /**
   * Set widget position
   * @param {number} left - Left position
   * @param {number} top - Top position
   */
  setPosition(left, top) {
    if (this.widget) {
      this.widget.style.left = left + 'px';
      this.widget.style.top = top + 'px';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
window.WidgetManager = WidgetManager; 