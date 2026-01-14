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

    // Fetch user AND permissions IN PARALLEL (saves 100-200ms)
    const [user, modulePermissions] = await Promise.all([
      getUserById(userId),
      getUserModulePermissions(userId)
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
      modulePermissions,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
