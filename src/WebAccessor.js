/**
 * Fluent API for accessing something identified by a key (e.g. label text).
 */
class WebAccessor {
  constructor(webContext, key, timeout) {
    this.webContext = webContext;
    this.key = key;
    this._timeout = timeout;
  }

  /**
   * Changes the timeout for this get chain.
   * @param ms - Timeout in milliseconds.
   */
  timeout(ms) {
    this._timeout = ms;
    return this;
  }
}

module.exports = WebAccessor;