export class CookieHandler {
  async getCookiesForDomain(domain: string): Promise<chrome.cookies.Cookie[]> {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const allCookies: chrome.cookies.Cookie[] = [];
      const currentDomain = domain.split(":")[0];

      for (const store of stores) {
        const cookies = await chrome.cookies.getAll({ storeId: store.id });
        const domainCookies = cookies.filter((cookie) => {
          const slicedCookieDomain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
          return (
            slicedCookieDomain === currentDomain ||
            slicedCookieDomain === `www.${currentDomain}` ||
            currentDomain.endsWith(slicedCookieDomain)
          );
        });
        allCookies.push(...domainCookies);
      }

      return allCookies;
    } catch (error) {
      console.error("Error getting cookies for domain:", domain, error);
      return [];
    }
  }

  async clearCookiesForDomain(domain: string): Promise<void> {
    const cookies = await this.getCookiesForDomain(domain);

    const clearPromises = cookies.map(async (cookie) => {
      try {
        await chrome.cookies.remove({
          url: this.buildCookieUrl(cookie, domain),
          name: cookie.name,
          storeId: cookie.storeId,
        });
      } catch (error) {
        console.warn("Failed to remove cookie:", cookie.name, error);
      }
    });

    await Promise.all(clearPromises);
  }

  async restoreCookies(cookies: chrome.cookies.Cookie[], domain: string): Promise<void> {
    if (!cookies || !Array.isArray(cookies)) {
      console.error('Invalid cookies array provided:', cookies);
      return;
    }

    if (!domain) {
      console.error('Invalid domain provided for cookie restoration');
      return;
    }

    console.log(`Restoring ${cookies.length} cookies for domain: ${domain}`);
    
    // Track success and failure counts
    let successCount = 0;
    let failureCount = 0;
    
    const restorePromises = cookies.map(async (cookie) => {
      if (!cookie || !cookie.name) {
        console.warn('Skipping invalid cookie:', cookie);
        failureCount++;
        return;
      }
      
      try {
        const cookieDetails = this.prepareCookieForRestore(cookie, domain);
        await chrome.cookies.set(cookieDetails);
        successCount++;
      } catch (error) {
        failureCount++;
        console.warn(`Failed to restore cookie: ${cookie.name}`, error);
      }
    });

    await Promise.all(restorePromises);
    console.log(`Cookie restoration complete - Success: ${successCount}, Failed: ${failureCount}`);
  }

  private buildCookieUrl(cookie: chrome.cookies.Cookie, fallbackDomain?: string): string {
    const protocol = cookie.secure ? "https" : "http";
    let domain = cookie.domain;

    if (domain.startsWith(".")) {
      domain = domain.slice(1);
    }

    if (!domain && fallbackDomain) {
      domain = fallbackDomain;
    }

    if (!domain) {
      throw new Error(`Invalid domain for cookie ${cookie.name}: ${cookie.domain}`);
    }

    const path = cookie.path || "/";
    return `${protocol}://${domain}${path}`;
  }

  private prepareCookieForRestore(cookie: chrome.cookies.Cookie, fallbackDomain: string): chrome.cookies.SetDetails {
    const url = this.buildCookieUrl(cookie, fallbackDomain);

    const cookieDetails: chrome.cookies.SetDetails = {
      url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      storeId: cookie.storeId,
    };

    if (cookie.domain && cookie.domain.startsWith(".")) {
      cookieDetails.domain = cookie.domain;
    }

    if (!cookie.session && cookie.expirationDate) {
      cookieDetails.expirationDate = cookie.expirationDate;
    }

    if (cookie.sameSite && cookie.sameSite !== "unspecified") {
      cookieDetails.sameSite = cookie.sameSite;
    }

    return cookieDetails;
  }
}
