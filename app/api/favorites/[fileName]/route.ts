import { NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { cookies } from 'next/headers'

const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
})

export async function DELETE(
  request: Request,
  { params }: { params: { fileName: string } }
) {
  const cookieStore = cookies()
  const auth = cookieStore.get('auth')
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    )
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `favorites/${params.fileName}`
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove from favorites error:', error)
    return NextResponse.json(
      { success: false, message: '取消收藏失败' },
      { status: 500 }
    )
  }
} 