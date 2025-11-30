import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, getUserModulePermissions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(identifier, password);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get user's module permissions
    const modulePermissions = await getUserModulePermissions(result.user.id);

    // Set session cookie (in production, use a proper session token with encryption)
    const cookieStore = await cookies();
    cookieStore.set('user_id', result.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      modulePermissions,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
