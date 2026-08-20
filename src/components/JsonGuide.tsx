import React, { useState } from 'react';
import { X, Copy, Check, FileJson, AlertTriangle, Info } from 'lucide-react';

interface JsonGuideProps {
  onClose: () => void;
}

export function JsonGuide({ onClose }: JsonGuideProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const sampleJson = `{
  "projects": [
    {
      "id": "proj_123",
      "name": "Website Redesign",
      "createdAt": 1710928371000,
      "workflowColumns": [
        { "id": "todo", "title": "Backlog" },
        { "id": "in-progress", "title": "Under Review" },
        { "id": "done", "title": "Done" }
      ]
    }
  ],
  "sprints": [
    {
      "id": "sprint_456",
      "projectId": "proj_123",
      "name": "Sprint 1",
      "startDate": "2026-03-20",
      "endDate": "2026-04-03",
      "length": "2-weeks",
      "status": "active"
    }
  ],
  "labels": [
    {
      "id": "label_1",
      "name": "Feature",
      "color": "bg-indigo-500"
    }
  ],
  "workflowColumns": [
    { "id": "todo", "title": "Backlog" },
    { "id": "in-progress", "title": "Under Review" },
    { "id": "done", "title": "Done" }
  ],
  "goals": [
    {
      "id": "goal_789",
      "number": 1,
      "projectId": "proj_123",
      "sprintId": "sprint_456",
      "parentId": "goal_000",
      "labelIds": ["label_1"],
      "title": "Design Homepage",
      "description": "Create wireframes and high-fidelity mockups.",
      "status": "in-progress",
      "lifecycleStatus": "active",
      "priority": "high",
      "category": "Design",
      "createdAt": 1710928371000,
      "startDate": 1710928371000,
      "dueDate": 1712102400000,
      "plannedForToday": true,
      "successMetric": {
        "type": "checklist",
        "items": [
          { "id": "chk_1", "text": "Wireframes", "completed": true },
          { "id": "chk_2", "text": "Mockups", "completed": false }
        ]
      },
      "activities": [
        {
          "id": "act_1",
          "goalId": "goal_789",
          "type": "created",
          "actor": "You",
          "timestamp": 1710928371000,
          "message": "Created this goal"
        },
        {
          "id": "act_2",
          "goalId": "goal_789",
          "type": "status_changed",
          "actor": "You",
          "timestamp": 1711000000000,
          "from": "Backlog",
          "to": "In Progress"
        }
      ],
      "comments": [
        {
          "id": "cmt_1",
          "goalId": "goal_789",
          "actor": "You",
          "content": "Wireframes are ready for review.",
          "createdAt": 1711000500000
        }
      ]
    }
  ]
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <FileJson size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">JSON Export Guide</h2>
            <p className="text-sm text-slate-500 font-medium">Understand and edit your workspace data safely.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
        >
          <X size={24} />
        </button>
      </header>

      <main className="px-8 py-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Intro */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Overview</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            KanbanGXP exports your entire workspace as a single JSON object containing five main arrays: <code>projects</code>, <code>sprints</code>, <code>labels</code>, <code>workflowColumns</code>, and <code>goals</code>. 
            This format is designed to be easily readable by humans and AI tools. You can export your data, modify it externally, and import it back.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Important:</strong> Importing JSON completely replaces your current workspace. Always keep a backup of your original export before importing modified data.
            </div>
          </div>
        </section>

        {/* Sample JSON */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Sample Structure</h3>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
            {sampleJson}
          </pre>
        </section>

        {/* Schema Details */}
        <section className="space-y-6">
          <h3 className="text-xl font-black text-slate-900">Data Schema</h3>
          
          {/* Projects */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">Projects Array</h4>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm">
                <li><code className="text-indigo-600 font-bold">id</code> (string, required): Unique identifier (e.g., UUID or custom string). Do not change existing IDs to maintain relationships.</li>
                <li><code className="text-indigo-600 font-bold">name</code> (string, required): The display name of the project.</li>
                <li><code className="text-indigo-600 font-bold">createdAt</code> (number, required): Unix timestamp in milliseconds.</li>
                <li><code className="text-indigo-600 font-bold">workflowColumns</code> (array, required): Ordered workflow stages used by this project.</li>
              </ul>
            </div>
          </div>

          {/* Sprints */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">Sprints Array</h4>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm">
                <li><code className="text-indigo-600 font-bold">id</code> (string, required): Unique identifier.</li>
                <li><code className="text-indigo-600 font-bold">projectId</code> (string, required): Must match the project that owns this sprint and its goals.</li>
                <li><code className="text-indigo-600 font-bold">name</code> (string, required): Sprint name.</li>
                <li><code className="text-indigo-600 font-bold">startDate</code> (string, required): ISO date string (YYYY-MM-DD).</li>
                <li><code className="text-indigo-600 font-bold">endDate</code> (string, required): ISO date string (YYYY-MM-DD).</li>
                <li>
                  <code className="text-indigo-600 font-bold">length</code> (string, required): Allowed values: 
                  <code className="ml-2 text-slate-500">"1-week" | "2-weeks" | "4-weeks" | "custom"</code>
                </li>
                <li>
                  <code className="text-indigo-600 font-bold">status</code> (string, required): Allowed values:
                  <code className="ml-2 text-slate-500">"planned" | "active" | "completed"</code>
                </li>
              </ul>
            </div>
          </div>

          {/* Labels */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">Labels Array</h4>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm">
                <li><code className="text-indigo-600 font-bold">id</code> (string, required): Unique identifier.</li>
                <li><code className="text-indigo-600 font-bold">name</code> (string, required): Label name.</li>
                <li><code className="text-indigo-600 font-bold">color</code> (string, required): Tailwind CSS background color class (e.g., "bg-indigo-500").</li>
              </ul>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-800">Goals Array</h4>
            </div>
            <div className="p-6">
              <ul className="space-y-4 text-sm">
                <li><code className="text-indigo-600 font-bold">id</code> (string, required): Unique identifier.</li>
                <li><code className="text-indigo-600 font-bold">number</code> (number, optional): Stable sequential issue number (e.g. 1, 2, 142) for URL routes and issue badge #142.</li>
                <li><code className="text-indigo-600 font-bold">projectId</code> (string, required): Must match an ID in the projects array.</li>
                <li><code className="text-indigo-600 font-bold">sprintId</code> (string | null, optional): Must match an ID in the sprints array, or null.</li>
                <li><code className="text-indigo-600 font-bold">epicId</code> (string | null, optional): Must match an ID in the epics array, or null.</li>
                <li><code className="text-indigo-600 font-bold">parentId</code> (string | null, optional): ID of the parent goal if this is a subgoal. Subgoals cannot contain additional nested subgoals.</li>
                <li><code className="text-indigo-600 font-bold">labelIds</code> (array of strings, optional): Array of IDs matching the labels array.</li>
                <li><code className="text-indigo-600 font-bold">title</code> (string, required): Goal title.</li>
                <li><code className="text-indigo-600 font-bold">description</code> (string, optional): Goal description (supports rich GitHub-flavored Markdown).</li>
                <li>
                  <code className="text-indigo-600 font-bold">status</code> (string, required): ID of the matching entry in the goal’s project <code>workflowColumns</code>.
                </li>
                <li>
                  <code className="text-indigo-600 font-bold">lifecycleStatus</code> (string, required): Overall state. Allowed values:
                  <code className="ml-2 text-slate-500">"active" | "completed" | "archived"</code>
                </li>
                <li>
                  <code className="text-indigo-600 font-bold">priority</code> (string, required): Allowed values:
                  <code className="ml-2 text-slate-500">"low" | "medium" | "high"</code>
                </li>
                <li><code className="text-indigo-600 font-bold">category</code> (string, optional): Free-text category tag.</li>
                <li><code className="text-indigo-600 font-bold">createdAt</code> (number, required): Unix timestamp in milliseconds.</li>
                <li><code className="text-indigo-600 font-bold">startDate</code> (number | null, optional): Unix timestamp in milliseconds.</li>
                <li><code className="text-indigo-600 font-bold">dueDate</code> (number | null, optional): Unix timestamp in milliseconds.</li>
                <li><code className="text-indigo-600 font-bold">plannedForToday</code> (boolean, optional): Whether it shows in Focus Mode.</li>
                <li>
                  <code className="text-indigo-600 font-bold">activities</code> (array of objects, optional): Append-only history of state changes, column moves, priority updates, and dates.
                </li>
                <li>
                  <code className="text-indigo-600 font-bold">comments</code> (array of objects, optional): User comments with Markdown body and timestamps.
                </li>
                
                <li className="pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-800 mb-2">successMetric (object, optional)</div>
                  <ul className="pl-4 space-y-2 border-l-2 border-slate-100">
                    <li>
                      <code className="text-indigo-600 font-bold">type</code> (string, required): 
                      <code className="ml-2 text-slate-500">"numeric" | "checklist" | "milestones"</code>
                    </li>
                    <li className="text-slate-500 italic">If type is "numeric":</li>
                    <li><code className="text-indigo-600 font-bold">target</code> (number): Target value.</li>
                    <li><code className="text-indigo-600 font-bold">current</code> (number): Current progress.</li>
                    <li><code className="text-indigo-600 font-bold">unit</code> (string): e.g., "km", "%".</li>
                    <li className="text-slate-500 italic mt-2">If type is "checklist" or "milestones":</li>
                    <li>
                      <code className="text-indigo-600 font-bold">items</code> (array): Array of objects with 
                      <code>id</code> (string), <code>text</code> (string), and <code>completed</code> (boolean).
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Validation & AI Guidance */}
        <section className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <Info size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-900">Tips for AI-Assisted Editing</h3>
          </div>
          <ul className="space-y-2 text-sm text-indigo-800 list-disc pl-5">
            <li><strong>Maintain ID Integrity:</strong> When asking an AI to modify your data, instruct it to keep existing <code>id</code>, <code>projectId</code>, and <code>sprintId</code> values exactly as they are to preserve relationships.</li>
            <li><strong>Generating New Items:</strong> If the AI generates new projects, goals, or sprints, ensure it creates unique string IDs (e.g., <code>goal_new_1</code>).</li>
            <li><strong>Timestamps:</strong> Dates like <code>createdAt</code> and <code>dueDate</code> must be numeric Unix timestamps (milliseconds), not ISO strings (except for Sprint start/end dates).</li>
            <li><strong>Validation:</strong> The import process checks that <code>projects</code>, <code>goals</code>, and <code>sprints</code> are valid arrays. If the JSON is malformed or missing these arrays, the import will fail to protect your app.</li>
          </ul>
        </section>

        {/* Sample AI Prompt */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sample AI Prompt</h3>
              <p className="text-slate-500 text-sm mt-1">Copy this prompt and paste it into your AI tool along with your exported JSON to safely make changes.</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`I am providing a JSON export of my workspace from an app called KanbanGXP. 

Please read this JSON and make the following changes:
[INSERT YOUR REQUEST HERE]

CRITICAL INSTRUCTIONS:
1. Only make the requested changes.
2. Preserve the existing schema and overall structure exactly as it is.
3. Keep all existing IDs (id, projectId, sprintId) and relationships intact unless I explicitly asked you to change them.
4. Keep the schema version the same unless the app changes it.
5. Your output must be ONLY valid JSON. Do not add any markdown formatting, comments, or explanations outside the JSON block.

Here is the JSON:
[PASTE YOUR EXPORTED JSON HERE]`);
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors shrink-0"
            >
              {copiedPrompt ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
{`I am providing a JSON export of my workspace from an app called KanbanGXP. 

Please read this JSON and make the following changes:
[INSERT YOUR REQUEST HERE]

CRITICAL INSTRUCTIONS:
1. Only make the requested changes.
2. Preserve the existing schema and overall structure exactly as it is.
3. Keep all existing IDs (id, projectId, sprintId) and relationships intact unless I explicitly asked you to change them.
4. Keep the schema version the same unless the app changes it.
5. Your output must be ONLY valid JSON. Do not add any markdown formatting, comments, or explanations outside the JSON block.

Here is the JSON:
[PASTE YOUR EXPORTED JSON HERE]`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-3">Example Requests to Insert:</h4>
            <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>"Change all high priority SEO goals to medium priority."</li>
              <li>"Move all goals tagged 'Marketing' into the sprint with ID 'sprint_123'."</li>
              <li>"Change the lifecycleStatus of all goals in the 'done' column to 'archived'."</li>
              <li>"Rename the project 'Old Website' to 'New Website V2'."</li>
              <li>"Push all due dates forward by 7 days (convert the current timestamp to 7 days later in milliseconds)."</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
