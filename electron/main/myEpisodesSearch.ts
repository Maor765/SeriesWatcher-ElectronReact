export async function searchMyEpisodes(showName: string): Promise<string | null> {
  // Simply return the MyEpisodes search page URL
  // User will see results and click the correct show
  return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
}

export async function closeBrowser() {
  // No-op
}
