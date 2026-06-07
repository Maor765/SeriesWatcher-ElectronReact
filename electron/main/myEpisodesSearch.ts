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

    // Step 1: Go to MyEpisodes home
    console.log('[MyEpisodes] Going to home page...')
    await page.goto('https://www.myepisodes.com/', { waitUntil: 'networkidle2' })

    // Step 2: Find and focus the search box
    console.log('[MyEpisodes] Finding search box...')
    const searchBox = await page.$('input[type="text"], input[placeholder*="Search" i], input[placeholder*="search" i]')
    if (!searchBox) {
      console.log('[MyEpisodes] Search box not found')
      await page.close()
      return null
    }

    // Step 3: Type the show name
    console.log(`[MyEpisodes] Typing "${showName}"...`)
    await searchBox.click()
    await page.type('input[type="text"]', showName, { delay: 50 })

    // Step 4: Press Enter
    console.log('[MyEpisodes] Pressing Enter...')
    await page.keyboard.press('Enter')

    // Wait for navigation and results to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null)
    await page.waitForTimeout(1000)

    // Step 5 & 6: Find the exact match in the result list and click it
    console.log('[MyEpisodes] Looking for exact match in results...')
    const showUrl = await page.evaluate((name: string) => {
      // Find all links
      const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[]

      console.log(`Found ${links.length} links total`)

      // Find exact match
      const exactMatch = links.find(link => {
        const linkText = link.textContent?.trim().toLowerCase()
        const searchName = name.toLowerCase()
        return linkText === searchName && link.href.includes('/show/')
      })

      if (exactMatch) {
        console.log(`Exact match found: "${exactMatch.textContent}"`)
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
