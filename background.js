/**
 * MailSift AI - Background Service Worker
 * Handles extension lifecycle and optional proxy logic for secure API calls
 */

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('MailSift AI: Extension installed/updated', details);
  
  if (details.reason === 'install') {
    // First time installation
    initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    handleUpdate(details.previousVersion);
  }
});

/**
 * Initialize extension on first install
 */
async function initializeExtension() {
  try {
    // Set default settings
    const defaultSettings = {
      keywords: ['urgent', 'important', 'meeting', 'deadline'],
      settings: {
        highlightMode: true,
        summarizationEnabled: true,
        widgetEnabled: true
      },
      consentGiven: false,
      installDate: new Date().toISOString()
    };

    await chrome.storage.sync.set(defaultSettings);
    
    // Open welcome page or show notification
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
    
    console.log('MailSift AI: Extension initialized with default settings');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

/**
 * Handle extension updates
 */
async function handleUpdate(previousVersion) {
  console.log(`MailSift AI: Updated from version ${previousVersion}`);
  
  // Check if we need to migrate settings
  if (previousVersion && previousVersion < '1.0.0') {
    await migrateSettings();
  }
}

/**
 * Migrate settings from older versions
 */
async function migrateSettings() {
  try {
    const result = await chrome.storage.sync.get(['keywords', 'settings']);
    
    // Ensure all required settings exist
    const migratedSettings = {
      keywords: result.keywords || ['urgent', 'important', 'meeting', 'deadline'],
      settings: {
        highlightMode: true,
        summarizationEnabled: true,
        widgetEnabled: true,
        ...result.settings
      }
    };
    
    await chrome.storage.sync.set(migratedSettings);
    console.log('MailSift AI: Settings migrated successfully');
  } catch (error) {
    console.error('Failed to migrate settings:', error);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('MailSift AI: Received message', message);
  
  switch (message.action) {
    case 'openPopup':
      handleOpenPopup();
      break;
      
    case 'getStatus':
      handleGetStatus(sender.tab.id).then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'proxyRequest':
      handleProxyRequest(message.data).then(sendResponse);
      return true;
      
    case 'updateConsent':
      handleUpdateConsent(message.data).then(sendResponse);
      return true;
      
    default:
      console.warn('MailSift AI: Unknown message action', message.action);
  }
});

/**
 * Handle opening popup programmatically
 */
function handleOpenPopup() {
  // This could be used to programmatically open the popup
  // For now, we'll just log it
  console.log('MailSift AI: Popup open request received');
}

/**
 * Get extension status for a tab
 */
async function handleGetStatus(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
    return response || { error: 'No response from content script' };
  } catch (error) {
    console.error('Failed to get status:', error);
    return { error: 'Failed to communicate with content script' };
  }
}

/**
 * Handle proxy requests for secure API calls
 * TODO: Implement secure proxy endpoint
 */
async function handleProxyRequest(data) {
  try {
    // TODO: Implement secure proxy logic here
    // This would forward requests to your secure backend
    
    console.log('MailSift AI: Proxy request received', data);
    
    // For now, return a mock response
    return {
      success: false,
      error: 'Proxy endpoint not implemented yet',
      message: 'Please implement a secure proxy endpoint for production use'
    };
    
    /* Example proxy implementation:
    const response = await fetch('https://your-proxy-endpoint.com/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-proxy-api-key'
      },
      body: JSON.stringify({
        content: data.content,
        options: data.options
      })
    });
    
    const result = await response.json();
    return result;
    */
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle consent updates
 */
async function handleUpdateConsent(consentData) {
  try {
    await chrome.storage.sync.set({
      consentGiven: consentData.consentGiven,
      privacyConsent: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update consent:', error);
    return { success: false, error: error.message };
  }
}

// Handle tab updates to inject content scripts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a supported email service
    const supportedServices = [
      'mail.google.com',
      'outlook.live.com',
      'outlook.office.com',
      'mail.yahoo.com'
    ];
    
    const isSupported = supportedServices.some(service => tab.url.includes(service));
    
    if (isSupported) {
      console.log('MailSift AI: Detected email service, ensuring content script is loaded');
      
      // The content script should already be injected via manifest,
      // but we can add additional logic here if needed
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will only trigger if no popup is defined in manifest
  // Since we have a popup, this won't be called
  console.log('MailSift AI: Extension icon clicked');
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('MailSift AI: Storage changed', changes);
    
    // Notify content scripts of settings changes
    if (changes.keywords || changes.settings) {
      notifyContentScripts('settingsChanged', changes);
    }
  }
});

/**
 * Notify all content scripts of changes
 */
async function notifyContentScripts(action, data) {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://mail.google.com/*',
        'https://outlook.live.com/*',
        'https://outlook.office.com/*',
        'https://mail.yahoo.com/*'
      ]
    });
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action, data });
      } catch (error) {
        // Tab might not have content script loaded yet
        console.warn('Failed to notify tab:', error);
      }
    }
  } catch (error) {
    console.error('Failed to notify content scripts:', error);
  }
}

// Handle extension uninstall (cleanup)
chrome.runtime.setUninstallURL('https://your-website.com/uninstall-feedback');

// Periodic cleanup and maintenance
setInterval(async () => {
  try {
    // Clean up old data if needed
    const result = await chrome.storage.sync.get(['lastCleanup']);
    const now = Date.now();
    const lastCleanup = result.lastCleanup || 0;
    
    // Run cleanup once per day
    if (now - lastCleanup > 24 * 60 * 60 * 1000) {
      await performCleanup();
      await chrome.storage.sync.set({ lastCleanup: now });
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Check every hour

/**
 * Perform periodic cleanup
 */
async function performCleanup() {
  try {
    // Add any cleanup logic here
    // For example, clearing old cache data, etc.
    console.log('MailSift AI: Performing periodic cleanup');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

console.log('MailSift AI: Background service worker loaded');

/**
 * TODO: IMPLEMENT SECURE PROXY ENDPOINT
 * 
 * For production use, implement a secure proxy endpoint to handle OpenAI API calls.
 * This prevents API keys from being exposed in the frontend code.
 * 
 * Example implementation:
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
 */ 