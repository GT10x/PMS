import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Test if project_roles column exists
    const { error: testError } = await supabase
      .from('project_members')
      .select('project_roles')
      .limit(1);

    if (testError && testError.message.includes('project_roles')) {
      return NextResponse.json({
        error: 'Column does not exist. Please run in Supabase SQL Editor: ALTER TABLE project_members ADD COLUMN project_roles text[] DEFAULT ARRAY[]::text[];',
        needsManualMigration: true
      }, { status: 400 });
    }

    return NextResponse.json({
      message: 'project_roles column exists',
      success: true
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
