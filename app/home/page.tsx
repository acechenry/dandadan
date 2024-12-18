'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [currentImages, setCurrentImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  // 处理文件上传
  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error('上传失败')
      }

      const data = await res.json()
      setCurrentImages(prev => [...data.files, ...prev])
      setUploadProgress(100)
    } catch (error: unknown) {
      console.error('Upload error:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          alert('上传超时，请重试或减少文件数量')
        } else {
          alert(error.message || '上传失败，请重试')
        }
      } else {
        alert('上传失败，请重试')
      }
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(err => console.error('Failed to copy:', err))
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
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
            
            <button className={styles.button}>
              图片管理
            </button>
            
            <button
              onClick={() => {
                fetch('/api/logout', { method: 'POST' })
                  .then(() => window.location.href = '/login')
              }}
              className={`${styles.button} ${styles.buttonRed}`}
            >
              退出登录
            </button>
            
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
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
                <p>上传中...</p>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${uploadProgress}%` }}
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
