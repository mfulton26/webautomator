function getContentBundle() {
  function getContent() {
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
      return string.replace(/[^\S\u2009]+/g, " ");
    }

    function transformText(string, parentElement) {
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
        case "none":
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
                data = transformText(data, node.parentNode);
                var lastBlockItem = block[block.length - 1];
                if (lastBlockItem && lastBlockItem.type === "string") {
                  if (data) {
                    lastBlockItem.substrings.push({
                      parentElement: node.parentNode,
                      text: data
                    });
                    lastBlockItem.text = reduceWhitespace(lastBlockItem.substrings.map(function (s) {
                      return s.text;
                    }).join(""));
                  }
                } else {
                  var blockItem = {
                    type: "string",
                    parentElement: node.parentNode,
                    text: data,
                    substrings: []
                  };
                  if (data) {
                    blockItem.substrings.push({
                      parentElement: node.parentNode,
                      text: data
                    });
                  }
                  block.push(blockItem);
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

    var blockItem;
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
            data.text = blockItem.className;
            break;
          case "INPUT":
            data.type = blockItem.type;
            data.checked = blockItem.checked;
            if (blockItem.placeholder) {
              data.placeholder = blockItem.placeholder;
            }
            data.value = blockItem.value;
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
          case "TEXTAREA":
            if (blockItem.placeholder) {
              data.placeholder = blockItem.placeholder;
            }
            data.value = blockItem.value;
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
  }

  var content = getContent();
  var elements = [];

  function createElementReference(element) {
    elements.push(element);
    return elements.length - 1;
  }

  content.forEach(function (item) {
    switch (item.type) {
      case "string":
        item.parentElementReference = createElementReference(item.parentElement);
        delete item.parentElement;
        item.substrings.forEach(function (substring) {
          substring.parentElementReference = createElementReference(substring.parentElement);
          delete substring.parentElement;
        });
        break;
      default:
        item.elementReference = createElementReference(item.element);
        delete item.element;
        if (item.options) item.options.forEach(function (option) {
          option.elementReference = createElementReference(option.element);
          delete option.element;
        });
        break;
    }
  });
  return [content].concat(elements);
}

module.exports = {getContentBundle};