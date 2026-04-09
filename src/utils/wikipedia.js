const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const WIKI_REST_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary'

/**
 * Search English Wikipedia; returns article titles (best match first).
 */
async function wikiSearch(srsearch, limit = 8) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch,
    srlimit: String(limit),
    format: 'json',
    origin: '*',
  })
  const res = await fetch(`${WIKI_API}?${params}`)
  if (!res.ok) throw new Error(`Wikipedia search failed (${res.status})`)
  const data = await res.json()
  const list = data.query?.search
  if (!Array.isArray(list)) return []
  return list.map((s) => s.title)
}

/**
 * Short plain-text lead section via REST API (same extract shown in mobile preview).
 * @returns {{ extract: string, title: string, url: string } | null}
 */
async function wikiPageSummary(title) {
  const pathTitle = encodeURIComponent(title.replace(/ /g, '_'))
  const res = await fetch(`${WIKI_REST_SUMMARY}/${pathTitle}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Wikipedia summary failed (${res.status})`)
  const data = await res.json()
  if (data.type === 'disambiguation') return null
  const extract = data.extract?.trim()
  if (!extract) return null
  return {
    extract,
    title: data.title,
    url: data.content_urls?.desktop?.page,
  }
}

/**
 * Best-effort album blurb: tries several search queries, then first good summary.
 * @param {string} albumName
 * @param {string[]} artistNames primary artist first
 */
export async function getAlbumWikipediaSummary(albumName, artistNames = []) {
  const primary = artistNames[0]?.trim() || ''
  const queries = [
    primary ? `${primary} ${albumName} album` : null,
    primary ? `${albumName} ${primary} album` : null,
    `${albumName} (album)`,
    primary ? `${primary} ${albumName}` : null,
    albumName,
  ].filter(Boolean)

  for (const srsearch of queries) {
    let titles
    try {
      titles = await wikiSearch(srsearch, 8)
    } catch {
      continue
    }
    if (!titles.length) continue

    const slice = titles.slice(0, 5)
    const results = await Promise.all(slice.map((t) => wikiPageSummary(t)))
    const best = results.find((r) => r && r.extract.length > 80)
    if (best) return best
  }

  return null
}
