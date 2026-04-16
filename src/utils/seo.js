import { useEffect } from 'react'

const DEFAULT_SITE_NAME = 'INAX Miền Nam'
const DEFAULT_TITLE = 'INAX Miền Nam - Kho thiết bị vệ sinh INAX - Gạch ngoại thất - Chính hãng, giá tốt nhất TP. HCM, bảo hành lên đến 10 năm ...'
const DEFAULT_DESCRIPTION = 'INAX Miền Nam - Kho thiết bị vệ sinh INAX - Gạch ngoại thất - Chính hãng, giá tốt nhất TP. HCM, bảo hành lên đến 10 năm ...'

const ensureMetaTag = (name, attribute = 'name') => {
  if (typeof document === 'undefined') return null

  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }

  return element
}

const ensureCanonicalLink = () => {
  if (typeof document === 'undefined') return null

  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }

  return link
}

export const buildAbsoluteUrl = (value = '') => {
  if (typeof window === 'undefined') return value || ''
  if (!value) return window.location.href

  try {
    return new URL(value, window.location.origin).toString()
  } catch (_error) {
    return value
  }
}

export const applySeoMetadata = ({ title, description, canonical } = {}) => {
  if (typeof document === 'undefined') return

  document.title = title || DEFAULT_TITLE

  const descriptionTag = ensureMetaTag('description')
  if (descriptionTag) {
    descriptionTag.setAttribute('content', description || DEFAULT_DESCRIPTION)
  }

  const ogTitleTag = ensureMetaTag('og:title', 'property')
  if (ogTitleTag) {
    ogTitleTag.setAttribute('content', title || DEFAULT_TITLE)
  }

  const ogDescriptionTag = ensureMetaTag('og:description', 'property')
  if (ogDescriptionTag) {
    ogDescriptionTag.setAttribute('content', description || DEFAULT_DESCRIPTION)
  }

  const ogTypeTag = ensureMetaTag('og:type', 'property')
  if (ogTypeTag) {
    ogTypeTag.setAttribute('content', 'website')
  }

  const canonicalLink = ensureCanonicalLink()
  if (canonicalLink) {
    canonicalLink.setAttribute('href', buildAbsoluteUrl(canonical))
  }
}

export const getSeoTitle = (seoTitle, fallbackTitle) => seoTitle || fallbackTitle || DEFAULT_TITLE
export const getSeoDescription = (seoDescription, fallbackDescription = DEFAULT_DESCRIPTION) => seoDescription || fallbackDescription || DEFAULT_DESCRIPTION

export function useSeo(metadata) {
  useEffect(() => {
    applySeoMetadata(metadata)
  }, [metadata])
}

export const seoDefaults = {
  siteName: DEFAULT_SITE_NAME,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
}
