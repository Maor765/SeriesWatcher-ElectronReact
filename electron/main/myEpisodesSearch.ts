import * as cheerio from 'cheerio'

export async function searchMyEpisodes(showName: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
    console.log(`[MyEpisodes] Searching for: "${showName}"`)

    const response = await fetch(searchUrl)
    if (!response.ok) {
      console.log(`[MyEpisodes] HTTP ${response.status}, returning search URL`)
      return searchUrl
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Find all links that look like show links
    // Look for <a> tags with href containing /show/
    const links: Array<{ url: string; text: string }> = []

    $('a[href*="/show/"]').each((_i, el) => {
      const href = $(el).attr('href')
      const text = $(el).text().trim()

      if (href && text && href.startsWith('/show/')) {
        const url = href.startsWith('http') ? href : 'https://www.myepisodes.com' + href
        links.push({ url, text })
      }
    })

    console.log(`[MyEpisodes] Found ${links.length} show links`)
    links.slice(0, 10).forEach((l, i) => {
      console.log(`  [${i}] "${l.text}"`)
    })

    if (links.length === 0) {
      console.log(`[MyEpisodes] No shows found, returning search page`)
      return searchUrl
    }

    // Try exact match (case-insensitive)
    const exact = links.find(l => l.text.toLowerCase() === showName.toLowerCase())
    if (exact) {
      console.log(`[MyEpisodes] ✓ Exact match: "${exact.text}"`)
      return exact.url
    }

    console.log(`[MyEpisodes] No exact match, trying partial...`)
    // Try partial match
    const partial = links.find(l => l.text.toLowerCase().includes(showName.toLowerCase()))
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
  // No-op
}
