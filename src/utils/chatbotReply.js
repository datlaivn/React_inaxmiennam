/**
 * Lọc phần "suy nghĩ nội bộ" của AI để khách chỉ thấy lời thoại thân thiện.
 *
 * Xử lý 3 lớp:
 * 1. Cắt phần sau "Output:" hoặc "**Output:**"
 * 2. Xóa dòng: Intent, Tìm, Sản phẩm, Gợi ý, Action, →, BƯỚC…
 * 3. Xóa SKU tự bịa (không có trong danh sách hợp lệ)
 */
export function sanitizeChatbotReplyForDisplay(text, validSkus = []) {
  if (!text || typeof text !== 'string') return ''
  let s = text.trim()

  // ── Lớp 1: cắt sau "Output:" ──────────────────────────
  const outputRe = /(?:\*\*\s*Output\s*:\s*\*\*|(?:^|\r?\n)Output\s*:)/iu
  const om = s.match(outputRe)
  if (om && om.index !== undefined) {
    s = s.slice(om.index + om[0].length).trim()
  }

  // Bỏ fence markdown
  s = s.replace(/^```[\w]*\s*\r?\n?/u, '').replace(/\r?\n```\s*$/u, '').trim()

  // ── Lớp 2: bỏ dòng suy nghĩ nội bộ ─────────────────
  const skipLine = /^(→|###\s|BƯỚC\s+\d+|Intent\s*:|Tìm\s*:|Sản\s*phẩm\s*tìm\s*thấy\s*:|Gợi\s*ý\s*:|Action\s*:|\*\*\s*Intent\s*:\s*\*\*|\*\*\s*Tìm\s*:\s*\*\*|\*\*\s*Sản\s*phẩm|\*\*\s*Gợi\s*ý|\*\*\s*Action\s*:\s*\*\*|Output\s*:)/iu

  const lines = s.split(/\r?\n/)
  const kept = []
  for (const line of lines) {
    const t = line.trim()
    if (t === '') { kept.push(line); continue }
    if (skipLine.test(t)) continue
    kept.push(line)
  }
  s = kept.join('\n').trim().replace(/\n{3,}/g, '\n\n')

  // ── Lớp 3: xóa SKU tự bịa ──────────────────────────
  // Biết trước các SKU tự bịa (TOTO CT663F, GROHE CMA 160…)
  const KNOWN_FABRICATED = [
    /\bTOTO\s*CT663F\b/iu, /\bGROHE\s*CMA\s*160\b/iu,
    /\bTOTO\s*C755\b/iu,  /\bGROHE\s*BauEdge\b/iu,
    /\bAmerican\s*Standard\s*Mx\b/iu,
  ]
  for (const re of KNOWN_FABRICATED) {
    s = s.replace(re, '')
  }

  // Nếu có validSkus → xóa SKU không khớp
  if (Array.isArray(validSkus) && validSkus.length > 0) {
    const norm = (str) => str.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const validSet = new Set(validSkus.map(norm))
    const skuRe = /\b([A-Z]{1,12}[- ]?\d[\dA-Z\-\.]{3,12})\b/g
    s = s.replace(skuRe, (match) => {
      return validSet.has(norm(match)) ? match : ''
    })
  }

  // Xóa artifact từ các bước trên
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}
