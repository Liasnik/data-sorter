export function countLines(text: string): number {
    if (!text) return 0
    let count = 1
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++
    return count
  }