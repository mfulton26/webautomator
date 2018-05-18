# webautomator
Web automation using rendered web context

## Installation

`webautomator` may be installed via npm with

    npm install webautomator

You will need to also install and set-up [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver).

## Usage

The demo below is included in the `example` directory. You may also find the tests to be helpful.

```js
const {Builder} = require('selenium-webdriver');
const {WebAutomator} = require('webautomator');
require('chromedriver');

(async function demo() {
  const driver = new Builder().forBrowser('chrome').build();
  const automator = new WebAutomator(driver);
  try {
    await driver.navigate().to(`${__dirname}/demo.html`);
    await automator.set('First Name').to('Joyce');
    await automator.set('Last Name').to('Byers');
    await automator.set('Gender').to('Female');
    await automator.after('Child Information', async context => {
      await context.set('First Name').to('Will');
      await context.set('Last Name').to('Byers');
      await context.set('Gender').to('Male');
      await context.set('Date of Birth').to('3/22/1971');
    });
    await automator.set('Shipping Information').to('2-Day');
    await automator.click('I confirm that these details are accurate.');
  } finally {
    await driver.quit();
  }
})();
```

```bash
node example/demo.js
```

## Documentation

### Getting Started

To get started you need to create a `WebDriver` instance for `WebAutomator` to use. See [Using the Builder API - selenium-webdriver - npm](https://www.npmjs.com/package/selenium-webdriver#using-the-builder-api) for details.

With a `WebDriver` instance ready you can no instantiate an instance of the `WebAutomator` class which will use the underlying `WebDriver` instance for all of its browser calls:

```js
const {Builder} = require('selenium-webdriver');
const {WebAutomator} = require("webautomator");

const webDriver = new Builder().forBrowser('chrome').build();
const webAutomator = new WebAutomator(webDriver);
```

### API

Elements are located by preceding text, by `placeholder` attributes (`input` and `textarea` elements), and by [`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title) attributes. 

#### `get`

Get properties such as widget values and options from elements on the page.

Examples:

1. Get the options for a `select` element preceded by the text "Gender":

    ```js
    const genderOptions = await webAutomator.get("Gender").options();
    ```

2. Get the value of a text input element which is either preceded by the text "First Name" or has a `placeholder` attribute value of `"First Name"`:

    ```js
    const firstName = await webAutomator.get("First Name").value();
    ```

3. Get the values for a compound date element which consists of a month select element, a day number input, and a year number input:

    ```js
    const {month, day, year} = await webAutomator.get("Date of Birth").values("month", "day", "year");
    ```

    Note that in this case, the property names `month`, `day`, and `year` are arbitrary. They could be named `a`, `b`, `c` if you wanted them to be named such. The `...names` in `values(...names)` is simply a list of names to assign each value to.

#### `set`

Sets form widget values (`input`, `textarea`, `select`).

Examples:

1. Set the value of a text input preceded by the text "Last Name" to `"Byers"`:

    ```js
    await webAutomator.set("Last Name").to("Byers");
    ```

2. Set the values in a compound date element which consists of a month select element, a day number input, and a year number input:

    ```js
    await webAutomator.set("Date of Birth").to("March", "22", "1971");
    ```

#### `click`

Clicks elements on the page.

Examples:

1. Click a "Submit" button:

    ```js
    await webAutomator.click("Submit");
    ```

2. Click a label associated with a radio input to toggle its `checked` attribute:

    ```js
    await webAutomator.click("I confirm that these details are accurate.");
    ```

#### `can.spy`

Determines if some text is displayed on the page.

Example:

```js
if (await webAutomator.can.spy("Alert")) {
  // do something
}
```

#### `can.not.spy`

Determines if some text is not displayed on the page.

```js
if (await webAutomator.can.not.spy("You've reached your maximum number of items in you're cart!")) {
  // do something
}
```

#### `after`

Allows narrowing the scope of the searched context on the page to be explicitly after some text.

Example:

```js
await webAutomator.after("Child Information", async function (webContext) {
  await webContext.set("First Name").to("Will");
});
```

#### `before`

Allows narrowing the scope of the searched context on the page to be explicitly before some text.

Example:

```js
await webAutomator.before("Child Information", async function (webContext) {
  await webContext.set("First Name").to("Joyce");
});
```

#### `between`

Allows narrowing the scope of the searched context on the page to be explicitly between some texts.

Example:

```js
await webAutomator.between("Parent Information").and("Child Information", async function (webContext) {
  await webContext.set("First Name").to("Joyce");
});
```

#### `getContent` (Experimental)

Gets an XML representation using markup derived from WAI-ARIA roles.

May be used in [snapshot testing](https://facebook.github.io/jest/docs/en/snapshot-testing.html).

Example:

```js
expect(await webAutomator.getContent()).toMatchSnapshot();
```

<details>
<summary>Example snapshot serialization</summary>
<p>

```xml
<window>
  Parent Information
  First Name:
  <textbox
    value="Joyce"
  />
  Last Name:
  <textbox
    value="Byers"
  />
  Gender:
  <combobox>
    <option>
      Male
    </option>
    <option
      selected="true"
    >
      Female
    </option>
  </combobox>
  Child Information
  First Name:
  <textbox
    value="Will"
  />
  Last Name:
  <textbox
    value="Byers"
  />
  Gender:
  <combobox>
    <option
      selected="true"
    >
      Male
    </option>
    <option>
      Female
    </option>
  </combobox>
  Date of Birth:
  <textbox
    value="1971-03-22"
  />
  Shipping Information
  <radio />
  Ground
  <radio
    checked="true"
  />
  2-Day
  <radio />
  1-Day
  Shipping Options
  <checkbox />
  Gift wrapped?
  <checkbox />
  Warranty?
  <checkbox
    checked="true"
  />
  Returnable?
  Confirmation
  <checkbox
    checked="true"
  />
  I confirm that these details are accurate.
</window>
```

</p>
</details>