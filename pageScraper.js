const { env } = require("./environment");
const { sites } = require("./constants");
const { decode } = require('html-entities');

const scraperObject = {
  url: sites.PINTEREST,
  async scraper(browser) {
    let page = await browser.newPage();
    console.log(`Navigating to ${this.url}...`);
    /** Navigate to the selected page*/
    await page.goto(this.url);
    console.log("Navigated");
    /** Wait for Login button to load then click it */
    await page.waitForSelector(".JME");
    page.click(".RCK");
    /** Wait for login form to load then submit it */
    await page.waitForSelector(".V86");
    await page.type("#email", env.email);
    await page.type("#password", env.password);
    await page.waitForSelector(".red");
    await Promise.all([page.click(".red"), page.waitForNavigation()]);
    console.log("Logged in");
    /** Get all pin divs */
    let gridItems = await page.$$("div[data-grid-item]");
    let itemLinks = [];
    /** Get links to all initial pins */
    itemLinks = await getGridItemHrefs(gridItems);
    /** Scroll given times and get links of newly loaded pins */
    let scrolls = env.scrollCount;
    for (let i = 0; i < scrolls; i++) {
      try {
        await gridItems[gridItems.length - 1].hover();
        await page.waitFor(1000);
      } catch (e) {
        console.log("Error hovering", e);
      }

      try {
        gridItems = await page.$$("div[data-grid-item]");
      } catch (e) {
        console.log("error in resetting grid items again", e);
      }

      try {
        itemLinks = await getGridItemHrefs(gridItems, itemLinks);
      } catch (e) {
        console.log("error in getting item hrefs", e);
      }
    }
    return itemLinks;
  },
};

async function getGridItemHrefs(gridItems, itemLinks = []) {
  for (let item of gridItems) {
    const href = await getPropertyBySelector(item, "a", "href");

    if (!itemLinks.includes(href)) {
      itemLinks.push(href);
    }
  }

  return Promise.resolve(itemLinks);
}

async function getPropertyBySelector(
  handleOrPage,
  selector,
  property = "",
  selectAll = false
) {
  if (handleOrPage) {
    let handle;
    if (selectAll) {
      handle = await handleOrPage.$$(selector);
    } else {
      handle = await handleOrPage.$(selector);
    }
    if (handle) {
      if (selectAll) {
        let calls = [];
        let jsonCalls = [];
        for (let element of handle) {
          calls.push(element.getProperty(property));
        }
        let handles = await Promise.all(calls);
        for (let element of handles) {
          jsonCalls.push(element.jsonValue());
        }
        let values = await Promise.all(jsonCalls);

        return values;
      } else {
        return await (await handle.getProperty(property)).jsonValue();
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
}

async function getDetailsFromItemLinks(url, browser) {
  try {
    const pin = {
      title: null,
      img: null,
      imgAlt: null,
      video: null,
      videoAlt: null,
      desc: null,
    };

    const page = await browser.newPage();
    await page.goto(url);

    pin.title = await getPropertyBySelector(
      page,
      'div[data-test-id="closeup-title"] div h1',
      "innerHTML"
    );
    if(!pin.title) return;
    pin.title = decode(pin.title);
    pin.img = await getPropertyBySelector(
      page,
      'div[data-test-id="closeup-image"] div img ',
      "src",
      true
    );
    if(pin.img.length > 1){
      pin.img = pin.img[1];
    }else if(pin.img.length == 1){
      pin.img = pin.img[0];
    }else{
      pin.img = null;
    }
    pin.redirectLink = await getPropertyBySelector(
      page,
      '.actionButton a',
      "href"
    );

    pin.video = await getPropertyBySelector(
      page,
      'div[data-test-id="visual-content-container"] div video',
      "src"
    );
    if(pin.video){
      if(pin.video.includes('blob')){
        await page.close();
        return undefined;
      }
    }
    pin.videoAlt = await getPropertyBySelector(
      page,
      'div[data-test-id="story-pin-closeup-page"] div video',
      "src"
    );
    pin.imgAlt = await getPropertyBySelector(
      page,
      'div[data-test-id="story-pin-closeup-page"] div img',
      "src"
    );
    let descSpans = await page.$$(".richPinInformation span");
    if (descSpans.length > 0) {
      let calls = [];
      let jsonCalls = [];
      for (let element of descSpans) {
        calls.push(element.getProperty("innerText"));
      }
      let handles = await Promise.all(calls);
      for (let element of handles) {
        jsonCalls.push(element.jsonValue());
      }
      let values = await Promise.all(jsonCalls);
      pin.desc = values;
      if(values.length > 1){
        pin.desc = values[1];
      }
    }

    await page.close();

    return Promise.resolve(pin);
  } catch (e) {
    console.log("getDetailsFromItemLinks----Error-", e);
  }
}

exports.scraperObject = scraperObject;
exports.getDetailsFromItemLinks = getDetailsFromItemLinks;
