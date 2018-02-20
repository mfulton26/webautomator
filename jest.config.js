const webdriver = require('selenium-webdriver');
// require('chromedriver');

module.exports = {
  name: "Headless Chrome",
  setupTestFrameworkScriptFile: "<rootDir>/__test_framework__/setup.js",
  testEnvironment: "<rootDir>/__test_framework__/WebDriverEnvironment.js",
  testEnvironmentOptions: {
    build(builder) {
      const chromeCapabilities = webdriver.Capabilities.chrome();
      chromeCapabilities.set('chromeOptions', {args: ['--headless']});
      return builder.forBrowser('chrome')
        .withCapabilities(chromeCapabilities)
        .build();
    }
  }
};