'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image, { ImageLoaderProps } from 'next/image'
import styles from './home.module.css'

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

// 定义上传响应类型
interface UploadResponse {
  success: boolean
  files?: UploadedFile[]
  message?: string
  error?: string
}

// 添加自定义图片加载器
const imageLoader = ({ src }: ImageLoaderProps) => {
  return src
}

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [images, setImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 主题切换
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  ///////////// 加载已上传的图片
  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(err => console.error('Failed to load images:', err))
  }, [])

  //// 处理拖拽事件//
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // 处理文件拖放//
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 处理文件拖放//
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 处理文件处理和自动上传//////////////////////////////////////////////
  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    
    try {
      // 添加文件类型和大小检查
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`文件 ${file.name} 不是图片格式`)
        }
        // 假设最大限制为 5MB
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`文件 ${file.name} 超���5MB限制`)
        }
      }

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || '上传失败')
      }

      setImages(prev => [...data.files, ...prev])
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : '上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(err => console.error('Failed to copy:', err))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  ///////////// 处理登出
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
      window.location.href = '/login'
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  // 添加删除图片功能
  const handleDeleteImage = async (fileName: string) => {
    try {
      const res = await fetch(`/api/images/${fileName}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error('删除失败')
      }
      
      setImages(prev => prev.filter(img => img.fileName !== fileName))
    } catch (error) {
      console.error('Delete error:', error)
      alert('删除失败，请重试')
    }
  }

  return (
    <div className={`${styles.container} ${theme === 'light' ? styles.containerLight : styles.containerDark}`}>
      {/* 顶栏 */}
      <header className={`${styles.header} ${theme === 'dark' ? styles.headerDark : ''}`}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Image 
              src={SITE_CONFIG.favicon} 
              alt="Logo" 
              width={32} 
              height={32} 
              className="rounded"
              loader={imageLoader}
              unoptimized
            />
            <h1 className={styles.title}>{SITE_CONFIG.title}</h1>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.button}>
              <span className={styles.uploadIcon}></span>
              <span>上传图片</span>
            </button>
            
            <button className={styles.button}>
              <span>图片管理</span>
            </button>
            
            <button
              onClick={() => {
                fetch('/api/logout', { method: 'POST' })
                  .then(() => window.location.href = '/login')
              }}
              className={`${styles.button} ${styles.buttonRed}`}
            >
              <span>退出登录</span>
            </button>
            
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className={styles.button}
            >
              {theme === 'light' ? '🌙' : '☀️'}
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
                <p>上传中...</p>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}></div>
                <p className={styles.uploadText}>点击或拖拽图片到这里上传</p>
              </>
            )}
          </div>
        </div>

        {/* 图片预览网格 */}
        {images.length > 0 && (
          <div className={styles.imageGrid}>
            {images.map((image, index) => (
              <div key={image.fileName} className={styles.imageCard}>
                <div className={styles.imagePreview}>
                  <Image
                    src={image.url}
                    alt={image.originalName}
                    width={300}
                    height={300}
                    loader={imageLoader}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={styles.imageInfo}>
                  <div className={styles.imageHeader}>
                    <h3 className={styles.imageName}>{image.originalName}</h3>
                    <span className={styles.imageSize}>
                      {formatFileSize(image.size)}
                    </span>
                  </div>
                  {['url', 'markdown', 'bbcode'].map((type) => (
                    <div key={type} className={styles.copyGroup}>
                      <input
                        type="text"
                        value={image[type as keyof UploadedFile]}
                        readOnly
                        className={styles.copyInput}
                      />
                      <button
                        onClick={() => copyToClipboard(image[type as keyof UploadedFile] as string, index)}
                        className={styles.copyButton}
                      >
                        {copiedIndex === index ? '已复制' : '复制'}
                      </button>
                    </div>
                  ))}
                  <div className={styles.uploadTime}>
                    上传时间：{new Date(image.uploadTime).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
