const WebContext = require('./WebContext');

/**
 * Entry point into the Web Automator API.
 * @extends WebContext
 */
class WebAutomator extends WebContext {
  /**
   * @param {IWebDriver} webDriver The underlying Selenium WebDriver instance.
   * @param {number} timeout The default implicit timeout in milliseconds.
   */
  constructor(webDriver, timeout = 10000) {
    super(webDriver, timeout);
  }
}

module.exports = WebAutomator;