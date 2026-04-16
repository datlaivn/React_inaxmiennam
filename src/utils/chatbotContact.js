/**
 * Chuẩn hóa nút Gọi / Zalo từ API settings hoặc payload contact của chatbot.
 */

function phoneLabels(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return []
  return phones
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return String(item.number || item.phone || item.label || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function firstPhoneLabel(phones) {
  const list = phoneLabels(phones)
  return list.length > 0 ? list[0] : ''
}

function digitsToTelUri(digits) {
  const d = String(digits || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) return `tel:+84${d.slice(1)}`
  return `tel:+${d}`
}

/**
 * @param {Record<string, unknown>} data — JSON từ api.php?_route=get/settings
 */
export function buildContactUiFromSettings(data) {
  if (!data || typeof data !== 'object') return null

  const rawPhones = [
    ...phoneLabels(data.phones),
    ...phoneLabels(data.hotlines),
    String(data.hotline || '').trim(),
  ].filter(Boolean)

  const seenTelHrefs = new Set()
  const phoneItems = rawPhones
    .map((label) => ({
      label,
      telHref: digitsToTelUri(label),
    }))
    .filter((item) => {
      if (item.telHref.length <= 6) return false
      if (seenTelHrefs.has(item.telHref)) return false
      seenTelHrefs.add(item.telHref)
      return true
    })

  const phoneLabel = phoneItems[0]?.label || ''
  const telHref = phoneItems[0]?.telHref || ''

  let z = String(data.zalo_chat || data.zalo || '').trim()
  let zaloHref = z
  if (z && !/^https?:\/\//i.test(z)) {
    const zd = z.replace(/\D/g, '')
    zaloHref = zd ? `https://zalo.me/${zd}` : ''
  }

  const hasCall = phoneItems.length > 0
  const hasZalo = /^https?:\/\//i.test(zaloHref)
  if (!hasCall && !hasZalo) return null

  return {
    phoneItems,
    phoneLabel: phoneLabel || 'Hotline',
    telHref,
    zaloHref: hasZalo ? zaloHref : '',
    hasCall,
    hasZalo,
  }
}

/**
 * @param {Record<string, unknown>} bundle — data.contact từ post/chatbot
 */
export function buildContactUiFromChatbotBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return null
  const phoneLabel = firstPhoneLabel(bundle.phones) || ''
  const telHref = typeof bundle.tel_uri === 'string' ? bundle.tel_uri : ''
  const zaloHref = typeof bundle.zalo_link === 'string' ? bundle.zalo_link : ''
  const hasCall = telHref.startsWith('tel:')
  const hasZalo = /^https?:\/\//i.test(zaloHref)
  if (!hasCall && !hasZalo) return null
  return {
    phoneLabel: phoneLabel || 'Hotline',
    telHref,
    zaloHref,
    hasCall,
    hasZalo,
  }
}
