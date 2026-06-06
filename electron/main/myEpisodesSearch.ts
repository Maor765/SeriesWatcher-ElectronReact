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

    // Extract all show links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/show/"]'))
        .map(el => ({
          url: (el as HTMLAnchorElement).href,
          text: el.textContent?.trim() || '',
        }))
        .filter(l => l.text.length > 0)
    })

    console.log(`[MyEpisodes] Found ${links.length} results`)
    links.slice(0, 10).forEach((l, i) => {
      console.log(`  [${i}] "${l.text}"`)
    })

    await page.close()

    if (links.length === 0) {
      console.log('[MyEpisodes] No results found')
      return null
    }

    // Try exact match
    const exact = links.find((l: any) => l.text.toLowerCase() === showName.toLowerCase())
    if (exact) {
      console.log(`[MyEpisodes] ✓ Exact match: "${exact.text}" → ${exact.url}`)
      return exact.url
    }

    // Try partial match
    const partial = links.find((l: any) => l.text.toLowerCase().includes(showName.toLowerCase()))
    if (partial) {
      console.log(`[MyEpisodes] ✓ Partial match: "${partial.text}" → ${partial.url}`)
      return partial.url
    }

    console.log(`[MyEpisodes] Using first result: "${links[0].text}" → ${links[0].url}`)
    return links[0].url
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
