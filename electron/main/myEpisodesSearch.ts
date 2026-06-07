export async function searchMyEpisodes(_showName: string): Promise<string | null> {
  return `https://www.myepisodes.com/search/`
}

export async function closeBrowser() {
  // No-op
}
