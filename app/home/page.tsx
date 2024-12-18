'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'     //
import styles from './home.module.css'    //
import { VirtualList } from 'react-tiny-virtual-list'

// 网站标题
const SITE_TITLE = "图床服务"

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
  files?: Array<{
    originalName: string
    fileName: string
    url: string
    markdown: string
    bbcode: string
    size: number
    type: string
    uploadTime: string
  }>
  message?: string
  error?: string
}

export default function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [images, setImages] = useState<UploadedFile[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

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
          throw new Error(`文件 ${file.name} 超过5MB限制`)
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

  // 使用 useMemo 优化列表渲染
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => 
      new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime()
    )
  }, [images])

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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">图床</h1>
          <button
            onClick={() => {
              fetch('/api/logout', { method: 'POST' })
                .then(() => window.location.href = '/login')
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            退出登录
          </button>
        </header>

        <main className="space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl mb-4">上传图片</h2>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {isUploading ? (
                <div className="space-y-2">
                  <p className="text-gray-400">上传中...</p>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">点击或拖拽图片到这里上传</p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {images.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl mb-4">已上传的图片</h2>
              <div className="space-y-4">
                {sortedImages.map((image, index) => (
                  <div key={image.fileName} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={image.url}
                          alt={image.originalName}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-grow space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">{image.originalName}</h3>
                          <span className="text-sm text-gray-400">
                            {formatFileSize(image.size)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={image.url}
                              readOnly
                              className="flex-grow bg-gray-600 rounded px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(image.url, index)}
                              className="px-2 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                            >
                              {copiedIndex === index ? '已复制' : '复制链接'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={image.markdown}
                              readOnly
                              className="flex-grow bg-gray-600 rounded px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(image.markdown, index)}
                              className="px-2 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                            >
                              {copiedIndex === index ? '已复制' : '复制 Markdown'}
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          上传时间：{new Date(image.uploadTime).toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleDeleteImage(image.fileName)}
                          className="px-2 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
