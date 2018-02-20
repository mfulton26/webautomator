class WebContext {
  /**
   * @param webDriver {IWebDriver}
   * @param timeout {number}
   * @param precedings {Array<String|RegExp>}
   */
  constructor(webDriver, timeout = 10000, precedings = []) {
    this.webDriver = webDriver;
    this.timeout = timeout;
    this.precedings = precedings;
  }

  async _getContent() {
    return await this.webDriver.executeScript(function getContent() {
      function isDisplayed(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "INPUT" && node.type === "hidden" || node.tagName === "NOSCRIPT") {
            return false;
          }
          var computedStyle = window.getComputedStyle(node);
          if (computedStyle.display === "none" || computedStyle.visibility !== "visible") {
            return false;
          }
        }
        return true;
      }

      function reduceWhitespace(string) {
        return string.replace(/[^\S\u00a0]+/g, " ");
      }

      function textTransform(string, parentElement) {
        var computedStyle = window.getComputedStyle(parentElement);
        switch (computedStyle["text-transform"]) {
          case "capitalize":
            return string.replace(/\b\w/g, function (match) {
              return match.toUpperCase();
            });
          case "uppercase":
            return string.replace(/\w/g, function (match) {
              return match.toUpperCase();
            });
          case "lowercase":
            return string.replace(/\w/g, function (match) {
              return match.toLowerCase();
            });
          default:
            return string;
        }
      }

      function createBlockIterator(customWidgetMatchers) {
        function lastDescendant(treeWalker) {
          while (treeWalker.lastChild()) {
          }
        }

        var treeWalker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, function (node) {
          return isDisplayed(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }, false);
        var blockContainer = undefined;
        var rawBlockIterator = {
          nextRawBlock: function () {
            var block = [];
            var node;
            while (node = treeWalker.nextNode()) {
              switch (node.nodeType) {
                case Node.ELEMENT_NODE:
                  var computedStyle = window.getComputedStyle(node);
                  if (computedStyle.marginLeft !== "0px") {
                    var lastBlockItem = block[block.length - 1];
                    if (lastBlockItem && lastBlockItem.type === "string") {
                      block.push({
                        type: "string",
                        parentElement: node.parentNode,
                        text: "",
                        substrings: []
                      });
                    }
                  }
                  switch (computedStyle.display) {
                    case "block":
                    case "table-cell":
                      blockContainer = node;
                      if (block.length) {
                        treeWalker.previousNode();
                        return block;
                      }
                      break;
                    default:
                      if (node.tagName === "BR") {
                        if (block.length) {
                          return block;
                        }
                      } else if (blockContainer && !(blockContainer.contains(node))) {
                        blockContainer = undefined;
                        if (block.length) {
                          treeWalker.previousNode();
                          return block;
                        }
                      }
                      break;
                  }
                  switch (node.tagName) {
                    case "INPUT":
                    case "SELECT":
                    case "TEXTAREA":
                    case "IMG":
                      block.push(node);
                      lastDescendant(treeWalker);
                      break;
                    default:
                      if (customWidgetMatchers.some(function (matcher) {
                          return matcher(node);
                        })) {
                        block.push(node);
                        lastDescendant(treeWalker);
                      }
                  }
                  break;
                case Node.TEXT_NODE:
                  var data = reduceWhitespace(node.textContent);
                  data = textTransform(data, node.parentElement);
                  var lastBlockItem = block[block.length - 1];
                  if (lastBlockItem && lastBlockItem.type === "string") {
                    lastBlockItem.text += data;
                    if (data.trim()) {
                      lastBlockItem.substrings.push({
                        parentElement: node.parentNode,
                        text: data
                      });
                    }
                  } else {
                    block.push({
                      type: "string",
                      parentElement: node.parentNode,
                      text: data,
                      substrings: []
                    });
                  }
                  break;
              }
            }
            if (block.length) {
              return block;
            }
          }
        };
        return {
          nextBlock: function () {
            var block;
            while (block = rawBlockIterator.nextRawBlock()) {
              block.forEach(function (blockItem) {
                if (blockItem.type === "string") {
                  blockItem.text = blockItem.text.trim();
                }
              });
              block = block.filter(function (blockItem) {
                return blockItem.text !== "";
              });
              if (block.length) {
                return block;
              }
            }
          }
        }
      }

      function createBlockItemIterator(customWidgetMatchers) {
        var blockIterator = createBlockIterator(customWidgetMatchers);
        var block = blockIterator.nextBlock();
        var i = 0;
        return {
          nextBlockItem: function () {
            if (block && i === block.length) {
              block = blockIterator.nextBlock();
              i = 0;
            }
            if (block) {
              return block[i++];
            }
          }
        }
      }

      var result = [];

      var customWidgetAdapters = [];

      var blockItemIterator = createBlockItemIterator(customWidgetAdapters.map(function (serializer) {
        return serializer.match;
      }));

      let blockItem;
      while (blockItem = blockItemIterator.nextBlockItem()) {
        if (blockItem.type === "string") {
          result.push(blockItem);
        } else {
          var data = {
            element: blockItem,
            tagName: blockItem.tagName,
            className: blockItem.className
          };
          if (blockItem.title) {
            data.title = blockItem.title;
          }
          switch (blockItem.tagName) {
            case "IMG":
              data.src = blockItem.src;
              break;
            case "INPUT":
              data.type = blockItem.type;
              data.checked = blockItem.checked;
              data.placeholder = blockItem.placeholder;
              switch (blockItem.type) {
                case "submit":
                  data.text = data.value = blockItem.value || "Submit";
                  break;
                case "reset":
                  data.text = data.value = blockItem.value || "Reset";
                  break;
                case "button":
                  data.text = data.value = blockItem.value;
                  break;
              }
              break;
            case "SELECT":
              data.options = [];
              for (var i = 0; i < blockItem.options.length; i++) {
                var option = blockItem.options.item(i);
                var computedStyle = window.getComputedStyle(option);
                if (computedStyle.display === "none" || computedStyle.visibility !== "visible") {
                  continue;
                }
                data.options.push({
                  element: option,
                  isSelected: option.selected,
                  text: option.innerText
                });
              }
              break;
            default:
              customWidgetAdapters.forEach(function (adapter) {
                if (adapter.match(blockItem)) {
                  adapter.serialize(blockItem, data);
                }
              });
          }
          result.push(data);
        }
      }

      return result;
    });
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
   * @param text {string}
   * @param callback {Function<WebContext>}
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

  set(key) {
    return new Setter(this, key, this.timeout);
  }

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

