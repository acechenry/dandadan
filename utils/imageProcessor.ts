import imageCompression from 'browser-image-compression'

// 图片处理配置
const IMAGE_PROCESSING_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebP: true,
  initialQuality: 0.8,
  preserveExif: false,
}

// 每批处理的图片数量
const BATCH_SIZE = 3

// 处理单个图片
export async function processImage(file: File): Promise<File> {
  try {
    // 压缩图片
    const compressedFile = await imageCompression(file, IMAGE_PROCESSING_OPTIONS)

    // 检查是否在浏览器环境且支持 WebP 转换
    if (IMAGE_PROCESSING_OPTIONS.useWebP && 
        typeof window !== 'undefined' && 
        'createImageBitmap' in window) {
      const bitmap = await createImageBitmap(compressedFile)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')
      
      ctx.drawImage(bitmap, 0, 0)
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/webp', 0.8)
      })

      return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: 'image/webp'
      })
    }

    return compressedFile
  } catch (error) {
    console.warn('Image processing failed:', error)
    return file
  }
}

// 批量处理图片
export async function processFiles(files: File[], onProgress?: (progress: number) => void): Promise<File[]> {
  const results: File[] = []
  let processed = 0

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    const processedBatch = await Promise.all(
      batch.map(file => processImage(file))
    )
    results.push(...processedBatch)
    
    processed += batch.length
    onProgress?.(Math.round((processed / files.length) * 100))
  }

  return results
} 
