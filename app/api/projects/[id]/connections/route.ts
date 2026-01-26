import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

// GET /api/projects/[id]/connections - Get all connections for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const { data: connections, error } = await (supabaseAdmin as any)
      .from('entity_connections')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    return NextResponse.json({ connections: connections || [] });
  } catch (error) {
    console.error('Error in GET connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/connections - Create a new connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { source_type, source_id, target_type, target_id } = body;

    // Validate required fields
    if (!source_type || !source_id || !target_type || !target_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prevent self-connections
    if (source_type === target_type && source_id === target_id) {
      return NextResponse.json(
        { error: 'Cannot connect an entity to itself' },
        { status: 400 }
      );
    }

    // Create the connection
    const { data: connection, error } = await (supabaseAdmin as any)
      .from('entity_connections')
      .insert({
        project_id: projectId,
        source_type,
        source_id,
        target_type,
        target_id,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Connection already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating connection:', error);
      return NextResponse.json(
        { error: 'Failed to create connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error in POST connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/connections - Delete a connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    // Alternative: delete by source/target
    const sourceType = searchParams.get('source_type');
    const sourceId = searchParams.get('source_id');
    const targetType = searchParams.get('target_type');
    const targetId = searchParams.get('target_id');

    if (connectionId) {
      const { error } = await (supabaseAdmin as any)
        .from('entity_connections')
        .delete()
        .eq('id', connectionId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error deleting connection:', error);
        return NextResponse.json(
          { error: 'Failed to delete connection' },
          { status: 500 }
        );
      }
    } else if (sourceType && sourceId && targetType && targetId) {
      const { error } = await (supabaseAdmin as any)
        .from('entity_connections')
        .delete()
        .eq('project_id', projectId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        console.error('Error deleting connection:', error);
        return NextResponse.json(
          { error: 'Failed to delete connection' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either connectionId or source/target params required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/connections - Bulk update connections for an entity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { source_type, source_id, connections } = body;

    // connections is an array of { target_type, target_id }

    if (!source_type || !source_id || !Array.isArray(connections)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Delete all existing connections from this source
    await (supabaseAdmin as any)
      .from('entity_connections')
      .delete()
      .eq('project_id', projectId)
      .eq('source_type', source_type)
      .eq('source_id', source_id);

    // Create new connections
    if (connections.length > 0) {
      const newConnections = connections
        .filter((c: any) => !(c.target_type === source_type && c.target_id === source_id))
        .map((c: any) => ({
          project_id: projectId,
          source_type,
          source_id,
          target_type: c.target_type,
          target_id: c.target_id,
          created_by: userId
        }));

      if (newConnections.length > 0) {
        const { error } = await (supabaseAdmin as any)
          .from('entity_connections')
          .insert(newConnections);

        if (error) {
          console.error('Error creating connections:', error);
          return NextResponse.json(
            { error: 'Failed to update connections' },
            { status: 500 }
          );
        }
      }
    }

    // Fetch and return updated connections
    const { data: updatedConnections } = await (supabaseAdmin as any)
      .from('entity_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('source_type', source_type)
      .eq('source_id', source_id);

    return NextResponse.json({ connections: updatedConnections || [] });
  } catch (error) {
    console.error('Error in PUT connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
