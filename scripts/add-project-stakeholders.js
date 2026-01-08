const fs = require('fs');
const path = require('path');

// 1. Update project API to handle stakeholders
console.log('Updating project API...');
const apiPath = path.join(__dirname, '../app/api/projects/[id]/route.ts');
let api = fs.readFileSync(apiPath, 'utf8');

// Add stakeholders to destructuring
api = api.replace(
  'const { name, description, status, priority, start_date, team_members, webhook_url, deploy_url } = body;',
  'const { name, description, status, priority, start_date, team_members, webhook_url, deploy_url, stakeholders } = body;'
);

// Add stakeholders to updateData
api = api.replace(
  'if (deploy_url !== undefined) updateData.deploy_url = deploy_url;',
  `if (deploy_url !== undefined) updateData.deploy_url = deploy_url;
    if (stakeholders !== undefined) updateData.stakeholders = stakeholders;`
);

fs.writeFileSync(apiPath, api, 'utf8');
console.log('✓ Updated project API');

// 2. Update project settings page with stakeholders management
console.log('\\nUpdating project settings page...');
const settingsPath = path.join(__dirname, '../app/dashboard/project/[id]/settings/page.tsx');
let settings = fs.readFileSync(settingsPath, 'utf8');

// Update Project interface
settings = settings.replace(
  `interface Project {
  id: string;
  name: string;
  description: string;
  api_key: string;
  webhook_url: string;
  webhook_secret: string;
  deploy_url: string;
}`,
  `interface Project {
  id: string;
  name: string;
  description: string;
  api_key: string;
  webhook_url: string;
  webhook_secret: string;
  deploy_url: string;
  stakeholders: string[];
}`
);

// Add stakeholders state after webhookUrl state
settings = settings.replace(
  "const [webhookUrl, setWebhookUrl] = useState('');",
  `const [webhookUrl, setWebhookUrl] = useState('');
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [newStakeholder, setNewStakeholder] = useState('');`
);

// Add stakeholders initialization in fetchProject
settings = settings.replace(
  "setWebhookUrl(data.project.webhook_url || '');",
  `setWebhookUrl(data.project.webhook_url || '');
        setStakeholders(data.project.stakeholders || []);`
);

// Update saveSettings to include stakeholders
settings = settings.replace(
  "body: JSON.stringify({ webhook_url: webhookUrl })",
  "body: JSON.stringify({ webhook_url: webhookUrl, stakeholders })"
);

// Add stakeholders section after Webhook Configuration section
const stakeholdersSection = `
        {/* Stakeholders Section */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            <i className="fas fa-users mr-2 text-indigo-500"></i>
            Stakeholders
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add key stakeholders for this project (clients, managers, decision makers).
          </p>

          {/* Stakeholder List */}
          <div className="space-y-2 mb-4">
            {stakeholders.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No stakeholders added yet</p>
            ) : (
              stakeholders.map((stakeholder, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-indigo-600 dark:text-indigo-400 text-sm"></i>
                    </div>
                    <span className="text-gray-900 dark:text-white">{stakeholder}</span>
                  </div>
                  <button
                    onClick={() => setStakeholders(stakeholders.filter((_, i) => i !== idx))}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Stakeholder Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newStakeholder}
              onChange={(e) => setNewStakeholder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newStakeholder.trim()) {
                  setStakeholders([...stakeholders, newStakeholder.trim()]);
                  setNewStakeholder('');
                }
              }}
              placeholder="Enter stakeholder name..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => {
                if (newStakeholder.trim()) {
                  setStakeholders([...stakeholders, newStakeholder.trim()]);
                  setNewStakeholder('');
                }
              }}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
            >
              <i className="fas fa-plus mr-2"></i>
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter or click Add to add a stakeholder. Don't forget to save settings.
          </p>
        </div>
`;

// Insert stakeholders section before closing </div> of space-y-6
settings = settings.replace(
  `        {/* Webhook Configuration Section */}`,
  `        {/* Stakeholders Section */}${stakeholdersSection}

        {/* Webhook Configuration Section */}`
);

// Actually, let me insert it after webhook section instead
// Remove the previous insert and do it properly
settings = settings.replace(
  `        {/* Stakeholders Section */}${stakeholdersSection}\n\n        {/* Webhook Configuration Section */}`,
  `        {/* Webhook Configuration Section */}`
);

// Insert after the webhook section's closing </div>
settings = settings.replace(
  `          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}`,
  `          </div>
        </div>
${stakeholdersSection}
      </div>
    </DashboardLayout>
  );
}`
);

fs.writeFileSync(settingsPath, settings, 'utf8');
console.log('✓ Updated project settings page with stakeholders UI');

// 3. Create migration SQL
console.log('\\nCreating migration SQL...');
const migrationSQL = `-- Add stakeholders column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stakeholders TEXT[] DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'stakeholders';
`;

const migrationPath = path.join(__dirname, '../migrations/add-project-stakeholders.sql');
fs.writeFileSync(migrationPath, migrationSQL, 'utf8');
console.log('✓ Created migration SQL at migrations/add-project-stakeholders.sql');

console.log('\\n✅ Stakeholders feature added!');
console.log('\\n⚠️  Run this SQL in Supabase Dashboard:');
console.log('--------------------------------------------');
console.log(migrationSQL);
console.log('--------------------------------------------');
