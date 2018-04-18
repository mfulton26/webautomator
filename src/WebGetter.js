const WebAccessor = require('./WebAccessor');

/**
 * Fluent API for getting something identified by a key (e.g. label text).
 * @extends WebAccessor
 */
class WebGetter extends WebAccessor {
  async value() {
    const {value} = await this.values("value");
    return value;
  }

  /**
   * Gets one or more items from the page and assigns them names in the order specified.
   * @param {...String} names - The property names to be used for the items returned.
   * @returns {Promise<{}>} An object containing properties with the specified names along with their values.
   */
  async values(...names) {
    let {content, index} = await this.webContext._getContentWithIndexOfContext([...this.webContext.precedings, this.key], this._timeout);
    const result = {};
    for (const name of names) {
      let gettable = content[++index];
      switch (gettable.tagName) {
        case "SELECT":
          const firstSelectedOption = gettable.options.find(option => option.isSelected);
          result[name] = firstSelectedOption ? firstSelectedOption.text : undefined;
          break;
        case "INPUT":
          switch (gettable.type) {
            case "radio":
              while (true) {
                const label = content[index + 1];
                if (label && label.checked) {
                  result[name] = label.text;
                  break;
                } else {
                  gettable = content[index += 2];
                  if (gettable.tagName !== "INPUT" || gettable.type !== "radio") {
                    result[name] = undefined;
                    break;
                  }
                }
              }
              break;
            default:
              result[name] = gettable.value;
              break;
          }
          break;
        default:
          result[name] = gettable.text;
          break;
      }
    }
    return result;
  }

  /**
   * Gets the available options (applies to *select* elements and grouped {@code<input type="radio">} elements.
   * @returns {Promise<Array>} The displayed text for the available options.
   */
  async options() {
    let {content, index} = await this.webContext._getContentWithIndexOfContext([...this.webContext.precedings, this.key], this._timeout);
    let gettable;
    do {
      gettable = content[++index];
    } while (gettable && gettable.tagName === "IMG");
    switch (gettable.tagName) {
      case "SELECT":
        return gettable.options.map(option => option.text);
      case "INPUT":
        switch (gettable.type) {
          case "radio": {
            const options = [];
            while (true) {
              const label = content[++index];
              if (label && label.text) {
                options.push(label.text);
              }
              do {
                gettable = content[++index];
              } while (gettable && gettable.tagName === "IMG");
              if (gettable.tagName !== "INPUT" || gettable.type !== "radio") {
                return options;
              }
            }
          }
          default:
            throw `options() not support for ${gettable.type} input type`;
        }
      default:
        throw `options() not supported for ${gettable.tagName} element`;
    }
  }
}

module.exports = WebGetter;