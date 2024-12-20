export interface ImageProcessingSettings {
  enableCompression: boolean
  enableWebP: boolean
}

export interface UploadedFile {
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

export interface FavoriteImage extends UploadedFile {
  isFavorite?: boolean
} 