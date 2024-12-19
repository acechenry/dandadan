import imageCompression from 'browser-image-compression'

// 图片处理配置
const IMAGE_PROCESSING_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebP: true,
  initialQuality: 0.8,
  preserveExif: false,
  alwaysKeepResolution: true,
  fileType: 'auto',
  onProgress: () => {},
  strict: false
}

// 每批处理的图片数量
const BATCH_SIZE = 3

// 处理单个图片
export async function processImage(file: File): Promise<File> {
  try {
    // 尝试压缩图片
    let processedFile
    try {
      processedFile = await imageCompression(file, IMAGE_PROCESSING_OPTIONS)
    } catch (compressError) {
      console.warn('Compression failed, using original file:', compressError)
      processedFile = file  // 压缩失败时使用原文件
    }

    // 尝试 WebP 转换
    try {
      if (IMAGE_PROCESSING_OPTIONS.useWebP && 
          typeof window !== 'undefined' && 
          'createImageBitmap' in window &&
          HTMLCanvasElement.prototype.toBlob) {
        const bitmap = await createImageBitmap(processedFile)
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
    } catch (webpError) {
      console.warn('WebP conversion failed, using compressed file:', webpError)
      return processedFile  // WebP 转换失败时使用压缩后的文件（或原文件）
    }

    return processedFile
  } catch (error) {
    console.warn('Image processing failed, using original file:', error)
    return file  // 所有处理失败时使用原文件
  }
}

// 批量处理图片
export async function processFiles(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<File[]> {
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
