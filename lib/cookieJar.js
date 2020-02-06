class CookieJar {
  constructor() {
    this.cookies = [];
  }

  setCookie(value, expiry) {
    this.cookies.push({ value, expiry });
  }

  cullExpiredCookies() {
    const now = new Date();
    this.cookies = this.cookies
      .filter((cookie) => !cookie.expiry || cookie.expiry > now);
  }

  getActiveCookies() {
    const now = new Date();
    return this.cookies
      .filter((cookie) => !cookie.expiry || cookie.expiry > now)
      .map((cookie) => cookie.value);
  }
}

export { CookieJar };
