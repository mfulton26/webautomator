const {WebAutomator} = require('../index');

const automator = new WebAutomator(webDriver);

beforeEach(async function () {
  await webDriver.navigate().to(`${__dirname}/demo.html`);
});

test('Demo', async function () {
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

  expect(await automator.getContent()).toMatchSnapshot();
});