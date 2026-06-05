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
    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
    console.log(`[MyEpisodes] Searching for: "${showName}"`)

    const browser = await lazyBrowser()
    const page = await browser.newPage()

    // Set a longer timeout
    page.setDefaultTimeout(20000)
    page.setDefaultNavigationTimeout(20000)

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2', // Wait for network to be mostly idle
    })

    // Wait for search results to appear
    await page.waitForSelector('a[href*="/show/"]', { timeout: 10000 }).catch(() => null)

    // Get all show links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/show/"]'))
        .map(el => ({
          url: (el as HTMLAnchorElement).href,
          text: el.textContent?.trim() || '',
        }))
        .filter(l => l.text.length > 0 && l.url.includes('/show/'))
    })

    console.log(`[MyEpisodes] Found ${links.length} show links`)
    links.slice(0, 10).forEach((l, i) => {
      console.log(`  [${i}] "${l.text}"`)
    })

    await page.close()

    if (links.length === 0) {
      console.log(`[MyEpisodes] No shows found, returning search page`)
      return searchUrl
    }

    // Try exact match (case-insensitive)
    const exact = links.find((l: any) => l.text.toLowerCase() === showName.toLowerCase())
    if (exact) {
      console.log(`[MyEpisodes] ✓ Exact match: "${exact.text}"`)
      return exact.url
    }

    console.log(`[MyEpisodes] No exact match, trying partial...`)
    // Try partial match
    const partial = links.find((l: any) => l.text.toLowerCase().includes(showName.toLowerCase()))
    if (partial) {
      console.log(`[MyEpisodes] ✓ Partial match: "${partial.text}"`)
      return partial.url
    }

    console.log(`[MyEpisodes] No exact/partial match, using first result: "${links[0].text}"`)
    return links[0].url
  } catch (e) {
    console.error(`[MyEpisodes] Error:`, (e as Error).message)
    return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
