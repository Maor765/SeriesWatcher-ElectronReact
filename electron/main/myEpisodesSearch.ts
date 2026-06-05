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
    page.setDefaultTimeout(10000)

    await page.goto(`https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`, {
      waitUntil: 'networkidle0',
    })

    // Look for show links with epsbyshow in the href (exact match preferred)
    const showUrl = await page.evaluate((name: string) => {
      const links = Array.from(document.querySelectorAll('a[href*="epsbyshow"]')) as HTMLAnchorElement[]

      // Try exact match first (case-insensitive)
      const exact = links.find(a =>
        a.textContent?.trim().toLowerCase() === name.toLowerCase() &&
        a.href.includes('epsbyshow')
      )
      if (exact?.href) return exact.href

      // Fall back to first result if it exists
      return links.length > 0 ? links[0].href : null
    }, showName)

    await page.close()
    return showUrl || null
  } catch (e) {
    console.error('MyEpisodes search failed:', (e as Error).message)
    return null
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
