'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from './home.module.css'
import { processFiles } from '@/demo/imageProcessor/imageProcessor'

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

interface ImageProcessingSettings {
  enableCompression: boolean
  enableWebP: boolean
}

export default function HomePage() {
  // 主题相关
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // 上传相关
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 预览相关
  const [currentImages, setCurrentImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  // 导航相关
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // 设置相关
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ImageProcessingSettings>(() => {
    // 从 localStorage 读取用户的偏好设置
    const savedSettings = localStorage.getItem('imageProcessingSettings')
    return savedSettings ? JSON.parse(savedSettings) : {
      enableCompression: false,
      enableWebP: false
    }
  })

  // 保存设置
  const saveSettings = (newSettings: ImageProcessingSettings) => {
    setSettings(newSettings)
    localStorage.setItem('imageProcessingSettings', JSON.stringify(newSettings))
  }

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

  // 修改上传处理函数
  const handleUpload = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    setProcessProgress(0)
    
    try {
      // 直接处理图片，不做大小限制
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
        setTimeout(() => reject(new Error('上传超时')), UPLOAD_TIMEOUT)
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

  // 添加收藏���态
  const [favoriteImages, setFavoriteImages] = useState<Set<string>>(new Set())

  // 添加收藏函数
  const toggleFavorite = async (fileName: string) => {
    try {
      if (favoriteImages.has(fileName)) {
        const res = await fetch(`/api/favorites/${fileName}`, {
          method: 'DELETE'
        })
        if (!res.ok) throw new Error('取消收藏失败')
        setFavoriteImages(prev => {
          const next = new Set(prev)
          next.delete(fileName)
          return next
        })
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName })
        })
        if (!res.ok) throw new Error('添加收藏失败')
        setFavoriteImages(prev => new Set([...prev, fileName]))
      }
    } catch (error) {
      console.error('Favorite error:', error)
      alert('操作失败')
    }
  }

  // 添加初始化收藏列表的 useEffect
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites')
        if (!res.ok) throw new Error('获取收藏列表失败')
        const data = await res.json()
        const favoriteFileNames = new Set(
          data.map((item: any) => item.Key.replace('favorites/', ''))
        )
        setFavoriteImages(favoriteFileNames)
      } catch (error) {
        console.error('Failed to fetch favorites:', error)
      }
    }

    fetchFavorites()
  }, [])

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
            
            <Link 
              href="/settings"
              className={styles.button}
            >
              上传设置
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
          <button 
            className={styles.settingsButton}
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
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
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => toggleFavorite(image.fileName)}
                      className={`${styles.copyButton} ${favoriteImages.has(image.fileName) ? styles.favoriteActive : styles.favorite}`}
                    >
                      {favoriteImages.has(image.fileName) ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 设置面板 */}
        {showSettings && (
          <div className={styles.settingsPanel}>
            <h3>图片处理设置</h3>
            <div className={styles.settingItem}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableCompression}
                  onChange={(e) => saveSettings({
                    ...settings,
                    enableCompression: e.target.checked
                  })}
                />
                启用图片压缩（推荐用于大图片）
              </label>
            </div>
            <div className={styles.settingItem}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableWebP}
                  onChange={(e) => saveSettings({
                    ...settings,
                    enableWebP: e.target.checked
                  })}
                />
                转换为 WebP 格式（可能低兼容性）
              </label>
            </div>
            <button onClick={() => setShowSettings(false)}>
              关闭
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
