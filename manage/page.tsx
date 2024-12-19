'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './manage.module.css'

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
  const [editingName, setEditingName] = useState<{[key: string]: string}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const router = useRouter()

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
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

  // 删除图片
  const handleDelete = async (fileName: string) => {
    if (!confirm('确定要删除这张图片吗？')) return

    try {
      const res = await fetch(`/api/images/${fileName}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('删除失败')
      await fetchImages() // 重新加载图片列表
    } catch (error) {
      console.error('Delete error:', error)
      alert('删除失败')
    }
  }

  // 重命名图片
  const handleRename = async (fileName: string) => {
    const newName = editingName[fileName]
    if (!newName) return

    try {
      const res = await fetch(`/api/images/${fileName}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName })
      })
      if (!res.ok) throw new Error('重命名失败')
      
      setEditingName(prev => {
        const next = { ...prev }
        delete next[fileName]
        return next
      })
      await fetchImages() // 重新加载图片列表
    } catch (error) {
      console.error('Rename error:', error)
      alert('重命名失败')
    }
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
            <button 
              onClick={() => router.push('/')}
              className={styles.button}
            >
              上传图片
            </button>
            
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
        {/* 搜索框 */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="搜索图片..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* 图片网格 */}
        <div className={styles.imageGrid}>
          {filteredImages.map((image, index) => (
            <div key={image.fileName} className={styles.imageCard}>
              <div className={styles.imagePreview}>
                <img
                  src={image.url}
                  alt={image.originalName}
                />
              </div>
              <div className={styles.imageInfo}>
                {editingName[image.fileName] !== undefined ? (
                  <div className={styles.renameGroup}>
                    <input
                      type="text"
                      value={editingName[image.fileName]}
                      onChange={(e) => setEditingName(prev => ({
                        ...prev,
                        [image.fileName]: e.target.value
                      }))}
                      className={styles.renameInput}
                    />
                    <button
                      onClick={() => handleRename(image.fileName)}
                      className={styles.saveButton}
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <div className={styles.nameRow}>
                    <span className={styles.fileName}>{image.originalName}</span>
                    <button
                      onClick={() => setEditingName(prev => ({
                        ...prev,
                        [image.fileName]: image.originalName
                      }))}
                      className={styles.renameButton}
                    >
                      重命名
                    </button>
                  </div>
                )}
                <div className={styles.detailsRow}>
                  <span>{formatDate(image.uploadTime)}</span>
                  <span>{formatFileSize(image.size)}</span>
                  {image.dimensions && (
                    <span>{image.dimensions.width}x{image.dimensions.height}</span>
                  )}
                </div>
                <div className={styles.buttonGroup}>
                  {['markdown', 'bbcode', 'url'].map(type => (
                    <button
                      key={type}
                      onClick={() => copyToClipboard(image[type as keyof ManagedImage] as string, index)}
                      className={styles.copyButton}
                    >
                      {copiedIndex === index ? '已复制' : type.toUpperCase()}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDelete(image.fileName)}
                    className={styles.deleteButton}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
} 