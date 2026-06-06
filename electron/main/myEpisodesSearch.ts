let browser: any = null

async function lazyBrowser() {
  if (!browser) {
    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({
      headless: false,  // Show the browser window so you can see what's happening
      slowMo: 100,      // Slow down actions to see them clearly
    })
  }
  return browser
}

export async function searchMyEpisodes(showName: string): Promise<string | null> {
  try {
    console.log(`[MyEpisodes] Searching for: "${showName}"`)

    const browser = await lazyBrowser()
    const page = await browser.newPage()

    page.setDefaultTimeout(20000)
    page.setDefaultNavigationTimeout(20000)

    // Go to MyEpisodes home
    await page.goto('https://www.myepisodes.com/', { waitUntil: 'networkidle2' })

    // Find and click the search input
    const searchInput = await page.$('input[type="text"]')
    if (!searchInput) {
      console.log('[MyEpisodes] Search input not found')
      await page.close()
      return null
    }

    // Type the show name
    await page.type('input[type="text"]', showName, { delay: 50 })
    console.log(`[MyEpisodes] Typed "${showName}"`)

    // Press Enter or click search button
    await page.keyboard.press('Enter')
    console.log('[MyEpisodes] Pressed Enter, waiting for results...')

    // Wait for results to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null)
    await page.waitForSelector('a[href*="/show/"]', { timeout: 10000 }).catch(() => null)

    // Find all links that contain the show name (exact match, case-insensitive)
    const exactMatches = await page.evaluate((searchTerm: string) => {
      // Find all <a> tags
      const allLinks = Array.from(document.querySelectorAll('a'))
        .map(el => ({
          url: (el as HTMLAnchorElement).href,
          text: el.textContent?.trim() || '',
        }))

      // Filter for exact matches (case-insensitive)
      const matches = allLinks.filter(l =>
        l.text.toLowerCase() === searchTerm.toLowerCase() &&
        l.url.includes('/show/')
      )

      console.log(`Found ${matches.length} exact matches for "${searchTerm}"`)
      matches.slice(0, 5).forEach((m, i) => {
        console.log(`  [${i}] "${m.text}"`)
      })

      return matches
    }, showName)

    console.log(`[MyEpisodes] Found ${exactMatches.length} exact matches`)

    await page.close()

    if (exactMatches.length === 0) {
      console.log('[MyEpisodes] No exact matches found')
      return null
    }

    // Return the first exact match
    console.log(`[MyEpisodes] ✓ Opening: "${exactMatches[0].text}" → ${exactMatches[0].url}`)
    return exactMatches[0].url
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
