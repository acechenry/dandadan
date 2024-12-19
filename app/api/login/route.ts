import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface LoginRequest {
  password: string
}

export async function POST(request: NextRequest) {
  console.log('Login API called')
  
  try {
    const data = await request.json()
    const receivedPassword = data.password
    const expectedPassword = process.env.ACCESS_PASSWORD
    
    if (!expectedPassword) {
      console.error('ACCESS_PASSWORD not configured')
      return NextResponse.json(
        { success: false, message: '服务器配置错误' },
        { status: 500 }
      )
    }
    
    console.log('Password verification:', {
      receivedLength: receivedPassword?.length,
      expectedLength: expectedPassword?.length,
      isMatch: receivedPassword === expectedPassword
    })
    
    if (receivedPassword === expectedPassword) {
      console.log('Password correct, setting cookie')
      
      // 创建响应对象
      const response = NextResponse.json({ 
        success: true,
        message: '登录成功'
      })
      
      // 在响应对象上设置 cookie
      response.cookies.set('auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      })
      
      console.log('Cookie set successfully')
      return response
    }
    
    console.log('Password incorrect')
    return NextResponse.json(
      { success: false, message: '密码错误' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
} 
