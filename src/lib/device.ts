export function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown'
  const lowerUA = ua.toLowerCase()

  if (lowerUA.includes('bot') || lowerUA.includes('crawl') || lowerUA.includes('spider')) {
    return 'Bot'
  }
  if (lowerUA.includes('ipad')) {
    return 'Tablet'
  }
  if (lowerUA.includes('android')) {
    if (lowerUA.includes('mobile')) {
      return 'Mobile'
    }
    return 'Tablet'
  }
  if (lowerUA.includes('iphone') || lowerUA.includes('ipod') || lowerUA.includes('windows phone')) {
    return 'Mobile'
  }
  return 'Desktop'
}
