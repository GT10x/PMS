import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getUserModulePermissions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    let userId = cookieStore.get('user_id')?.value;

    // Fallback to header for Capacitor apps where cookies may not persist
    if (!userId) {
      userId = request.headers.get('x-user-id') || undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const modulePermissions = await getUserModulePermissions(userId);

    return NextResponse.json({
      user,
      modulePermissions,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
