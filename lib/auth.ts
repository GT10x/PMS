// @ts-nocheck
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';
import { User } from './types';

/**
 * Authenticate user with username/password or email/password
 * Admin users use email, regular users use username
 */
export async function authenticateUser(
  identifier: string,  // username or email
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if identifier is email (contains @)
    const isEmail = identifier.includes('@');

    let query = supabaseAdmin.from('user_profiles').select('*');

    if (isEmail) {
      query = query.eq('email', identifier);
    } else {
      query = query.eq('username', identifier);
    }

    const { data: users, error } = await query;

    if (error) {
      return { success: false, error: 'Database error' };
    }

    if (!users || users.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user: any = users[0];

    // Verify password
    if (!user.password_hash) {
      return { success: false, error: 'Invalid credentials' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;

    return { success: true, user: userWithoutPassword as User };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const user: any = data;
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get user's module permissions
 */
export async function getUserModulePermissions(userId: string): Promise<string[]> {
  try {
    // Check if user is admin
    const user = await getUserById(userId);
    if (user?.is_admin) {
      // Admin has access to all modules
      return ['all'];
    }

    const { data, error } = await supabaseAdmin
      .from('user_module_permissions')
      .select('module_name')
      .eq('user_id', userId)
      .eq('has_access', true);

    if (error || !data) {
      return [];
    }

    return data.map((permission: any) => permission.module_name);
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Create new user (admin only)
 */
export async function createUser(userData: {
  username?: string;
  email?: string;
  password: string;
  full_name: string;
  role: User['role'];
  is_admin?: boolean;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const passwordHash = await hashPassword(userData.password);

    // @ts-ignore - Supabase types are too strict
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert([
        {
          username: userData.username || null,
          email: userData.email || null,
          password_hash: passwordHash,
          full_name: userData.full_name,
          role: userData.role,
          is_admin: userData.is_admin || false,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const result: any = data;
    const { password_hash, ...userWithoutPassword } = result;
    return { success: true, user: userWithoutPassword as User };
  } catch (error: any) {
    console.error('Create user error:', error);
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

/**
 * Update user (admin only)
 */
export async function updateUser(
  userId: string,
  updates: {
    full_name?: string;
    role?: User['role'];
    password?: string;
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const updateData: any = {};

    if (updates.full_name) {
      updateData.full_name = updates.full_name;
    }

    if (updates.role) {
      updateData.role = updates.role;
    }

    if (updates.password) {
      updateData.password_hash = await hashPassword(updates.password);
    }

    // @ts-ignore - Supabase types are too strict
    const { data, error} = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const result: any = data;
    const { password_hash, ...userWithoutPassword } = result;
    return { success: true, user: userWithoutPassword as User };
  } catch (error: any) {
    console.error('Update user error:', error);
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('user_profiles').delete().eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}

/**
 * Update user module permissions (admin only)
 */
export async function updateUserModulePermissions(
  userId: string,
  moduleNames: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing permissions
    await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);

    // Insert new permissions
    if (moduleNames.length > 0) {
      const permissions = moduleNames.map((moduleName) => ({
        user_id: userId,
        module_name: moduleName,
        has_access: true,
      }));

      const { error } = await supabaseAdmin.from('user_module_permissions').insert(permissions);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update permissions error:', error);
    return { success: false, error: error.message || 'Failed to update permissions' };
  }
}
