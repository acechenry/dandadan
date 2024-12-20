'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './manage.module.css'
import Link from 'next/link'

// 网站标题和图标配置
const SITE_CONFIG = {
  title: "图床服务",
  favicon: "/favicon.ico"
}

// 定义图片类型
interface ManagedImage {
  originalName: string
  fileName: string
  url: string
  markdown: string
  bbcode: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
  uploadTime: string
}

export default function ManagePage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [images, setImages] = useState<ManagedImage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: { width: number, height: number }}>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [favoriteImages, setFavoriteImages] = useState<Set<string>>(new Set())
  const router = useRouter()

  // 初始主题
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') {
        setIsDarkMode(true)
      }
    }
  }, [])

  // 加载图片列表
  useEffect(() => {
    fetchImages()
  }, [])

  // 获取图片列表
  const fetchImages = async () => {
    try {
      const res = await fetch('/api/images')
      if (!res.ok) throw new Error('获取图片列表失败')
      const data = await res.json()
      setImages(data)
    } catch (error) {
      console.error('Failed to fetch images:', error)
      alert('获取图片列表失败')
    }
  }

  // 复制链接
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

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // 过滤图片
  const filteredImages = images.filter(image => 
    image.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 获取图片尺寸
  const getImageDimensions = (url: string, fileName: string) => {
    const img = new window.Image()
    img.onload = () => {
      setImageDimensions(prev => ({
        ...prev,
        [fileName]: { width: img.width, height: img.height }
      }))
    }
    img.src = url
  }

  // 加载图片时获取尺寸
  useEffect(() => {
    if (typeof window !== 'undefined') {
      images.forEach(image => {
        if (!imageDimensions[image.fileName]) {
          getImageDimensions(image.url, image.fileName)
        }
      })
    }
  }, [images])

  // 选择处理函数
  const toggleSelect = (fileName: string) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName)
    } else {
      newSelected.add(fileName)
    }
    setSelectedImages(newSelected)
  }

  const selectAll = () => {
    setSelectedImages(new Set(images.map(img => img.fileName)))
  }

  const deselectAll = () => {
    setSelectedImages(new Set())
  }

  // 批量删除
  const deleteSelected = async () => {
    if (!selectedImages.size) return
    if (!confirm(`确定删除选中的 ${selectedImages.size} 张图片吗？`)) return

    try {
      const promises = Array.from(selectedImages).map(fileName =>
        fetch(`/api/images/${fileName}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      await fetchImages() // 重新加载图片列表
      setSelectedImages(new Set())
    } catch (error) {
      console.error('Failed to delete some images:', error)
      alert('部分图片删除失败')
    }
  }

  // 添加预览函数
  const openPreview = (url: string) => {
    setPreviewImage(url)
  }

  const closePreview = () => {
    setPreviewImage(null)
  }

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
        setFavoriteImages(prev => {
          const next = new Set(prev)
          next.add(fileName)
          return next
        })
      }
    } catch (error) {
      console.error('Favorite error:', error)
      alert('操作失败')
    }
  }

  // 在现有的 useEffect 钩子之后添加
  useEffect(() => {
    // 获取收藏列表
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites')
        if (!res.ok) throw new Error('获取收藏列表失败')
        const data = await res.json()
        const fileNames: string[] = data.map((item: { Key: string }) => 
          item.Key.replace('favorites/', '')
        )
        setFavoriteImages(new Set(fileNames))
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
            <Link 
              href="/home"
              className={styles.button}
            >
              上传图片
            </Link>
            
            <button className={`${styles.button} ${styles.highlight}`}>
              图片管理
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
                if (typeof window !== 'undefined') {
                  localStorage.setItem('theme', newTheme ? 'dark' : 'light')
                }
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
        {/* 总体预览模块 */}
        <div className={styles.previewArea}>
          <div className={styles.controlBar}>
            {/* 左侧选择按钮组 */}
            <div className={styles.selectionButtons}>
              <button onClick={selectAll} className={styles.selectButton}>
                全选
              </button>
              <button onClick={deselectAll} className={styles.selectButton}>
                不选
              </button>
              <button 
                onClick={() => {
                  const allFileNames = images.map(img => img.fileName)
                  const newSelected = new Set(
                    allFileNames.filter(fileName => !selectedImages.has(fileName))
                  )
                  setSelectedImages(newSelected)
                }} 
                className={styles.selectButton}
              >
                反选
              </button>
              {selectedImages.size > 0 && (
                <button onClick={deleteSelected} className={styles.deleteSelectedButton}>
                  删除选中 ({selectedImages.size})
                </button>
              )}
            </div>

            {/* 右侧搜索框 */}
            <div className={styles.searchGroup}>
              <input
                type="text"
                placeholder="搜��图片..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <button className={styles.searchButton}>
                搜索
              </button>
            </div>
          </div>

          {/* 图片网格 */}
          <div className={styles.imageGrid}>
            {filteredImages.map((image, index) => (
              <div key={image.fileName} className={styles.imageCard}>
                <div className={styles.imagePreview} onClick={() => openPreview(image.url)}>
                  <img src={image.url} alt={image.originalName} />
                </div>
                <div className={styles.imageInfo}>
                  <div className={styles.fileName}>{image.originalName}</div>
                  <div className={styles.detailsGroup}>
                    <div className={styles.detailItem}>
                      <span>上传时间：</span>
                      <span>{formatDate(image.uploadTime)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span>文件大小：</span>
                      <span>{formatFileSize(image.size)}</span>
                    </div>
                    {imageDimensions[image.fileName] && (
                      <div className={styles.detailItem}>
                        <span>图片尺寸：</span>
                        <span>
                          {imageDimensions[image.fileName].width}x{imageDimensions[image.fileName].height}
                        </span>
                      </div>
                    )}
                  </div>
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
                      onClick={() => toggleFavorite(image.fileName)}
                      className={`${styles.copyButton} ${favoriteImages.has(image.fileName) ? styles.favoriteActive : styles.favorite}`}
                    >
                      {favoriteImages.has(image.fileName) ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
                <div className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.fileName)}
                    onChange={() => toggleSelect(image.fileName)}
                    className={styles.imageCheckbox}
                  />
                </div>
              </div>
            ))}
          </div>
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
