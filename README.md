# Web Automator
Web automation using rendered web context

## Installation

Web Automator may be installed via npm with

    npm install webautomator

You will need to also install and set-up [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver).

## Usage

The demo below is included in the `example` directory. You may also find the tests to be helpful.

```js
const {Builder} = require('selenium-webdriver');
const {WebAutomator} = require('webautomator');

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
