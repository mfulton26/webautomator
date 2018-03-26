const {getContent} = require('./remote/content');
const WebGetter = require('./WebGetter');
const WebSetter = require('./WebSetter');

/**
 * Tracks expected context to find and interact with elements on a page.
 */
class WebContext {
  /**
   * @param {IWebDriver} webDriver The underlying Selenium WebDriver instance.
   * @param {number} timeout The default implicit timeout in milliseconds.
   * @param {Array<String|RegExp>} precedings The preceding text in the form of strings and regular expressions.
   */
  constructor(webDriver, timeout = 10000, precedings = []) {
    this.webDriver = webDriver;
    this.timeout = timeout;
    this.precedings = precedings;
  }

  async _getContent() {
    return await this.webDriver.executeScript(getContent);
  }

  async _getContentWithIndexOfContext(precedings, timeout) {
    let caught = undefined;
    const condition = async () => {
      try {
        const content = await this._getContent();
        return precedings.reduce(({index: fromIndex}, preceding) => {
          const remainingContent = content.slice(fromIndex + 1);
          const predicate = (item, index) => {
            const matcher = preceding instanceof RegExp ? String.prototype.match : String.prototype.includes;
            if (item.text != null && matcher.call(item.text.replace(/\u00a0/, " "), preceding)) {
              return true;
            }
            const nextItem = content[index + 1];
            if (nextItem) {
              if (nextItem.placeholder != null && matcher.call(nextItem.placeholder, preceding)) {
                return true;
              } else if (nextItem.title != null && matcher.call(nextItem.title, preceding)) {
                return true;
              } else if (nextItem.value != null && matcher.call(nextItem.value, preceding)) {
                return true;
              }
            }
          };
          const precedingOffset = remainingContent.findIndex(predicate);
          if (precedingOffset === -1) {
            throw `Not found on page: ${preceding}`;
          }
          const index = fromIndex + 1 + precedingOffset;
          const item = content[index];
          const substringIndex = item.type === "string" ? item.substrings.findIndex(predicate) : -1;
          return {content, item, index, substringIndex};
        }, {index: -1});
      } catch (e) {
        if (typeof e === "string") {
          caught = e;
          return false;
        } else {
          throw e;
        }
      }
    };
    const message = caught || `Could not find on page: ${precedings.join(", ")}`;
    return await this.webDriver.wait(condition, timeout, message);
  }

  /**
   * Wraps a block of Web Automator code with a new context pointing to elements that are preceded by some text.
   * @param {string} text - The preceding text.
   * @param {Function} callback - The block of code to wrap, receives a WebContext instance to use for the new context.
   * @returns {Promise<WebContext>}
   */
  async after(text, callback = Function.prototype) {
    const webContext = new WebContext(this.webDriver, this.timeout, this.precedings.concat(text));
    await callback(webContext);
    return webContext;
  }

  async getString(key, timeout = this.timeout) {
    let {content, index, substringIndex} = await this._getContentWithIndexOfContext([...this.precedings, key], timeout);
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
    let {content, index} = await this._getContentWithIndexOfContext([...this.precedings, key], timeout);
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
    if (subClickable) {
      await subClickable.parentElement.click();
    } else {
      const element = clickable.element || clickable.parentElement;
      await element.click();
    }
  }

  async match(regExp, timeout = this.timeout) {
    const {content, index} = await this._getContentWithIndexOfContext([...this.precedings, regExp], timeout);
    const item = content[index];
    return item.text.match(regExp);
  }
}

module.exports = WebContext;