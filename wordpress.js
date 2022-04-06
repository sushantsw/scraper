const { env } = require("./environment");
const { sites, loginDetails, outsideAccounts } = require("./constants");
const BaseClass = require("./baseClass");

class WordPress extends BaseClass {
  constructor(browser) {
    super(sites.WORDPRESS, browser);
  }

  async init() {
    this.page = await this.initPage();
    await this.navigateToUrl(this.page);
    this.login();
  }

  async login() {
    try {
      /** Wait for Login button to load then click it */
      await this.page.waitForSelector('[title="Log In"]');
      this.page.click('[title="Log In"]');
      /** Wait for email field then fill it and submit */
      await this.page.waitForSelector('[name="usernameOrEmail"]');
      await this.page.type(
        '[name="usernameOrEmail"]',
        loginDetails.WORDPRESS.email
      );
      await this.page.waitForSelector('[type="submit"]');
      this.page.click('[type="submit"]');
      /** Wait for email verification  */
      const res = await this.waitForResponse(this.page, "auth-options");
      if (res._status == 200) {
        /** Fill password and submit */
        await this.page.type(
          '[name="password"]',
          loginDetails.WORDPRESS.password
        );
        await this.page.click('[type="submit"]');
        console.log("Logged in");
        this.search();
      } else {
        console.log("Email verification failed");
      }
    } catch (e) {
      console.log("Error in login--", e);
    }
  }

  async search() {
    try {
      let searchTerms = outsideAccounts[env.accountType].searchTerms;
      let blogs = [];
      await this.page.waitFor(3000);
      for (let term of searchTerms) {
        await this.navigateToUrl(
          this.page,
          `${sites.WORDPRESS}read/search?q=${term}`
        );
        blogs = [...blogs, ...(await this.getBlogItemList())];
      }
      console.log(blogs);
      this.addPosts(blogs);
    } catch (e) {
      console.log("Error in navigating to reader page-", e);
    }
  }

  async getBlogItemList() {
    try {
      return new Promise(async (resolve) => {
        await this.page.waitForSelector(".reader__content");
        const res = await this.waitForResponse(
          this.page,
          "search?http_envelope"
        );
        let blogs = [];
        if (res._status == 200) {
          await this.page.waitFor(5000);
          let blogItems = await this.page.$$(".reader__content article");
          let index = 0;
          while (blogs.length < env.postPerSearch) {
            await this.scroll(1, blogItems);
            blogItems = await this.page.$$(".reader__content article");
            for (let i = index; i < blogItems.length; i++) {
              let blog = await this.getDetailsFromBlogItems(blogItems[i]);
              if (blog && blog.url) {
                let res = await this.checkIfDuplicate(blog.url);
                if (res.isUnique) blogs.push(blog);
              }
            }
            index = blogItems.length;
          }
        } else {
          console.log("Blog api failed");
        }
        resolve(blogs);
      });
    } catch (e) {
      console.log("Error in getting blog links--", e);
    }
  }

  async getDetailsFromBlogItems(blogItem) {
    return new Promise(async (resolve) => {
      const blog = {
        title: null,
        img: null,
        imgAlt: null,
        video: null,
        videoAlt: null,
        desc: null,
      };

      let item = blogItem;
      /** Get Title */
      let urlItem = await item.$(".reader-post-card__byline-author-site a");
      const url = await this.page.evaluate((el) => {
        if (el) return el.getAttribute("href");
      }, urlItem);
      blog.url = url;
      let titleItem = await item.$(".reader-post-card__post-details h2 > a");
      const title = await this.page.evaluate((el) => {
        if (el) return el.textContent;
      }, titleItem);
      const redirectLink = await this.page.evaluate((el) => {
        if (el) return el.getAttribute("href");
      }, titleItem);
      blog.title = title;
      blog.redirectLink = redirectLink;
      /** Get Images */
      let images = await this.getImage(item);
      blog.img = images.img;
      blog.imgAlt = images.imgAlt;
      if (title) {
        resolve(blog);
      }
      resolve(undefined);
    });
  }

  async getImage(item) {
    let imageItem = await item.$(".reader-post-card__post ul > li > div");
    let imageItemAlt = await item.$(".reader-post-card__post a");
    const img = this.getImageLinkFromItem(
      await this.page.evaluate((el) => {
        if (el) return el.getAttribute("style");
      }, imageItem)
    );
    const imgAlt = this.getImageLinkFromItem(
      await this.page.evaluate((el) => {
        if (el) return el.getAttribute("style");
      }, imageItemAlt)
    );
    return { img, imgAlt };
  }

  getImageLinkFromItem(attr) {
    if (attr && attr.indexOf("?quality")) {
      return attr
        ? attr.substring(attr.indexOf('url("') + 5, attr.indexOf("?quality"))
        : null;
    } else {
      return attr
        ? attr.substring(attr.indexOf('url("') + 5, attr.indexOf('")'))
        : null;
    }
  }
}

exports.WordPress = WordPress;
