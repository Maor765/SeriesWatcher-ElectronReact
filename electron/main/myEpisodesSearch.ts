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

    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
    console.log(`[MyEpisodes] Searching for "${showName}" at ${searchUrl}`)

    await page.goto(searchUrl, {
      waitUntil: 'networkidle0',
    })

    // Look for show links with epsbyshow in the href (exact match preferred)
    const showUrl = await page.evaluate((name: string) => {
      const links = Array.from(document.querySelectorAll('a[href*="epsbyshow"]')) as HTMLAnchorElement[]

      console.log(`[MyEpisodes] Found ${links.length} show links`)
      links.forEach((a, i) => {
        console.log(`  [${i}] "${a.textContent?.trim()}" → ${a.href}`)
      })

      // Try exact match first (case-insensitive)
      const exact = links.find(a => {
        const text = a.textContent?.trim().toLowerCase()
        const match = text === name.toLowerCase()
        console.log(`  Checking exact match: "${text}" vs "${name.toLowerCase()}" = ${match}`)
        return match && a.href.includes('epsbyshow')
      })
      if (exact?.href) {
        console.log(`[MyEpisodes] Exact match found: ${exact.href}`)
        return exact.href
      }

      // Fall back to first result if it exists
      if (links.length > 0) {
        console.log(`[MyEpisodes] No exact match, using first result: ${links[0].href}`)
        return links[0].href
      }

      console.log(`[MyEpisodes] No results found`)
      return null
    }, showName)

    await page.close()
    return showUrl || null
  } catch (e) {
    console.error('[MyEpisodes] Search failed:', (e as Error).message)
    return null
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
