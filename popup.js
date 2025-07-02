/**
 * MailSift AI Popup Script
 * Handles the popup interface for settings and keyword management
 */

class PopupManager {
  constructor() {
    this.keywords = [];
    this.settings = {
      highlightMode: true,
      summarizationEnabled: true,
      widgetEnabled: true
    };
    
    this.init();
  }

  /**
   * Initialize popup
   */
  async init() {
    try {
      // Load saved data
      await this.loadData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Update UI
      this.updateUI();
      
    } catch (error) {
      console.error('Popup initialization failed:', error);
    }
  }

  /**
   * Load saved keywords and settings
   */
  async loadData() {
    try {
      const result = await chrome.storage.sync.get(['keywords', 'settings', 'consentGiven', 'openaiApiKey']);
      
      this.keywords = result.keywords || [];
      this.settings = { ...this.settings, ...result.settings };
      
      // Update consent status
      this.updateConsentStatus(result.consentGiven);
      
      // Update API key status
      this.updateApiKeyStatus(result.openaiApiKey);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Keyword management
    document.getElementById('addKeywordBtn').addEventListener('click', () => this.addKeyword());
    document.getElementById('keywordInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addKeyword();
    });

    // Settings toggles
    document.getElementById('highlightToggle').addEventListener('change', (e) => {
      this.updateSetting('highlightMode', e.target.checked);
    });

    document.getElementById('summarizeToggle').addEventListener('change', (e) => {
      this.updateSetting('summarizationEnabled', e.target.checked);
    });

    document.getElementById('widgetToggle').addEventListener('change', (e) => {
      this.updateSetting('widgetEnabled', e.target.checked);
    });

    // API key management
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => this.saveApiKey());
    document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveApiKey();
    });

    // Action buttons
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
    document.getElementById('resetBtn').addEventListener('click', () => this.showResetConfirmation());
    document.getElementById('updateConsentBtn').addEventListener('click', () => this.updateConsent());

    // Modal
    document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
    document.getElementById('confirmNo').addEventListener('click', () => this.hideModal());
  }

  /**
   * Update the UI with current data
   */
  async updateUI() {
    // Update keywords list
    this.updateKeywordsList();
    
    // Update settings toggles
    document.getElementById('highlightToggle').checked = this.settings.highlightMode;
    document.getElementById('summarizeToggle').checked = this.settings.summarizationEnabled;
    document.getElementById('widgetToggle').checked = this.settings.widgetEnabled;
  }

  /**
   * Update keywords list display
   */
  updateKeywordsList() {
    const keywordsList = document.getElementById('keywordsList');
    
    if (this.keywords.length === 0) {
      keywordsList.innerHTML = '<p class="no-keywords">No keywords added yet. Add some keywords to start prioritizing emails.</p>';
      return;
    }

    const keywordsHtml = this.keywords.map((keyword, index) => `
      <div class="keyword-item" data-index="${index}">
        <span class="keyword-text">${this.escapeHtml(keyword)}</span>
        <button class="keyword-remove" title="Remove keyword">×</button>
      </div>
    `).join('');

    keywordsList.innerHTML = keywordsHtml;

    // Add event listeners for remove buttons
    document.querySelectorAll('.keyword-remove').forEach((btn, idx) => {
      btn.addEventListener('click', () => this.removeKeyword(idx));
    });
  }

  /**
   * Add a new keyword
   */
  async addKeyword() {
    const input = document.getElementById('keywordInput');
    const keyword = input.value.trim();
    
    if (!keyword) {
      this.showError('Please enter a keyword');
      return;
    }

    if (this.keywords.includes(keyword)) {
      this.showError('Keyword already exists');
      return;
    }

    if (keyword.length > 50) {
      this.showError('Keyword is too long (max 50 characters)');
      return;
    }

    // Add keyword
    this.keywords.push(keyword);
    await this.saveKeywords();
    
    // Clear input and update UI
    input.value = '';
    this.updateKeywordsList();
    
    // Notify content script
    await this.notifyContentScript('updateKeywords', this.keywords);
    
    this.showSuccess('Keyword added successfully');
  }

  /**
   * Remove a keyword
   */
  async removeKeyword(index) {
    this.keywords.splice(index, 1);
    await this.saveKeywords();
    this.updateKeywordsList();
    
    // Notify content script
    await this.notifyContentScript('updateKeywords', this.keywords);
    
    this.showSuccess('Keyword removed');
  }

  /**
   * Update a setting
   */
  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
    
    // Notify content script
    await this.notifyContentScript('updateSettings', this.settings);
    
    this.showSuccess('Setting updated');
  }

  /**
   * Save keywords to storage
   */
  async saveKeywords() {
    try {
      await chrome.storage.sync.set({ keywords: this.keywords });
    } catch (error) {
      console.error('Failed to save keywords:', error);
      this.showError('Failed to save keywords');
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      await chrome.storage.sync.set({ settings: this.settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showError('Failed to save settings');
    }
  }

  /**
   * Update consent status
   */
  updateConsentStatus(consentGiven) {
    const statusElement = document.getElementById('consentStatus');
    const updateBtn = document.getElementById('updateConsentBtn');
    
    if (consentGiven) {
      statusElement.textContent = 'Consent Given';
      statusElement.className = 'status-badge status-success';
      updateBtn.style.display = 'inline-block';
    } else {
      statusElement.textContent = 'No Consent';
      statusElement.className = 'status-badge status-warning';
      updateBtn.style.display = 'inline-block';
    }
  }

  /**
   * Update API key status display
   */
  updateApiKeyStatus(apiKey) {
    const statusElement = document.getElementById('apiKeyStatus');
    const inputElement = document.getElementById('apiKeyInput');
    
    if (apiKey && apiKey !== 'sk-your-openai-api-key-here' && apiKey.startsWith('sk-')) {
      statusElement.textContent = '✅ Configured';
      statusElement.className = 'status-badge status-success';
      inputElement.value = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
    } else {
      statusElement.textContent = '❌ Not configured';
      statusElement.className = 'status-badge status-warning';
      inputElement.value = '';
    }
  }

  /**
   * Save API key
   */
  async saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      this.showError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      this.showError('Invalid API key format. Should start with "sk-"');
      return;
    }

    try {
      await chrome.storage.sync.set({ openaiApiKey: apiKey });
      this.updateApiKeyStatus(apiKey);
      
      // Notify content script to update API key
      await this.notifyContentScript('updateApiKey', apiKey);
      
      this.showSuccess('API key saved successfully');
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.showError('Failed to save API key');
    }
  }

  /**
   * Update consent
   */
  async updateConsent() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, { action: 'showConsentDialog' });
        window.close();
      }
    } catch (error) {
      console.error('Failed to show consent dialog:', error);
      this.showError('Please refresh the email page to update consent');
    }
  }

  /**
   * Refresh extension
   */
  async refresh() {
    try {
      await this.notifyContentScript('refresh');
      this.showSuccess('Extension refreshed');
    } catch (error) {
      console.error('Failed to refresh:', error);
      this.showError('Failed to refresh');
    }
  }

  /**
   * Show reset confirmation
   */
  showResetConfirmation() {
    this.showModal(
      'Reset Settings',
      'Are you sure you want to reset all settings and keywords? This action cannot be undone.',
      'reset'
    );
  }

  /**
   * Confirm action (for modal)
   */
  async confirmAction() {
    const action = this.currentAction;
    this.hideModal();

    if (action === 'reset') {
      await this.resetSettings();
    }
  }

  /**
   * Reset all settings
   */
  async resetSettings() {
    try {
      this.keywords = [];
      this.settings = {
        highlightMode: true,
        summarizationEnabled: true,
        widgetEnabled: true
      };

      await chrome.storage.sync.clear();
      await this.saveKeywords();
      await this.saveSettings();

      this.updateUI();
      await this.notifyContentScript('updateKeywords', this.keywords);
      await this.notifyContentScript('updateSettings', this.settings);

      this.showSuccess('Settings reset successfully');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showError('Failed to reset settings');
    }
  }

  /**
   * Notify content script
   */
  async notifyContentScript(action, data = null) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, { action, data });
      }
    } catch (error) {
      console.error('Failed to notify content script:', error);
    }
  }

  /**
   * Show modal
   */
  showModal(title, message, action) {
    this.currentAction = action;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';
  }

  /**
   * Hide modal
   */
  hideModal() {
    document.getElementById('confirmModal').style.display = 'none';
    this.currentAction = null;
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStatus' && window.popupManager) {
    window.popupManager.updateStatusUI(message.data);
  }
}); 