class Setter {
  constructor(webContext, key, timeout) {
    this.webContext = webContext;
    this.key = key;
    this.timeout = timeout;
  }

  timeout(ms) {
    this.timeout = ms;
    return this;
  }

  async to(value) {
    const values = Array.isArray(value) ? value : [value];
    let caught = undefined;
    const condition = async () => {
      try {
        let {content, index} = await this.webContext._getContentWithIndexOfContext([...this.webContext.precedings, this.key], this.timeout);
        for (const value of values) {
          const settableOffset = content.slice(index + 1).findIndex(item => WebContentItems.isSettable(item));
          if (settableOffset === -1) {
            throw "No more settables!";
          }
          index += settableOffset + 1;
          let settable = content[index];
          switch (settable.tagName) {
            case "SELECT":
              let option = settable.options.find(option => option.text === value);
              if (!option) {
                throw `No option with text found: ${value}`;
              }
              if (option.isSelected) {
                break;
              } else {
                await option.element.click();
              }
              break;
            case "INPUT":
              switch (settable.type) {
                case "radio":
                  while (true) {
                    const label = content[index + 1];
                    if (label && label.text === value) {
                      await label.parentElement.click();
                      break;
                    } else {
                      settable = content[index += 2];
                      if (settable.type !== "radio") {
                        throw `No radio button with label found: ${value}`;
                      }
                    }
                  }
                  break;
                default:
                  await settable.element.sendKeys(value);
                  break;
              }
              break;
            default:
              await settable.element.sendKeys(value);
              break;
          }
        }
        return true;
      } catch (e) {
        if (typeof e === "string") {
          caught = e;
          return false;
        } else {
          throw e;
        }
      }
    };
    const message = caught || `Could not set "${this.key}" to ${values}`;
    await this.webContext.webDriver.wait(condition, this.timeout, message);
  }
}

const WebContentItems = {
  isSettable(item) {
    switch (item.tagName) {
      case "INPUT":
      case "SELECT":
      case "TEXTAREA":
        return true;
      default:
        return false;
    }
  }
};

class WebAutomator extends WebContext {
  /**
   * @param webDriver {IWebDriver}
   * @param timeout {number}
   */
  constructor(webDriver, timeout = 10000) {
    super(webDriver, timeout);
  }
}

exports.WebAutomator = WebAutomator;