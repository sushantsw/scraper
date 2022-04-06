const { env } = require("./environment");
const { outsideAccounts } = require("./constants");
const axios = require("axios").default;

class BaseClass {
  constructor(url, browser) {
    this.url = url;
    this.browser = browser;
  }

  async initPage() {
    return this.browser.newPage();
  }

  async navigateToUrl(page, url = this.url) {
    try {
      return new Promise(async (resolve)=>{
        console.log(`Navigating to ${url}...`);
        await page.goto(url);
        console.log("Navigated!");
        resolve()
      })
    } catch (err) {
      console.log("Error while navigating---->", err);
    }
  }

  async waitForResponse(page, url) {
    return new Promise((resolve) => {
      page.on("response", function callback(response) {
        if (response.url().indexOf(url) != -1) {
          resolve(response);
          page.removeListener("response", callback);
        }
      });
    });
  }

  async getPropertyBySelector(
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
          return Promise.all(jsonCalls);
        } else {
          return (await handle.getProperty(property)).jsonValue();
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  async scroll(scrolls, items) {
    console.log("scrolling", scrolls);
    return new Promise(async (resolve) => {
      for (let i = 0; i < scrolls; i++) {
        try {
          await items[items.length - 1].hover();
          await this.page.waitFor(2000);
        } catch (e) {
          console.log("Error hovering", e);
        }
      }
      resolve("done");
    });
  }

  async getAccessToken() {
    return new Promise((resolve, reject) => {
      let config = {
        headers: {
          "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
          "Content-Type": "application/x-amz-json-1.1",
        },
      };
      axios
        .post(
          env.cognitoUrl,
          {
            AuthParameters: {
              USERNAME: outsideAccounts[env.accountType].email,
              PASSWORD: outsideAccounts[env.accountType].password,
            },
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: env.cognitoClientId,
          },
          config
        )
        .then(function (response) {
          resolve(response.data.AuthenticationResult.AccessToken);
        })
        .catch(function (error) {
          console.log(error);
          reject();
        });
    });
  }

  async addPosts(posts) {
    let token = await this.getAccessToken();
    for (let post of posts) {
      if (post) await this.callAddPostApi(post, token);
    }
    process.exit();
  }

  checkIfDuplicate(url) {
    return new Promise(async (resolve) => {
      let token = this.token;
      if (!this.token) {
        token = await this.getAccessToken();
        this.token = token;
      }
      let config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      axios
        .post(`${env.apiUrl}post/scraped-url`, {url}, config)
        .then(function (response) {
          console.log(response);
          resolve(response.data.body);
        })
        .catch(function (error) {
          console.log("Duplicate post check Api Error-", error);
          resolve(error);
        });
    });
  }

  callAddPostApi(post, token) {
    return new Promise((resolve) => {
      post = this.getContentUrl(post);
      let hashTags = null;
      if (post.desc && post.desc != "") {
        hashTags = post.desc.match(/#(\w+)/g);
      }
      let config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      axios
        .post(
          `${env.apiUrl}post/create`,
          {
            postTitle: post.title,
            postDesc: post.desc,
            postDetails: [
              {
                photoUrl: post.contentUrl,
                contentType: post.contentType,
                redirectLink: post.redirectLink,
              },
            ],
            hashTags: hashTags,
            isScraped: true,
            scrapedUrl: post.url,
          },
          config
        )
        .then(function (response) {
          resolve("success");
          console.log(response.status);
        })
        .catch(function (error) {
          resolve("error");
          console.log("Api Error-", error);
        });
    });
  }

  getContentUrl(post) {
    if (post.img) {
      post.contentUrl = post.img;
      post.contentType = "image";
    } else if (post.imgAlt) {
      post.contentUrl = post.imgAlt;
      post.contentType = "image";
    } else if (post.video) {
      post.contentUrl = post.video;
      post.contentType = "video";
    } else if (post.videoAlt) {
      post.contentUrl = post.videoAlt;
      post.contentType = "video";
    }
    return post;
  }
}

module.exports = BaseClass;
