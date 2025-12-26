# Int-Video PMS Integration Instructions

## Overview
This integration enables automatic two-way communication between int-video and PMS (Project Management System) for version tracking and tester feedback.

## Files Added to Int-Video
1. `scripts/pms-integration.js` - Main integration script
2. `release-notes-template.json` - Template for version release notes

## Environment Setup
Ensure `.env.local` has:
```
PMS_API_KEY=pms_e4e5a84ae1f16e84790a5c7f794512e275834ce8
```

## How to Push a New Version to PMS

### Option 1: Simple Push
```bash
node scripts/pms-integration.js push --version 2.0.5 --title "Bug Fixes & Features"
```

### Option 2: Detailed Push with Release Notes File
1. Create a `release-notes.json` file (see template):
```json
{
  "release_title": "Response Page Enhancements & Bug Fixes",
  "release_summary": "Major improvements including Excel export, inline media players...",
  "changes": [
    { "type": "feature", "title": "Excel Export", "description": "Download responses to CSV" },
    { "type": "fix", "title": "Contact Form Display", "description": "Shows all fields now" }
  ],
  "known_issues": [
    { "description": "Some older audio may show no URL", "severity": "low" }
  ],
  "test_cases": [
    {
      "title": "Test Excel Export",
      "description": "Verify export works",
      "steps": ["Go to campaign", "Click Export", "Verify file downloads"]
    }
  ]
}
```

2. Push with the file:
```bash
node scripts/pms-integration.js push --version 2.0.5 --changes-file release-notes.json
```

## Checking Status (Are there rebuild requests?)
```bash
node scripts/pms-integration.js status
```

This will show:
- Current version status
- Whether a rebuild is requested
- Rebuild notes from tester

## Getting Detailed Feedback
```bash
node scripts/pms-integration.js feedback
```

Shows:
- Test results (passed/failed/pending)
- Tester notes for each test case
- Overall summary

## Automatic Workflow

### After Deployment:
1. Run: `node scripts/pms-integration.js push --version X.X.X --changes-file release-notes.json`
2. PMS will show the version for testers at: https://pms.globaltechtrums.com

### Tester Flow:
1. Tester opens version detail page in PMS
2. Tests each test case
3. Enters notes, uploads screenshots
4. Sets status (passed/failed)
5. If issues found: clicks "Request Rebuild" with notes

### After Rebuild Request:
1. Run: `node scripts/pms-integration.js status` to see rebuild notes
2. Fix the issues
3. Run: `node scripts/pms-integration.js push --version X.X.X` (same version) to update
4. Tester will see "testing" status again and re-test

### When All Tests Pass:
1. Tester clicks "Approve & Release"
2. Version status becomes "released"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/register-version` | POST | Push new version |
| `/api/integrations/register-version` | GET | Check status |
| `/api/integrations/version-feedback/{id}` | GET | Get feedback |

## Webhook Support (Optional)
Add webhook URL to receive instant notifications when tester requests rebuild:

```bash
node scripts/pms-integration.js push --version 2.0.5 --webhook-url https://your-server.com/webhook
```

PMS will POST to this URL when rebuild is requested:
```json
{
  "event": "rebuild_requested",
  "version_number": "2.0.5",
  "notes": "Tester's feedback here",
  "feedback_url": "https://pms.globaltechtrums.com/api/integrations/version-feedback/{id}"
}
```
