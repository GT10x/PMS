-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'file')),
    attachment_url TEXT,
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    mentions UUID[] DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Reactions Table
CREATE TABLE IF NOT EXISTS chat_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their projects" ON chat_messages
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can insert messages in their projects" ON chat_messages
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for chat_reactions
CREATE POLICY "Users can view reactions" ON chat_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON chat_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions" ON chat_reactions
    FOR DELETE USING (user_id = auth.uid());
