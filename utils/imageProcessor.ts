// 将类型声明移动到单独的文件
// types/browser-image-compression.d.ts
declare module 'browser-image-compression' {
  export default function imageCompression(
    file: File,
    options: {
      maxSizeMB?: number
      maxWidthOrHeight?: number
      useWebWorker?: boolean
      maxIteration?: number
      initialQuality?: number
      [key: string]: any
    }
  ): Promise<File>
}

import imageCompression from 'browser-image-compression'

// 图片处理配置
const IMAGE_PROCESSING_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebP: false,
  initialQuality: 0.8,
  preserveExif: false,
  alwaysKeepResolution: true,
  fileType: 'auto',
  onProgress: () => {},
  strict: false
}

// 每批处理的图片数量
const BATCH_SIZE = 3

// 添加 WebP 支持检查函数
function checkWebPSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = () => resolve(true)
    webP.onerror = () => resolve(false)
    webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
  })
}

interface ProcessingOptions {
  enableCompression: boolean
  enableWebP: boolean
}

// 处理单个图片
export async function processImage(file: File, options: ProcessingOptions): Promise<File> {
  try {
    // 根据设置决定是否压缩
    let processedFile = file
    if (options.enableCompression) {
      try {
        processedFile = await imageCompression(file, {
          ...IMAGE_PROCESSING_OPTIONS,
          useWebP: false // 压缩和格式转换
        })
      } catch (compressError) {
        console.warn('Compression failed, using original file:', compressError)
      }
    }

    // 根据设置决定是否转换为 WebP
    if (options.enableWebP) {
      try {
        const canUseWebP = typeof window !== 'undefined' && 
                          'createImageBitmap' in window &&
                          typeof document !== 'undefined' &&
                          'createElement' in document &&
                          await checkWebPSupport()

        if (canUseWebP) {
          const canvas = document.createElement('canvas')
          if (!canvas.toBlob) {
            throw new Error('Canvas toBlob not supported')
          }

          const bitmap = await createImageBitmap(processedFile)
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')
          
          ctx.drawImage(bitmap, 0, 0)
          
          // 如果浏览器不支持 WebP，使用原始格式
          const mimeType = canUseWebP ? 'image/webp' : processedFile.type
          const extension = canUseWebP ? '.webp' : ''
          
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), mimeType, 0.8)
          })

          return new File([blob], 
            extension ? file.name.replace(/\.[^.]+$/, extension) : file.name,
            { type: mimeType }
          )
        }
      } catch (webpError) {
        console.warn('WebP conversion failed:', webpError)
      }
    }

    return processedFile
  } catch (error) {
    console.warn('Image processing failed:', error)
    return file
  }
}

// 批量处理图片
export async function processFiles(
  files: File[],
  options: ProcessingOptions,
  onProgress?: (progress: number) => void
): Promise<File[]> {
  const results: File[] = []
  let processed = 0

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    const processedBatch = await Promise.all(
      batch.map(file => processImage(file, options))
    )
    results.push(...processedBatch)
    
    processed += batch.length
    onProgress?.(Math.round((processed / files.length) * 100))
  }

  return results
} 
