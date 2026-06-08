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

    page.setDefaultTimeout(8000)
    page.setDefaultNavigationTimeout(8000)

    // Step 1: Go to MyEpisodes home (fast load)
    console.log('[MyEpisodes] Going to home page...')
    await page.goto('https://www.myepisodes.com/', { waitUntil: 'domcontentloaded' })

    // Step 2: Find and click search box
    console.log('[MyEpisodes] Finding search box...')
    const searchBox = await page.$('input[type="text"]')
    if (!searchBox) {
      await page.close()
      return null
    }

    // Step 3: Type fast
    console.log(`[MyEpisodes] Searching for "${showName}"...`)
    await searchBox.click()
    await page.type('input[type="text"]', showName, { delay: 5 })

    // Step 4: Submit
    await page.keyboard.press('Enter')

    // Wait for results table to appear (faster than navigation wait)
    try {
      await page.waitForSelector('a[href*="/epsbyshow/"]', { timeout: 5000 })
    } catch {
      console.log('[MyEpisodes] Results timeout')
    }

    // Step 5 & 6: Find the exact match in the result list and click it
    console.log('[MyEpisodes] Looking for exact match in results...')
    const showUrl = await page.evaluate((name: string) => {
      // Find all links with /epsbyshow/ in href
      const links = Array.from(document.querySelectorAll('a[href*="/epsbyshow/"]')) as HTMLAnchorElement[]

      console.log(`Found ${links.length} show links`)
      links.slice(0, 10).forEach((l, i) => {
        console.log(`  [${i}] "${l.textContent?.trim()}" → ${l.href}`)
      })

      // Find exact match (case-insensitive, trim whitespace)
      const exactMatch = links.find(link => {
        const linkText = link.textContent?.trim().toLowerCase()
        const searchName = name.toLowerCase()
        const isExact = linkText === searchName
        if (isExact) console.log(`✓ Exact match: "${link.textContent?.trim()}"`)
        return isExact
      })

      if (exactMatch) {
        console.log(`Returning: ${exactMatch.href}`)
        return exactMatch.href
      }

      console.log(`No exact match found`)
      return null
    }, showName)

    if (showUrl) {
      console.log(`[MyEpisodes] ✓ Success: ${showUrl}`)
      await page.close()
      return showUrl
    }

    console.log('[MyEpisodes] Failed to find exact match')
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
