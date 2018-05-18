const {JSDOM} = require('jsdom');

function toWindowElement(content) {
  const {window: {document}} = new JSDOM("<window></window>", {contentType: "application/xml"});
  const windowElement = document.documentElement;
  for (const item of content) {
    switch (item.type) {
      case "string": {
        windowElement.appendChild(document.createTextNode(item.text));
        break;
      }
      default:
        switch (item.tagName) {
          case "IMG": {
            const e = document.createElement("img");
            e.setAttribute("src", item.src);
            windowElement.appendChild(e);
            break;
          }
          case "INPUT": {
            switch (item.type) {
              case "checkbox":
              case "radio": {
                const e = document.createElement(item.type);
                if (item.checked) {
                  e.setAttribute("checked", true);
                }
                windowElement.appendChild(e);
                break;
              }
              default: {
                const e = document.createElement("textbox");
                if (item.placeholder) {
                  e.setAttribute("placeholder", item.placeholder);
                }
                e.setAttribute("value", item.value);
                windowElement.appendChild(e);
                break;
              }
            }
            break;
          }
          case "SELECT": {
            const e = document.createElement("combobox");
            for (const option of item.options) {
              const o = document.createElement("option");
              if (option.isSelected) {
                o.setAttribute("selected", true);
              }
              o.textContent = option.text;
              e.appendChild(o);
            }
            windowElement.appendChild(e);
            break;
          }
          case "TEXTAREA": {
            const e = document.createElement("textbox");
            e.setAttribute("multiline", true);
            if (item.placeholder) {
              e.setAttribute("placeholder", item.placeholder);
            }
            e.textContent = item.value;
            windowElement.appendChild(e);
            break;
          }
          default: {
            const e = document.createElement("unknown");
            windowElement.appendChild(e);
            break;
          }
        }
    }
  }
  return windowElement;
}

module.exports = {
  toWindowElement,
};