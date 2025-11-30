import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getUserModulePermissions } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

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
