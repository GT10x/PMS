import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // First check if table exists
    const { error: checkError } = await supabase
      .from('report_replies')
      .select('id')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: 'Table already exists', success: true });
    }

    // Table doesn't exist, try to create it using raw SQL via rpc
    // Note: This requires an exec_sql function to be created in Supabase
    const sql = `
      CREATE TABLE IF NOT EXISTS report_replies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Try using the postgrest-js query builder to create table
    // This typically doesn't work for DDL, but let's try
    const { error: createError } = await supabase.rpc('exec_sql', { sql });

    if (createError) {
      return NextResponse.json({
        error: 'Could not auto-create table. Please run SQL manually.',
        sql: sql,
        supabase_url: 'https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new'
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Table created successfully', success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if table exists
    const { data, error } = await supabase
      .from('report_replies')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      return NextResponse.json({
        exists: false,
        message: 'Table does not exist. POST to this endpoint to create it.',
        manual_url: 'https://supabase.com/dashboard/project/loihxoyrutbzmqscdknk/sql/new'
      });
    }

    return NextResponse.json({
      exists: true,
      message: 'Table exists and is ready to use'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
