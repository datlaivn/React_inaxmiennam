import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRuntimeApiUrl, setRuntimeApiUrl, resolveApiBaseUrl } from '../utils/api'

const ENV_KEY = 'VITE_API_BASE_URL'

export default function Settings() {
	const navigate = useNavigate()
	const [envValue, setEnvValue] = useState('')
	const [runtimeValue, setRuntimeValue] = useState('')
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		setEnvValue(import.meta.env[ENV_KEY] || '')
		setRuntimeValue(getRuntimeApiUrl() || '')
	}, [])

	const handleSave = () => {
		setError('')
		const url = runtimeValue.trim()
		if (url && !/^https?:\/\//i.test(url)) {
			setError('URL phải bắt đầu bằng http:// hoặc https://')
			return
		}
		setRuntimeApiUrl(url)
		setSaved(true)
		setTimeout(() => setSaved(false), 2500)
	}

	const handleClear = () => {
		setRuntimeApiUrl('')
		setRuntimeValue('')
		setSaved(true)
		setTimeout(() => setSaved(false), 2000)
	}

	const currentActive = resolveApiBaseUrl()

	return (
		<div style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px', fontFamily: 'inherit' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
				<button
					onClick={() => navigate(-1)}
					style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4 }}
					title="Quay lại"
				>
					←
				</button>
				<h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cài đặt Developer</h1>
			</div>

			{/* Current active */}
			<div style={{
				background: '#f0f4ff',
				border: '1px solid #c7d6fb',
				borderRadius: 8,
				padding: '12px 16px',
				marginBottom: 24,
				fontSize: 14,
			}}>
				<div style={{ fontWeight: 600, marginBottom: 4, color: '#444' }}>🔗 API URL hiện tại (đang dùng)</div>
				<code style={{ color: '#1a56db', wordBreak: 'break-all' }}>{currentActive}</code>
				<div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
					{getRuntimeApiUrl()
						? '→ Đang dùng Runtime Override (không cần build)'
						: '→ Đang dùng .env VITE_API_BASE_URL'}
				</div>
			</div>

			{/* Runtime override */}
			<div style={{ marginBottom: 24 }}>
				<label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
					🌐 Runtime API Base URL <span style={{ fontWeight: 400, color: '#888' }}>(override không cần build)</span>
				</label>
				<input
					type="text"
					value={runtimeValue}
					onChange={(e) => {
						setRuntimeValue(e.target.value)
						setSaved(false)
						setError('')
					}}
					placeholder="http://localhost:8888"
					style={{
						width: '100%',
						padding: '10px 12px',
						borderRadius: 6,
						border: error ? '1.5px solid #e53e3e' : '1.5px solid #ddd',
						fontSize: 14,
						boxSizing: 'border-box',
						outline: 'none',
					}}
					onFocus={(e) => { e.target.style.borderColor = '#3182ce'; e.target.style.boxShadow = '0 0 0 2px #bee3f8' }}
					onBlur={(e) => { e.target.style.borderColor = error ? '#e53e3e' : '#ddd'; e.target.style.boxShadow = 'none' }}
				/>
				{error && (
					<div style={{ color: '#e53e3e', fontSize: 13, marginTop: 6 }}>{error}</div>
				)}
				<div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
					Ví dụ: <code>http://localhost:8888</code> hoặc <code>https://sqhome.vn</code>
				</div>
			</div>

			{/* .env info (read-only) */}
			<div style={{ marginBottom: 28 }}>
				<label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
					📁 VITE_API_BASE_URL (trong .env — cần build lại để đổi)
				</label>
				<input
					type="text"
					value={envValue}
					readOnly
					style={{
						width: '100%',
						padding: '10px 12px',
						borderRadius: 6,
						border: '1.5px solid #e2e8f0',
						fontSize: 14,
						background: '#f7f7f7',
						color: '#888',
						boxSizing: 'border-box',
						cursor: 'not-allowed',
					}}
				/>
			</div>

			{/* Buttons */}
			<div style={{ display: 'flex', gap: 12 }}>
				<button
					onClick={handleSave}
					style={{
						padding: '10px 24px',
						borderRadius: 6,
						border: 'none',
						background: saved ? '#38a169' : '#3182ce',
						color: '#fff',
						fontSize: 15,
						fontWeight: 600,
						cursor: 'pointer',
						transition: 'background 0.2s',
					}}
				>
					{saved ? '✓ Đã lưu' : 'Lưu Runtime Override'}
				</button>
				<button
					onClick={handleClear}
					style={{
						padding: '10px 20px',
						borderRadius: 6,
						border: '1.5px solid #ddd',
						background: '#fff',
						color: '#555',
						fontSize: 14,
						cursor: 'pointer',
					}}
				>
					Xóa override
				</button>
			</div>

			{/* How to */}
			<div style={{
				marginTop: 32,
				padding: '16px',
				background: '#fafafa',
				border: '1px solid #eee',
				borderRadius: 8,
				fontSize: 13,
				color: '#555',
				lineHeight: 1.7,
			}}>
				<div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Cách sử dụng</div>
				<ol style={{ margin: 0, paddingLeft: 20 }}>
					<li>Điền <strong>Runtime API Base URL</strong> (VD: <code>http://localhost:8888</code>)</li>
					<li>Nhấn <strong>Lưu Runtime Override</strong></li>
					<li>Trang sẽ tự động dùng URL mới — <strong>không cần build lại</strong></li>
					<li>Để deploy chính thức: sửa <code>VITE_API_BASE_URL</code> trong file <code>.env</code> rồi build lại</li>
					<li>Nhấn <strong>Xóa override</strong> để quay về dùng URL từ <code>.env</code></li>
				</ol>
			</div>
		</div>
	)
}
