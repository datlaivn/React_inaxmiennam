
// --- COOKIE/SESSION CROSS-ORIGIN CHECKLIST ---
// 1. Always use credentials: 'include' (fetch) or withCredentials: true (axios) for all API requests needing session/cookie.
// 2. Do NOT use mode: 'no-cors'.
// 3. Backend must set Set-Cookie with SameSite=None; Secure for cross-origin.
// 4. Access-Control-Allow-Credentials: true and Access-Control-Allow-Origin: <origin> (not *).
// 5. You cannot read Set-Cookie from JS; browser manages it.

const trimTrailingSlash = (value = '') => value.replace(/\/$/, '')
// Helper for fetch with credentials (always include cookies)
export const fetchWithCredentials = (url, options = {}) => {
	return fetch(url, {
		...options,
		credentials: 'include',
	});
};

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value || '')

// ── Runtime API URL (localStorage override) ───────────────────────────
// Lưu từ trang /settings → không cần rebuild
const API_URL_STORAGE_KEY = 'sqhome_api_base_url'

export const getRuntimeApiUrl = () => {
	if (typeof window === 'undefined') return null
	try { return localStorage.getItem(API_URL_STORAGE_KEY) || null } catch { return null }
}

export const setRuntimeApiUrl = (url) => {
	if (typeof window === 'undefined') return
	try { localStorage.setItem(API_URL_STORAGE_KEY, url) } catch { /* ignore */ }
}

const CART_TOKEN_KEY = 'inax_api_cart_token'

const canUseBrowserStorage = () => typeof window !== 'undefined'

const readCookieValue = (name) => {
	if (typeof document === 'undefined') return ''
	const sanitizedName = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = document.cookie.match(new RegExp(`(?:^|; )${sanitizedName}=([^;]*)`))
	return match ? decodeURIComponent(match[1]) : ''
}

export const getStoredCartToken = () => {
	const cookieToken = readCookieValue(CART_TOKEN_KEY)
	if (cookieToken) return cookieToken

	if (!canUseBrowserStorage()) return ''

	try {
		return window.localStorage.getItem(CART_TOKEN_KEY) || ''
	} catch (_error) {
		return ''
	}
}

export const persistCartToken = (token) => {
	const normalizedToken = String(token || '').trim()
	if (!normalizedToken || !canUseBrowserStorage()) return normalizedToken

	try {
		window.localStorage.setItem(CART_TOKEN_KEY, normalizedToken)
	} catch (_error) {
		// Ignore storage quota / private mode issues.
	}

	return normalizedToken
}

// For axios: always use withCredentials: true
export const buildCartRequestConfig = (config = {}) => {
	// Attach stored cart token as a fallback header for environments where cookies are
	// not being persisted (mobile browsers with strict cookie policies). Frontend
	// persists server-returned cart_token into localStorage via syncCartTokenFromResponse.
	const token = getStoredCartToken()
	return {
		...config,
		withCredentials: true,
		headers: {
			...(config.headers || {}),
			// Only send the header when we have a token.
			...(token ? { 'X-Inax-Cart-Token': token } : {}),
		},
	};
};

export const syncCartTokenFromResponse = (payload) => {
	const token = payload?.cart_token || payload?.summary?.cart_token || payload?.cart?.cart_token || ''
	return persistCartToken(token)
}

export const resolveApiBaseUrl = () => {
	const runtimeOverride = getRuntimeApiUrl()
	if (runtimeOverride) return trimTrailingSlash(runtimeOverride)

	const configuredBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '')
	if (configuredBase) return configuredBase

	if (typeof window !== 'undefined') {
		const origin = trimTrailingSlash(window.location.origin || '')
		const isLocalhost = /(^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$)/i.test(origin)
		if (isLocalhost) {
			return 'http://localhost:8888'
		}

		return origin
	}

	return 'http://localhost:8888'
}

export const buildApiUrl = (path = '') => {
	if (isAbsoluteHttpUrl(path)) return path
	const normalizedPath = path.startsWith('/') ? path : `/${path}`
	const route = normalizedPath.replace(/^\//, '')
	return `${resolveApiBaseUrl()}/${route}`
}
