export async function searchMyEpisodes(showName: string): Promise<string | null> {
  return `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(showName)}`
}

export async function closeBrowser() {
  // No-op
}
