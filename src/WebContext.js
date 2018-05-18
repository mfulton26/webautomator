const {getContent} = require('./remote/content');
const WebGetter = require('./WebGetter');
const WebSetter = require('./WebSetter');
const {toWindowElement} = require('./utils');

/**
 * Tracks expected context to find and interact with elements on a page.
 */
class WebContext {
  /**
   * @param {IWebDriver} webDriver The underlying Selenium WebDriver instance.
   * @param {number} timeout The default implicit timeout in milliseconds.
   * @param {EventEmitter} eventEmitter The WebAutomator's event emitter.
   * @param {Array<String|RegExp>} precedings The preceding text in the form of strings and regular expressions.
   * @param {Array<String|RegExp>} followings The following text in the form of strings and regular expressions.
   */
  constructor(webDriver, timeout = 10000, eventEmitter, precedings = [], followings = []) {
    this.webDriver = webDriver;
    this.timeout = timeout;
    this.eventEmitter = eventEmitter;
    this.precedings = precedings;
    this.followings = followings;

    this.can = new WebCan(this);
  }

  async _getContent() {
    return await this.webDriver.executeScript(getContent);
  }

  /**
   * @returns {Promise<Element>} An a11y-like tree representing the content of the page. May be used in snapshot testing.
   */
  async getContent() {
    const content = await this._getContent();
    return toWindowElement(content);
  }

  async _findContentItem(key, timeout, precedings, followings /*todo*/) {
    let caught = undefined;
    const condition = async () => {
      try {
        const content = await this._getContent();
        const findings = [...precedings, key, ...followings].reduce((findings, something) => {
          const fromIndex = findings.length ? findings[findings.length - 1].index : -1;
          const remainingContent = content.slice(fromIndex + 1);
          const predicate = (item, index) => {
            const matcher = something instanceof RegExp ? String.prototype.match : String.prototype.includes;
            if (item.text != null && matcher.call(item.text.replace(/\u00a0/, " "), something)) {
              return true;
            }
            const nextItem = content[index + 1];
            if (nextItem) {
              if (nextItem.placeholder != null && matcher.call(nextItem.placeholder, something)) {
                return true;
              } else if (nextItem.title != null && matcher.call(nextItem.title, something)) {
                return true;
              } else if (nextItem.value != null && matcher.call(nextItem.value, something)) {
                return true;
              }
            }
          };
          const precedingOffset = remainingContent.findIndex(predicate);
          if (precedingOffset === -1) {
            throw `Not found on page: ${something}`;
          }
          const index = fromIndex + 1 + precedingOffset;
          const item = content[index];
          const substringIndex = item.type === "string" ? item.substrings.findIndex(predicate) : -1;
          return [...findings, {content, item, index, substringIndex}];
        }, []);
        return findings[precedings.length];
      } catch (e) {
        if (typeof e === "string") {
          caught = e;
          return false;
        } else {
          throw e;
        }
      }
    };

    function createDefaultMessage() {
      if (precedings.length) {
        if (followings.length) {
          return `Could not find ${key} between ${precedings.join(", ")} and ${followings.join(", ")}`;
        } else {
          return `Could not find ${key} after ${precedings.join(", ")}`;
        }
      } else {
        if (followings.length) {
          return `Could not find ${key} before ${followings.join(", ")}`;
        } else {
          return `Could not find ${key}`;
        }
      }
    }

    const message = caught || createDefaultMessage();
    return await this.webDriver.wait(condition, timeout, message);
  }

  /**
   * Wraps a block of webautomator code with a new context pointing to elements that are preceded by some text.
   * @param {string} text - The preceding text.
   * @param {Function} callback - The block of code to wrap, receives a WebContext instance to use for the new context.
   * @returns {WebContext|Promise<WebContext>}
   */
  after(text, callback) {
    const webContext = new WebContext(this.webDriver, this.timeout, this.eventEmitter, [...this.precedings, text], this.followings);
    if (callback) {
      return (async () => callback(webContext))();
    } else {
      return webContext;
    }
  }

