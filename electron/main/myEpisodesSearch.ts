let browser: any = null

async function lazyBrowser() {
  if (!browser) {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({ headless: true })
  }
  return browser
}

export async function searchMyEpisodes(showName: string): Promise<string | null> {
  try {
    const browser = await lazyBrowser()
    const page = await browser.newPage()
    page.setDefaultTimeout(15000)

    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`

    try {
      await page.goto(searchUrl, { waitUntil: 'load' })
    } catch (navError) {
      // Network error or timeout — just return the search URL and let browser navigate
      await page.close()
      return searchUrl
    }

    // Look for show links with epsbyshow in the href
    const showUrl = await page.evaluate((name: string) => {
      const links = Array.from(document.querySelectorAll('a[href*="epsbyshow"]')) as HTMLAnchorElement[]

      if (links.length === 0) return null

      // Try exact match first (case-insensitive, trim whitespace)
      const exact = links.find(a =>
        a.textContent?.trim().toLowerCase() === name.toLowerCase()
      )
      if (exact?.href) return exact.href

      // Try partial match (show name appears in link text)
      const partial = links.find(a =>
        a.textContent?.toLowerCase().includes(name.toLowerCase())
      )
      if (partial?.href) return partial.href

      // Return first result
      return links[0].href
    }, showName)

    await page.close()

    // If found a show page, return it; otherwise return search page
    return showUrl || searchUrl
  } catch (e) {
    // On any error, return search URL as fallback
    return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
