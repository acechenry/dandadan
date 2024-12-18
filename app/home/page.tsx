'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './page.module.css'

// 网站标题和图标配置
const SITE_CONFIG = {
  title: "图床服务",
  favicon: "/favicon.ico"
}

// 保持原有的接口定义...
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

interface UploadResponse {
  success: boolean
  files?: UploadedFile[]
  message?: string
  error?: string
}

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [images, setImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 保持原有的功能函数...

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
              className="hidden"
            />
            {isUploading ? (
              <div className="space-y-3">
                <p className="text-white">上传中...</p>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}></div>
                <p className="text-white">点击或拖拽图片到这里上传</p>
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
                  <img
                    src={image.url}
                    alt={image.originalName}
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
