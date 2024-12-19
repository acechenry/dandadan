'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import styles from './home.module.css'
import { processFiles } from '@/utils/imageProcessor'

// 网站标题和图标配置
const SITE_CONFIG = {
  title: "图床服务",
  favicon: "/favicon.ico"
}

// 定义上传文件类型
interface UploadedFile {
  originalName: string
  fileName: string
  url: string
  markdown: string
  bbcode: string
  html: string
  size: number
  type: string
  uploadTime: string
}

// 将超时时间提取为常量
const UPLOAD_TIMEOUT = 30000 // 30 seconds

// 添加图片处理配置
const IMAGE_PROCESSING_OPTIONS = {
  maxSizeMB: 1,              // 最大文件大小
  maxWidthOrHeight: 1920,    // 最大宽度/高度
  useWebP: true,             // 使用WebP格式
  initialQuality: 0.8,       // 初始压缩质量
  preserveExif: false,       // 不保留EXIF数据
}

// 添加批处理配置
const BATCH_SIZE = 3  // 每批处理图片数量

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [currentImages, setCurrentImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)

  // 初始化主题
  useEffect(() => {
    // 从 localStorage 获取主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    }
  }, [])

  // 主题切换
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev
      localStorage.setItem('theme', newTheme ? 'dark' : 'light')
      return newTheme
    })
  }

  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // 处理文件拖放
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 添加图片处理函数
  const processImage = async (file: File): Promise<File> => {
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
      return file  // 处理失败时返回原文件
    }
  }

  // 修改文件处理函数
  const processFiles = async (files: File[]): Promise<File[]> => {
    const results: File[] = []
    let processed = 0

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      const processedBatch = await Promise.all(
        batch.map(file => processImage(file))
      )
      results.push(...processedBatch)
      
      processed += batch.length
      setProcessProgress(Math.round((processed / files.length) * 100))
    }

    return results
  }

  // 修改上传处理函数
  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    setProcessProgress(0)
    
    try {
      // 使用工具函数处理图片
      const processedFiles = await processFiles(files, setProcessProgress)
      
      const formData = new FormData()
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          if (progress !== uploadProgress) {
            setUploadProgress(progress)
          }
        }
      })

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open('POST', '/api/upload')
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('上传失败'))
          }
        }
        
        xhr.onerror = () => reject(new Error('网络错误'))
        
        processedFiles.forEach(file => {
          formData.append('files', file)
        })
        
        xhr.send(formData)
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('上传超时')), 30000)
      })

      const data = await Promise.race([uploadPromise, timeoutPromise])
      
      setCurrentImages(prev => [...(data as any).files, ...prev])
      setUploadProgress(100)
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Upload error:', error)
      }
      if (error instanceof Error) {
        alert(error.message || '上传失败，请重试')
      } else {
        alert('上传失败，请重试')
      }
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setProcessProgress(0)
      }, 500)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(() => {})
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = (bytes / Math.pow(k, i)).toFixed(2)
    return `${size} ${sizes[i]}`
  }

  // 修改退出登录按钮的处理函数
  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    
    try {
      const res = await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        router.push('/login')
      } else {
        throw new Error('登出失败')
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout error:', error)
      }
      alert('登出失败，请重试')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.containerDark : ''}`}>
      {/* 顶栏 */}
      <header className={`${styles.header} ${isDarkMode ? styles.headerDark : ''}`}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Image 
              src={SITE_CONFIG.favicon} 
              alt="Logo" 
              width={32} 
              height={32} 
              className="rounded"
            />
            <h1 className={styles.title}>{SITE_CONFIG.title}</h1>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.button}>
              上传图片
            </button>
            
            <Link 
              href="/manage"
              className={styles.button}
            >
              图片管理
            </Link>
            
            <button
              onClick={handleLogout}
              className={styles.button}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? '退出中...' : '退出登录'}
            </button>
            
            <button
              onClick={toggleTheme}
              className={styles.button}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className={styles.main}>
        {/* 上传区域 */}
        <div className={styles.uploadArea}>
          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />
            {isUploading ? (
              <div className={styles.uploadingState}>
                <p>{processProgress < 100 ? '处理中...' : '上传中...'}</p>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${processProgress < 100 ? processProgress : uploadProgress}%` 
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon} />
                <p className={styles.uploadText}>点击或拖拽图片到这里上传</p>
              </>
            )}
          </div>
        </div>

        {/* 预览区域 */}
        {currentImages.length > 0 && (
          <div className={styles.previewArea}>
            <div className={styles.previewGrid}>
              {currentImages.map((image, index) => (
                <div key={image.fileName} className={styles.previewCard}>
                  <div className={styles.imagePreview}>
                    <img
                      src={image.url}
                      alt={image.originalName}
                    />
                  </div>
                  <div className={styles.urlGroup}>
                    {[
                      { label: '直链', value: image.url },
                      { label: 'Markdown', value: image.markdown },
                      { label: 'BBCode', value: image.bbcode }
                    ].map(({ label, value }) => (
                      <div key={label} className={styles.urlItem}>
                        <span className={styles.urlLabel}>{label}</span>
                        <input
                          type="text"
                          value={value}
                          readOnly
                          className={styles.urlInput}
                        />
                        <button
                          onClick={() => copyToClipboard(value, index)}
                          className={styles.copyButton}
                        >
                          {copiedIndex === index ? '已复制' : '复制'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
