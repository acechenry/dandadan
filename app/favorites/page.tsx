'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from './favorites.module.css'

// 网站标题和图标配置
const SITE_CONFIG = {
  title: "我的收藏",
  favicon: "/favicon.ico"
}

// 定义图片类型
interface FavoriteImage {
  Key: string;
  originalName: string
  fileName: string
  url: string
  markdown: string
  bbcode: string
  size: number
  uploadTime: string
}

export default function FavoritesPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [images, setImages] = useState<FavoriteImage[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const router = useRouter()

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    }
  }, [])

  // 加载收藏列表
  useEffect(() => {
    fetchFavorites()
  }, [])

  // 获取收藏列表
  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites')
      if (!res.ok) throw new Error('获取收藏列表失败')
      const data = await res.json()
      const files = data.map((item: { Key: string }) => ({
        originalName: item.Key.split('/').pop() || '',
        fileName: item.Key.replace('favorites/', ''),
        url: `${process.env.NEXT_PUBLIC_CDN_URL}/${item.Key}`,
        markdown: `![${item.Key.split('/').pop()}](${process.env.NEXT_PUBLIC_CDN_URL}/${item.Key})`,
        bbcode: `[img]${process.env.NEXT_PUBLIC_CDN_URL}/${item.Key}[/img]`,
        size: 0,  // 这个信息可能需要从 S3 元数据中获取
        uploadTime: new Date().toISOString()  // 这个信息也可能需要从 S3 元数据中获取
      }))
      setImages(files)
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
      alert('获取收藏列表失败')
    }
  }

  // 复制链接
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      })
      .catch(() => {})
  }

  // 取消收藏
  const removeFavorite = async (fileName: string) => {
    try {
      const res = await fetch(`/api/favorites/${fileName}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('取消收藏失败')
      await fetchFavorites()
    } catch (error) {
      console.error('Remove favorite error:', error)
      alert('取消收藏失败')
    }
  }

  // 预览相关函数
  const openPreview = (url: string) => {
    setPreviewImage(url)
  }

  const closePreview = () => {
    setPreviewImage(null)
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
            <Link 
              href="/home"
              className={styles.button}
            >
              上传图片
            </Link>
            
            <Link 
              href="/manage"
              className={styles.button}
            >
              图片管理
            </Link>
            
            <button className={`${styles.button} ${styles.highlight}`}>
              我的收藏
            </button>
            
            <button
              onClick={() => {
                fetch('/api/logout', { method: 'POST' })
                  .then(() => router.push('/login'))
              }}
              className={styles.button}
            >
              退出登录
            </button>
            
            <button
              onClick={() => {
                const newTheme = !isDarkMode
                setIsDarkMode(newTheme)
                localStorage.setItem('theme', newTheme ? 'dark' : 'light')
              }}
              className={styles.button}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className={styles.main}>
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div key={image.fileName} className={styles.imageCard}>
              <div className={styles.imagePreview} onClick={() => openPreview(image.url)}>
                <img src={image.url} alt={image.originalName} />
              </div>
              <div className={styles.imageInfo}>
                <div className={styles.fileName}>{image.originalName}</div>
                <div className={styles.buttonGroup}>
                  <button
                    onClick={() => copyToClipboard(image.markdown, index)}
                    className={`${styles.copyButton} ${styles.markdownButton}`}
                  >
                    {copiedIndex === index ? '已复制' : 'MD'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(image.url, index)}
                    className={`${styles.copyButton} ${styles.urlButton}`}
                  >
                    {copiedIndex === index ? '已复制' : 'URL'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(image.bbcode, index)}
                    className={`${styles.copyButton} ${styles.bbcodeButton}`}
                  >
                    {copiedIndex === index ? '已复制' : 'BB'}
                  </button>
                  <button
                    onClick={() => removeFavorite(image.fileName)}
                    className={`${styles.copyButton} ${styles.removeButton}`}
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 预览模态框 */}
      {previewImage && (
        <div className={styles.previewModal} onClick={closePreview}>
          <div className={styles.previewContent}>
            <img src={previewImage} alt="Preview" />
            <button 
              className={styles.closeButton}
              onClick={closePreview}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 
