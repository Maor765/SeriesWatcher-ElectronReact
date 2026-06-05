export async function searchMyEpisodes(showName: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
    console.log(`[MyEpisodes] Searching: "${showName}"`)

    // Fetch the search results page
    const response = await fetch(searchUrl)
    if (!response.ok) {
      console.log(`[MyEpisodes] Search fetch failed (${response.status}), returning search URL`)
      return searchUrl
    }

    const html = await response.text()

    // Extract all show links and their text
    // Look for: href="/show/..." patterns with following text
    const links: Array<{ url: string; text: string }> = []

    // Pattern 1: <a href="/show/12345">Title</a>
    let pattern1 = /href="(\/show\/\d+)"[^>]*>([^<]+)<\/a>/g
    let match
    while ((match = pattern1.exec(html)) !== null) {
      const text = match[2].trim()
      const url = 'https://www.myepisodes.com' + match[1]
      links.push({ url, text })
    }

    // Pattern 2: <a href="/show/slug-name">Title</a>
    let pattern2 = /href="(\/show\/[a-z0-9-]+)"[^>]*>([^<]+)<\/a>/g
    while ((match = pattern2.exec(html)) !== null) {
      const text = match[2].trim()
      const url = 'https://www.myepisodes.com' + match[1]
      // Avoid duplicates
      if (!links.some(l => l.url === url)) {
        links.push({ url, text })
      }
    }

    console.log(`[MyEpisodes] Found ${links.length} shows:`)
    links.forEach((l, i) => {
      console.log(`  [${i}] "${l.text}" → ${l.url}`)
    })

    if (links.length === 0) {
      console.log(`[MyEpisodes] No shows found, returning search page`)
      return searchUrl
    }

    // Try exact match first (case-insensitive)
    const exact = links.find(l => l.text.toLowerCase() === showName.toLowerCase())
    if (exact) {
      console.log(`[MyEpisodes] Exact match found: "${exact.text}" → ${exact.url}`)
      return exact.url
    }

    // Try partial match (show name appears in link text)
    const partial = links.find(l => l.text.toLowerCase().includes(showName.toLowerCase()))
    if (partial) {
      console.log(`[MyEpisodes] Partial match found: "${partial.text}" → ${partial.url}`)
      return partial.url
    }

    // Return first result
    console.log(`[MyEpisodes] No exact/partial match, using first result: "${links[0].text}" → ${links[0].url}`)
    return links[0].url
  } catch (e) {
    console.error(`[MyEpisodes] Error:`, (e as Error).message)
    // On error, return search URL
    return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
  }
}

export async function closeBrowser() {
  // No-op now that we're not using Puppeteer
}
