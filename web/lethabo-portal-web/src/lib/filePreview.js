export const BRIEF_PDF = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NiA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDcyIDcwMCBUZCAoTnppbXogYXBwIGJyaWVmKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDMzNyAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQwNwolJUVPRg=='

export function designPreview(title, note) {
  const text = (value) => String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <rect width="960" height="600" fill="#111111"/>
    <rect x="40" y="36" width="880" height="528" rx="28" fill="#ffffff"/>
    <rect x="40" y="36" width="880" height="84" rx="28" fill="#ffe500"/>
    <rect x="40" y="92" width="880" height="28" fill="#ffe500"/>
    <text x="72" y="92" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#111111">${text(title)}</text>
    <text x="72" y="180" font-family="Arial,sans-serif" font-size="20" fill="#444444">${text(note)}</text>
    <rect x="72" y="230" width="380" height="260" rx="18" fill="#f3f3f3"/>
    <rect x="488" y="230" width="380" height="120" rx="18" fill="#111111"/>
    <text x="516" y="300" font-family="Arial,sans-serif" font-size="22" fill="#ffe500">Lethabo M</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function kindFromFile(file) {
  if (file.type.startsWith('image/')) return 'Image'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'PDF'
  return 'File'
}

export function isImage(file) {
  const url = String(file?.previewUrl || '')
  const kind = String(file?.kind || '').toLowerCase()
  return kind === 'image' || url.startsWith('data:image') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
}

export function isPdf(file) {
  const url = String(file?.previewUrl || '')
  const name = String(file?.name || '').toLowerCase()
  const kind = String(file?.kind || '').toLowerCase()
  return kind === 'pdf' || name.endsWith('.pdf') || url.startsWith('data:application/pdf')
}

export function downloadFile(file) {
  const url = String(file?.previewUrl || '')
  if (!url) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file?.name || 'document'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function readPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({
      name: file.name,
      kind: kindFromFile(file),
      previewUrl: String(reader.result || ''),
    })
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}
