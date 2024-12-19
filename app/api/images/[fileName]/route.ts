import { NextResponse } from 'next/server'
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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

export async function PATCH(
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
    const { newName } = await request.json()
    if (!newName) {
      return NextResponse.json(
        { success: false, message: '新文件名不能为空' },
        { status: 400 }
      )
    }

    // 生成新的文件名（保持时间戳-随机字符格式）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = newName.split('.').pop() || params.fileName.split('.').pop()
    const newFileName = `${timestamp}-${randomStr}.${ext}`

    // 复制文件
    await s3Client.send(new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      CopySource: `${process.env.S3_BUCKET_NAME}/${params.fileName}`,
      Key: newFileName,
      ACL: 'public-read',
      MetadataDirective: 'REPLACE',
      Metadata: {
        'original-name': newName,
        'upload-time': new Date().toISOString()
      }
    }))

    // 删除原文件
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: params.fileName
    }))

    return NextResponse.json({
      success: true,
      message: '重命名成功',
      newFileName
    })

  } catch (error) {
    console.error('Rename error:', error)
    return NextResponse.json(
      { success: false, message: '重命名失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { fileName: string } }
) {
  // 验证登录状态
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
        Key: params.fileName
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { success: false, message: '删除失败' },
      { status: 500 }
    )
  }
} 
