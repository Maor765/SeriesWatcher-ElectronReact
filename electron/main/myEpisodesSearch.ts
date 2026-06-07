export async function searchMyEpisodes(showName: string): Promise<string | null> {
  // Open MyEpisodes search page — user clicks the correct show
  return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
}

export async function closeBrowser() {
  // No-op
}
