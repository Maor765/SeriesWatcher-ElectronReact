export async function searchMyEpisodes(showName: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`

    // Fetch the search results page
    const response = await fetch(searchUrl)
    if (!response.ok) return searchUrl

    const html = await response.text()

    // Look for links like: href="/show/12345/Title" or href="/show/show-slug"
    // Pattern: <a href="/show/...", try to find exact match first
    const linkPattern = /href="(\/show\/[^"]+)">([^<]+)<\/a>/g
    const links: Array<{ url: string; text: string }> = []

    let match
    while ((match = linkPattern.exec(html)) !== null) {
      links.push({
        url: 'https://www.myepisodes.com' + match[1],
        text: match[2].trim(),
      })
    }

    if (links.length === 0) {
      // No show links found, return search page
      return searchUrl
    }

    // Try exact match first (case-insensitive)
    const exact = links.find(l => l.text.toLowerCase() === showName.toLowerCase())
    if (exact) return exact.url

    // Try partial match
    const partial = links.find(l => l.text.toLowerCase().includes(showName.toLowerCase()))
    if (partial) return partial.url

    // Return first result
    return links[0].url
  } catch (e) {
    // On error, return search URL
    return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
  }
}

export async function closeBrowser() {
  // No-op now that we're not using Puppeteer
}
