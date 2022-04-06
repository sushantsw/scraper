
const { env } = require("./environment");
const { Pinterest } = require("./pinterest");
const { WordPress } = require("./wordpress");

let token;
const classes = { PINTEREST: Pinterest, WORDPRESS: WordPress };

async function scrapeAll(browserInstance) {
  let browser;
  try {
    browser = await browserInstance;
    initializeClass(browser).init();
  } catch (err) {
    console.log("Could not resolve the browser instance => ", err);
  }
}

function initializeClass(browser) {
  return new classes[env.site](browser);
}
module.exports = (browserInstance) => scrapeAll(browserInstance);
