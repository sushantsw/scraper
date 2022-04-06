const { env } = require("./environment");
const { sites, loginDetails, outsideAccounts } = require("./constants");
const { decode } = require("html-entities");
const BaseClass = require("./baseClass");

class Pinterest extends BaseClass {
  constructor(browser) {
    super(sites.PINTEREST, browser);
  }

  async init() {
    this.page = await this.initPage();
    await this.navigateToUrl(this.page);
    this.login();
  }

  async login() {
    /** Wait for Login button to load then click it */
    await this.page.waitForSelector(".JME");
    this.page.click(".RCK");
    /** Wait for login form to load then submit it */
    await this.page.waitForSelector(".V86");
    await this.page.type("#email", loginDetails.PINTEREST.email);
    await this.page.type("#password", loginDetails.PINTEREST.password);
    await this.page.waitForSelector(".red");
    await Promise.all([this.page.click(".red"), this.page.waitForNavigation()]);
    console.log("Logged in");
    this.search();
  }

  async search() {
    let searchTerms = outsideAccounts[env.accountType].searchTerms;
    let pins = [];
    for (let term of searchTerms) {
      // let page = await this.initPage();
      await this.navigateToUrl(
        this.page,
        `${sites.PINTEREST}search/pins/?q=${term}`
      );
      pins = [...pins, ...(await this.getGridItemsLinks())];
    }
    console.log(pins);
    this.addPosts(pins);
  }

  async getGridItemsLinks() {
    return new Promise(async (resolve) => {
      /** Get all pin divs */
      let gridItems = await this.page.$$("div[data-grid-item]");
      let itemLinks = [];
      let pins = [];
      let index = 0;
      /** Scroll given times and get links of newly loaded pins */
      while (pins.length < env.postPerSearch) {
        await this.scroll(1, gridItems);
        gridItems = await this.page.$$("div[data-grid-item]");
        itemLinks = await this.getGridItemHrefs(gridItems, itemLinks);
        for (let i = index; i < itemLinks.length; i++) {
          let link = itemLinks[i];
          let pin = await this.getDetailsFromItemLinks(link);
          if (pin && pin.url) {
            let res = await this.checkIfDuplicate(pin.url);
            if(res.isUnique)
              pins.push(pin);
          }
        }
        index = itemLinks.length;
      }
      console.log(pins);
      resolve(pins);
    });
  }

  async getDetailsFromItemLinks(url) {
    try {
      return new Promise(async (resolve) => {
        if (url && url.indexOf("pin/") == -1) {
          resolve(undefined);
          return;
        }
        const pin = {
          title: null,
          img: null,
          imgAlt: null,
          video: null,
          videoAlt: null,
          desc: null,
          url: null,
        };

        const page = await this.browser.newPage();
        await page.goto(url);
        pin.url = url;
        pin.title = await this.getPropertyBySelector(
          page,
          'div[data-test-id="closeup-title"] div h1',
          "innerHTML"
        );
        if (!pin.title) {
          await page.close();
          resolve(undefined);
          return;
        }
        pin.title = decode(pin.title);
        pin.img = await this.getPropertyBySelector(
          page,
          'div[data-test-id="closeup-image"] div img ',
          "src",
          true
        );
        if (pin.img.length > 1) {
          pin.img = pin.img[1];
        } else if (pin.img.length == 1) {
          pin.img = pin.img[0];
        } else {
          pin.img = null;
        }
        pin.redirectLink = await this.getPropertyBySelector(
          page,
          ".actionButton a",
          "href"
        );

        pin.video = await this.getPropertyBySelector(
          page,
          'div[data-test-id="visual-content-container"] div video',
          "src"
        );
        if (pin.video) {
          if (pin.video.includes("blob")) {
            await page.close();
            resolve(undefined);
            return;
          }
        }
        pin.videoAlt = await this.getPropertyBySelector(
          page,
          'div[data-test-id="story-pin-closeup-page"] div video',
          "src"
        );
        pin.imgAlt = await this.getPropertyBySelector(
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
          if (values.length > 1) {
            pin.desc = values[1];
          }
        }

        await page.close();
        resolve(pin);
      });
    } catch (e) {
      console.log("getDetailsFromItemLinks----Error-", e.status);
    }
  }

  async getGridItemHrefs(gridItems, itemLinks = []) {
    for (let item of gridItems) {
      const href = await this.getPropertyBySelector(item, "a", "href");

      if (!itemLinks.includes(href)) {
        itemLinks.push(href);
      }
    }

    return Promise.resolve(itemLinks);
  }
}

exports.Pinterest = Pinterest;
