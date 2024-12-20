import { NextResponse } from 'next/server'
import { 
  S3Client, 
  CopyObjectCommand, 
  ListObjectsV2Command 
} from '@aws-sdk/client-s3'
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

// 添加到收藏
export async function POST(request: Request) {
  const cookieStore = cookies()
  const auth = cookieStore.get('auth')
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    )
  }

  try {
    const { fileName } = await request.json()
    const newKey = `favorites/${fileName}`

    await s3Client.send(
      new CopyObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        CopySource: `${process.env.S3_BUCKET_NAME}/${fileName}`,
        Key: newKey,
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Add to favorites error:', error)
    return NextResponse.json(
      { success: false, message: '添加收藏失败' },
      { status: 500 }
    )
  }
}

// 获取收藏列表
export async function GET(request: Request) {
  const cookieStore = cookies()
  const auth = cookieStore.get('auth')
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    )
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'favorites/'
    })

    const response = await s3Client.send(command)
    const files = response.Contents || []

    return NextResponse.json(files)
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { success: false, message: '获取收藏失败' },
      { status: 500 }
    )
  }
} 
