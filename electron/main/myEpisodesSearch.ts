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
    console.log(`[MyEpisodes] Searching for: "${showName}"`)

    const browser = await lazyBrowser()
    const page = await browser.newPage()

    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(15000)

    // Navigate to search with tvshow param
    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle2' })

    console.log('[MyEpisodes] Results page loaded, looking for exact match...')

    // Find and click the link with exact show name match
    const showUrl = await page.evaluate((name: string) => {
      // Get all links on the page
      const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]

      // Find link with exact text match
      const exactMatch = links.find(link =>
        link.textContent?.trim().toLowerCase() === name.toLowerCase() &&
        link.href.includes('/show/')
      )

      if (exactMatch) {
        console.log(`Found exact match: "${exactMatch.textContent}"`)
        return exactMatch.href
      }

      return null
    }, showName)

    if (showUrl) {
      console.log(`[MyEpisodes] ✓ Found show: ${showUrl}`)
      await page.close()
      return showUrl
    }

    console.log('[MyEpisodes] No exact match found on results page')
    await page.close()
    return null
  } catch (e) {
    console.error('[MyEpisodes] Error:', (e as Error).message)
    return null
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
