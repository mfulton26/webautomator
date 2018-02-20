const NodeEnvironment = require('jest-environment-node');
const {Builder} = require('selenium-webdriver');

class WebDriverEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
    this.global.jestConfigName = config.name;
    this.options = config.testEnvironmentOptions;
  }

  async setup() {
    await super.setup();
    this.global.webDriver = await this.options.build
      ? this.options.build(new Builder())
      : new Builder()
        .usingServer(this.options.serverUrl)
        .withCapabilities(this.options.capabilities)
        .build();
  }

  async teardown() {
    await this.global.webDriver.quit();
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = WebDriverEnvironment;