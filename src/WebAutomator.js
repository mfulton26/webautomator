const WebContext = require('./WebContext');
const EventEmitter = require('events');

/**
 * Entry point into the Web Automator API.
 * @extends WebContext
 */
class WebAutomator extends WebContext {
  /**
   * @param {IWebDriver} webDriver The underlying Selenium WebDriver instance.
   * @param {number} timeout The default implicit timeout in milliseconds.
   * @param {EventEmitter} eventEmitter An event emitter for registering pre-action code, etc.
   */
  constructor(webDriver, timeout = 10000, eventEmitter = new EventEmitter()) {
    super(webDriver, timeout, eventEmitter);
  }
}

module.exports = WebAutomator;