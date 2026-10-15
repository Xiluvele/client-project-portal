export function kindFromFile(file) {
  if (file.type.startsWith('image/')) return 'Image'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'PDF'
  return 'File'
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