  before(text, callback) {
    const webContext = new WebContext(this.webDriver, this.timeout, this.eventEmitter, this.precedings, [text, ...this.followings]);
    if (callback) {
      return (async () => callback(webContext))();
    } else {
      return webContext;
    }
  }

  between(...precedings) {
    return {
      and: (...args) => {
        const callback = typeof args[args.length - 1] === "function" ? args.splice(-1, 1) : undefined;
        const webContext = new WebContext(this.webDriver, this.timeout, this.eventEmitter, [...this.precedings, ...precedings], [...args, ...this.followings]);
        if (callback) {
          return (async () => callback(webContext))();
        } else {
          return webContext;
        }
      }
    };
  }

  async getString(key, timeout = this.timeout) {
    let {content, index, substringIndex} = await this._findContentItem(key, timeout, this.precedings, this.followings);
    if (substringIndex !== -1) {
      const item = content[index];
      if (substringIndex + 1 < item.substrings.length) {
        return item.substrings[substringIndex + 1].text;
      }
    }
    for (++index; index < content.length; index++) {
      const item = content[index];
      if (item.type === "string") {
        return item.text;
      }
    }
    return "";
  }

  async getValue(key, timeout = this.timeout) {
    let {content, index} = await this._findContentItem(key, timeout, this.precedings, this.followings);
    for (++index; index < content.length; index++) {
      const item = content[index];
      if (item.type !== "string") {
        return item.value;
      }
    }
  }

  /**
   * Begins a chain of calls to get something by a key.
   * @param {String} key - The key (e.g. text) identifying a gettable.
   * @returns {WebGetter}
   */
  get(key) {
    return new WebGetter(this, key, this.timeout);
  }

  /**
   * Begins a chain of calls to set something by a key.
   * @param {String} key - The key (e.g. text) identifying a settable.
   * @returns {WebSetter}
   */
  set(key) {
    return new WebSetter(this, key, this.timeout);
  }

  /**
   * Clicks something identified by a key.
   * @param {String} key - The key (e.g. text) identifying the clickable.
   * @returns {Promise<void>}
   */
  async click(key) {
    const content = await this._getContent();
    const index = [...this.precedings, key].reduce((index, text) => {
      const remainingContent = content.slice(index + 1);
      const textOffset = remainingContent.findIndex(item => item.text != null && item.text.includes(text));
      if (textOffset === -1) {
        throw `Text not found on page: ${text}`;
      }
      return index + 1 + textOffset;
    }, -1);
    const clickable = content[index];
    const subClickable = clickable.substrings && clickable.substrings.find(substring => substring.text.includes(key));
    this.eventEmitter.emit("action", {
      action: "click",
      content: toWindowElement(content)
    });
    if (subClickable) {
      await subClickable.parentElement.click();
    } else {
      const element = clickable.element || clickable.parentElement;
      await element.click();
    }
  }

  async match(regExp, timeout = this.timeout) {
    const {content, index} = await this._findContentItem(regExp, timeout, this.precedings, this.followings);
    const item = content[index];
    return item.text.match(regExp);
  }
}

class WebCan {
  constructor(webContext, affirmative = true) {
    this.webContext = webContext;
    this.affirmative = affirmative;
  }

  async spy(text) {
    const content = await this.webContext._getContent();
    const index = this.webContext.precedings.reduce((index, text) => {
      const remainingContent = content.slice(index + 1);
      const textOffset = remainingContent.findIndex(item => item.text != null && item.text.includes(text));
      if (textOffset === -1) {
        throw `Text not found on page: ${text}`;
      }
      return index + 1 + textOffset;
    }, -1);
    const remainingContent = content.slice(index + 1);
    const textOffset = remainingContent.findIndex(item => item.text != null && item.text.includes(text));
    const spied = textOffset !== -1;
    return spied === this.affirmative;
  }

  get not() {
    return new WebCan(this.webContext, !this.affirmative);
  }
}

module.exports = WebContext;