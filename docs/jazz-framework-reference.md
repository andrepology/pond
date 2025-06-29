# Jazz Framework Reference (LLM Development Guide)

## Framework Overview & Philosophy

Jazz is an opinionated collaborative software framework with automatic sync, permissions, and history tracking. Key philosophical principles:

- **Collaborative-first**: Built for real-time collaboration from ground up
- **Local-first**: Data lives locally, syncs automatically
- **Automatic sync**: No manual state management for collaborative features
- **Permission-based**: Groups control access at granular level
- **History tracking**: Automatic versioning and audit trails
- **Schema-driven**: Strongly typed data structures with Zod validation

## Mental Model & Architectural Principles

### Core Mental Model
**Think in Terms of Shared Objects, Not Messages**:
- Jazz abstracts away network communication
- Work with collaborative data structures as if they were local objects
- Automatic sync handles the complexity of distributed state
- Focus on data structure design rather than network protocols

**Embrace Eventual Consistency**:
- All users see the same state eventually, but not necessarily immediately
- Design UI to handle temporary inconsistencies gracefully
- Use optimistic updates with fallback patterns
- Trust Jazz's conflict resolution algorithms

**Permission-First Design**:
- Every CoValue belongs to a Group with specific permissions
- Design data access patterns around group membership
- Think hierarchically about permission inheritance
- Avoid client-side authorization as primary security mechanism

### Critical Architectural Decisions

**State Management Paradigm**:
- **DO**: Use Jazz CoValues as single source of truth
- **DON'T**: Mix Jazz with Redux, Zustand, or other state management
- **DO**: Let Jazz handle collaborative state, use React state for UI-only concerns
- **DON'T**: Attempt to manually synchronize Jazz data with other stores

**Data Structure Design**:
- **DO**: Design schemas for collaborative scenarios from the start
- **DON'T**: Retrofit existing data structures for collaboration
- **DO**: Use appropriate CoValue types for your use case (CoMap vs CoList vs CoFeed)
- **DON'T**: Force data into inappropriate collaborative structures

**Loading and Subscription Patterns**:
- **DO**: Always check loading states before accessing CoValue data
- **DON'T**: Assume CoValues are immediately available
- **DO**: Subscribe at component level, pass IDs down component tree
- **DON'T**: Pass CoValue objects directly down component tree

### Fundamental Differences from Traditional Architectures

**No Explicit API Calls**:
- Traditional: `fetch('/api/users/123').then(setUser)`
- Jazz: `const user = useCoState(UserProfile, '123')` // Automatically synced
- Mutations happen directly on data objects
- No need for API layer between frontend and collaborative data

**No Manual Conflict Resolution**:
- Jazz handles concurrent edits automatically
- Different conflict resolution strategies per CoValue type
- Operational transforms for text, last-writer-wins for properties
- Trust the framework's conflict resolution rather than implementing custom logic

**Permission Model Integration**:
- Permissions are built into the data layer, not the application layer
- Access control happens at the CoValue level automatically
- Group membership determines what users can access
- No need for separate authorization middleware or API endpoint protection

## Core Architecture Concepts

### CoValues (Collaborative Values)
Core collaborative data structures that automatically sync across users with built-in versioning and permissions:

**CoMaps** - Key-value collaborative maps
- Distributed hash map with automatic conflict resolution
- Real-time key-value updates across all connected users
- Ideal for configuration objects, user profiles, settings
- Supports nested collaborative structures
```typescript
// CoMap operations sync automatically
coMap.set('key', 'value') // Propagates to all users
coMap.get('key') // Always returns latest collaborative state
```

**CoLists** - Ordered collaborative lists with positional awareness
- Maintains consistent ordering across collaborative edits
- Supports insertions, deletions, reordering without conflicts
- Perfect for todo lists, ordered items, sequential data
```typescript
// List operations maintain order collaboratively
coList.append(item) // Adds to end for all users
coList.insert(index, item) // Maintains relative positions
```

**CoFeeds** - Append-only collaborative feeds for activity streams
- Immutable append-only data structure
- Natural ordering with timestamp-based conflict resolution
- Ideal for activity logs, message streams, event sourcing
```typescript
// Feeds are append-only and naturally ordered
coFeed.append(message) // Always appends, never conflicts
```

**CoTexts** - Collaborative text editing with operational transforms
- Real-time text collaboration with automatic conflict resolution
- Supports rich text editing scenarios
- Handles concurrent character-level edits seamlessly
```typescript
// Text editing syncs at character level
coText.insert(position, 'text') // Collaborative text insertion
coText.delete(start, length) // Maintains text integrity
```

**FileStreams** - Collaborative file handling and management
- Distributed file storage with collaborative metadata
- Version control for binary assets
- Handles large file sync efficiently

**ImageDefinition** - Collaborative image management system
- Metadata collaboration for image assets
- Support for collaborative image editing workflows
- Efficient binary synchronization

**SchemaUnions** - Type unions for complex collaborative data structures
- Define complex data types with union schemas
- Maintain type safety across collaborative scenarios
- Enable polymorphic collaborative data structures

### Groups & Permissions

Jazz documentation describes groups as permission scopes with these concepts:

**Groups as Permission Scopes**:
- Every CoValue belongs to a Group that controls access permissions
- Groups control who can read/write collaborative data

**Group Inheritance**:
- Child groups inherit permissions from parent groups
- Enables hierarchical permission management

**Public Sharing & Invites**:
- Groups support public sharing mechanisms
- Invite systems for adding members to groups

**Permission Levels**:
- **Read**: Can view CoValue data
- **Write**: Can modify CoValue data
- **Admin**: Can modify group membership and permissions  
- **Owner**: Full control including deletion

### Authentication

Jazz provides multiple authentication methods to enable users to access their data across devices:

**Authentication States**:
- **Anonymous Authentication**: Default state with local account, upgradeable to full account
- **Authenticated Account**: Full multi-device account with persistent identity
- **Guest Mode**: Read-only access to public content, no persistent identity

**Available Authentication Methods**:

#### Passkey Authentication
Most secure option using WebAuthn/biometric authentication:
```typescript
import { usePasskeyAuth } from 'jazz-react';
import { JazzProvider } from 'jazz-react';

function AuthComponent() {
  const [auth, state] = usePasskeyAuth({
    appName: "My Jazz App",
    appHostname: "myapp.com",
  });

  if (state.state === "loading") {
    return <>Loading...</>;
  }

  if (state.state === "signedIn") {
    return (
      <JazzProvider auth={auth} AccountSchema={MyAppAccount}>
        <App />
      </JazzProvider>
    );
  }

  return (
    <>
      <h1>Sign in</h1>
      <button onClick={state.signIn}>Sign in</button>
    </>
  );
}
```

#### Passphrase Authentication
Bitcoin-style word phrases for user-controlled authentication:
```typescript
import { usePassphraseAuth } from 'jazz-react';
import { JazzProvider } from 'jazz-react';

function PassphraseAuth() {
  const [passphrasePhrase, setPassphrasePhrase] = useState('');
  const [auth, state] = usePassphraseAuth({
    seedPhrase: passphrasePhrase
  });

  if (state.state === "loading") {
    return <>Loading...</>;
  }

  if (state.state === "signedIn") {
    return (
      <JazzProvider auth={auth} AccountSchema={MyAppAccount}>
        <App />
      </JazzProvider>
    );
  }

  return (
    <div>
      <input
        type="password"
        placeholder="Enter your passphrase"
        value={passphrasePhrase}
        onChange={(e) => setPassphrasePhrase(e.target.value)}
      />
      <button onClick={state.signIn}>Sign in with Passphrase</button>
    </div>
  );
}
```

#### Authentication State Detection
```typescript
import { useAccount } from 'jazz-react';

function AuthStateIndicator() {
  const { me } = useAccount(MyAppAccount);

  // Authentication states:
  // me: undefined - Auth state being determined
  // me: null - Not authenticated/in guest mode  
  // me: Account - Successfully authenticated

  if (me === undefined) {
    return <span>Loading...</span>;
  }

  if (!me) {
    return <span>Guest Mode</span>;
  }

  return (
    <div>
      <span>Signed in as: {me.profile?.name}</span>
      <p>Account ID: {me.id}</p>
    </div>
  );
}
```

## Design Patterns & Best Practices

### History Patterns
Jazz provides automatic history tracking enabling powerful collaborative features:

**Audit Logs**: Track all changes with automatic timestamping and user attribution
- Every modification to CoValues is automatically logged
- Includes user information, timestamps, and change details
- Essential for compliance and debugging collaborative applications
```typescript
// Access edit history for audit trails
coValue._edits // Object with field-specific edit history
// Each edit contains: .by (Account), .value, .meta (timestamp, etc.)
```

**Activity Feeds**: Real-time feeds of user actions across collaborative spaces
- Filter and display user activity in real-time
- Build activity timelines and notifications
- Track user engagement patterns
```typescript
// Filter changes by user, time, or type
const recentTitleChanges = coValue._edits.title?.all.filter(edit => 
  edit.meta.timestamp > someDate
)
// Build activity feeds for collaborative interfaces
```

**Change Indicators**: Visual feedback for collaborative editing states
- Show what changed and when in UI
- Highlight recent modifications
- Provide visual cues for collaborative awareness
```typescript
// Detect what changed and when
const lastTitleEdit = coValue._edits.title?.last
// Use for UI indicators like "recently changed" badges
```

**Finding Specific Changes**: Query historical states for detailed analysis
- Search through change history programmatically
- Implement undo/redo functionality
- Build diff views and change tracking
```typescript
// Find specific change patterns
const titleChanges = coValue._edits.title?.all || []
const statusChanges = coValue._edits.status?.all || []
// Enable targeted change analysis and reversion
```

**Critical History Usage Rules**:
- **Always ensure CoValues are loaded before accessing history**
- History API requires complete subscription and loading
- Check loading states before history operations
- Reference: "Subscription & Loading" documentation for proper loading patterns

### Autosaving Forms
Jazz enables automatic form persistence without manual save logic:

```typescript
function AutosavingForm({ documentId }: { documentId: string }) {
  const doc = useCoState(Document, documentId)
  
  if (doc === undefined) return <div>Loading...</div>
  if (doc === null) return <div>Document not found</div>
  
  return (
    <form>
      <input
        value={doc?.title || ''}
        onChange={(e) => {
                  // Automatic save - no submit button needed
        doc.title = e.target.value
        }}
        placeholder="Document title..."
      />
      
      <textarea
        value={doc?.content || ''}
        onChange={(e) => {
          // Real-time collaboration as user types
          doc.content = e.target.value
        }}
        placeholder="Start typing..."
      />
      
      {/* Optional: Show sync status */}
      <div className="sync-indicator">
        {doc._edits.content?.last?.by?.id === me?.id ? 
          'Synced' : 'Collaborator editing...'}
      </div>
    </form>
  )
}
```

**Autosaving Form Best Practices**:
- **No submit buttons** for collaborative data
- **Debounce rapid changes** for performance if needed
- **Show sync indicators** to inform users
- **Handle conflicts gracefully** (Jazz does this automatically)
- **Preserve user input** during loading states

### Organization/Team Patterns
Hierarchical organization structures using nested groups:

```typescript
// Organization structure with nested groups
const Organization = co.map({
  name: z.string(),
  departments: co.list(z.string()), // Department group IDs
  employees: co.list(z.string()),   // Employee account IDs
  settings: z.object({
    permissions: z.object({
      allowPublicProjects: z.boolean(),
      requireApproval: z.boolean()
    })
  })
})

// Create organization hierarchy
const orgGroup = Group.create()
const engGroup = Group.create()
const designGroup = Group.create()

// Set up group inheritance
engGroup.extend(orgGroup)
designGroup.extend(orgGroup)

// Role-based access through group membership
const projectGroup = Group.create()
projectGroup.extend(engGroup) // Engineering team has access

// Add specific users to project (example with placeholder accounts)
// Note: In real code, these would be actual Account instances
// await projectGroup.addMember(leadEngineerAccount, "writer")
// await projectGroup.addMember(productManagerAccount, "writer")
```

**Team Pattern Components**:
```typescript
function TeamMembersList({ teamGroupId }: { teamGroupId: string }) {
  const teamGroup = useCoState(Group, teamGroupId)
  
  if (teamGroup === undefined) return <div>Loading team...</div>
  if (teamGroup === null) return <div>Team not found</div>
  
  return (
    <div>
      <h3>{teamGroup.name} Members</h3>
      {teamGroup.members.map(member => (
        <div key={member.id}>
          {member.profile?.name}
          <span>{member.isAdmin ? 'Admin' : 'Member'}</span>
        </div>
      ))}
    </div>
  )
}

function ProjectsByTeam({ teamGroupId }: { teamGroupId: string }) {
  const { me } = useAccount(MyAppAccount)
  
  // Projects where user has access through team membership
  const userProjects = me?.root.projects.filter(project =>
    project._owner.id === teamGroupId || 
    project._owner.parent?.id === teamGroupId
  )
  
  return (
    <div>
      {userProjects?.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

**Scalable Permission Management**:
- **Inherit permissions** through group hierarchy
- **Override permissions** at specific levels when needed
- **Role-based access** through group admin/member status
- **Delegate management** by making users admins of subgroups

## Development Guidelines

### React Integration

## API Reference: useAccount vs useCoState

### useAccount Pattern
**When to use**: Access current user's account data, personal settings, private data structures
```typescript
import { useAccount } from 'jazz-react'

function UserDashboard() {
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      profile: true,
      root: { projects: { $each: true } }
    }
  });
  
  // Access user's personal data through account root
  const userProjects = me?.root.projects || []
  
  if (!me) return <div>Loading account...</div>
  
  return (
    <div>
      <h1>My Projects</h1>
      {userProjects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  )
}
```

### useCoState Pattern  
**When to use**: Access shared/collaborative data, data owned by others, public data
```typescript
import { useCoState } from 'jazz-react'

function SharedProject({ projectId }: { projectId: string }) {
  // Access collaborative data that might be shared with multiple users
  const project = useCoState(Project, projectId, {
    tasks: { $each: true }
  });
  
  // useCoState handles permissions, loading, and sync for shared data
  if (!project) return project === null 
    ? <div>Project not found or no access</div>
    : <div>Loading project...</div>
  
  return (
    <div>
      <h1>{project.name}</h1>
      <p>Tasks: {project.tasks.length}</p>
    </div>
  )
}
```

### Decision Matrix: useAccount vs useCoState

| Use Case | Pattern | Reasoning |
|----------|---------|-----------|
| User's personal settings | `me.root.settings` | Private to user, no sharing needed |
| User's private documents | `me.root.documents` | User-owned, access control implicit |
| Shared documents | `useCoState(Document, docId)` | Multi-user access, explicit permissions |
| Public data | `useCoState(PublicData, id)` | Community access, permission-based |
| User profile (viewing others) | `useCoState(Profile, userId)` | Cross-user access, shared data |
| Current user profile | `me.profile` OR `useCoState` | Depends on sharing requirements |

## CoValue ID Management Best Practices

### ID Source Patterns

**From userRoot (User-owned data)**:
```typescript
function MyProjects() {
  const { me } = useAccount(MyAppAccount)
  
  // IDs come from user's personal data structures
  const projects = me?.root.projects || []
  
  return (
    <div>
      {projects.map(project => (
        <ProjectItem key={project.id} project={project} />
      ))}
    </div>
  )
}
```

**From URL/Router (Shared data)**:
```typescript
import { useParams } from 'react-router-dom'

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const project = useCoState(Project, projectId!)
  
  // ID comes from URL for shareable, bookmarkable resources
  return <ProjectDetails project={project} />
}
```

**From Parent CoValue (Nested data)**:
```typescript
function ProjectTasks({ projectId }: { projectId: string }) {
  const project = useCoState(Project, projectId, {
    tasks: { $each: true }
  })
  
  if (project === undefined) return <div>Loading...</div>
  if (project === null) return <div>Project not found</div>
  
  return (
    <div>
      {project.tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
```

**From CoList/CoFeed Iteration**:
```typescript
function ActivityFeed() {
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: { activityFeed: { $each: true } }
    }
  })
  
  if (!me?.root.activityFeed) return <div>Loading activities...</div>
  
  return (
    <div>
      {me.root.activityFeed.map((activity, index) => (
        // CoFeed items have built-in IDs/indices
        <ActivityItem key={activity.id || index} activity={activity} />
      ))}
    </div>
  )
}
```

### ID Generation Patterns

**Creating New CoValues**:
```typescript
function CreateProject() {
  const { me } = useAccount(MyAppAccount)
  
  const createProject = () => {
    if (!me) return
    
    // Jazz generates IDs automatically when creating CoValues
    const newProject = Project.create({
      name: 'New Project',
      createdBy: me.id
    }, { owner: me })
    
    // Store reference in user's personal list
    me.root.projects.push(newProject)
    
    // Navigate using the new ID
    navigate(`/project/${newProject.id}`)
  }
  
  return <button onClick={createProject}>Create Project</button>
}
```

**Sharing Patterns - ID Distribution**:
```typescript
function ShareProject({ projectId }: { projectId: string }) {
  const project = useCoState(Project, projectId)
  
  const shareWithUser = async (userAccount: Account) => {
    if (!project) return
    
    // Share by adding user to project's group
    await project._owner.addMember(userAccount, "writer")
    
    // IDs remain the same, permissions change
    const shareableLink = `https://app.com/project/${projectId}`
    return shareableLink
  }
  
  return (
    <div>
      <input 
        placeholder="Enter user account to share with"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Note: Real implementation would need user lookup by email/ID
            console.log('Share with:', e.currentTarget.value)
          }
        }}
      />
    </div>
  )
}
```

**Core React Hooks for Jazz**:
```typescript
// Primary hook for CoValue subscription
import { useCoState } from 'jazz-react'

function UserProfile({ userId }: { userId: string }) {
  const user = useCoState(UserProfile, userId)
  
  // Always handle loading states
  if (user === undefined) return <div>Loading user...</div>
  if (user === null) return <div>User not found</div>
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

**Authentication Integration**:
```typescript
import { useAccount } from 'jazz-react'

function App() {
  const { me, logOut } = useAccount(MyAppAccount)
  
  if (me === undefined) return <div>Loading...</div>
  
  if (!me) {
    return <div>Please sign in to continue</div>
  }
  
  return (
    <div>
      <button onClick={logOut}>Sign Out</button>
      <MainApp account={me} />
    </div>
  )
}
```

**Collaborative Form Patterns**:
```typescript
function CollaborativeForm({ documentId }: { documentId: string }) {
  const doc = useCoState(Document, documentId)
  
  if (doc === undefined) return <div>Loading...</div>
  if (doc === null) return <div>Document not found</div>
  
  return (
    <form>
      <input
        value={doc.title || ''}
        onChange={(e) => {
          // Direct mutation triggers automatic sync
          doc.title = e.target.value
        }}
      />
      <textarea
        value={doc.content || ''}
        onChange={(e) => {
          // All changes propagate immediately
          doc.content = e.target.value
        }}
      />
    </form>
  )
}
```

**List Management with CoLists**:
```typescript
function TodoList({ listId }: { listId: string }) {
  const todoList = useCoState(TodoList, listId)
  
  if (todoList === undefined) return <div>Loading todos...</div>
  if (todoList === null) return <div>Todo list not found</div>
  
  const addTodo = (text: string) => {
    // Collaborative list append
    const newTodo = Todo.create({ 
      text, 
      completed: false 
    }, todoList._owner);
    
    todoList.push(newTodo);
  }
  
  return (
    <div>
      {todoList.map((todo, index) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => {
              // Direct mutation syncs to all users
              todo.completed = e.target.checked
            }}
          />
          <span>{todo.text}</span>
        </div>
      ))}
      <button onClick={() => addTodo('New todo')}>Add Todo</button>
    </div>
  )
}
```

**Component Composition Best Practices**:
- Prefer composition over inheritance for Jazz-connected components
- Pass CoValue IDs down, subscribe at component level
- Handle loading states consistently across component tree
- Leverage automatic re-rendering from Jazz subscriptions

### Subscription & Deep Loading
Critical pattern: Ensure CoValues are loaded before accessing history or nested data
```typescript
// Always check loading state
if (coValue === undefined) return <Loading />
if (coValue === null) return <NotFound />
// Then access data safely
```

### Schema Definition Best Practices
- Use Zod for runtime validation
- Define schemas before creating CoValues
- Consider migration paths for schema evolution
- Leverage TypeScript inference from schemas

## Schema Definition & Accounts

### Schema Definition with `co` Module (v0.14.0+)
Jazz uses Zod for validation and the `co` module for collaborative types:

```typescript
import { co, z } from 'jazz-tools'

// Define schemas using co helpers
const Task = co.map({
  title: z.string(),
  status: z.literal(["todo", "in-progress", "completed"]),
  assignee: z.optional(z.string()),
  dueDate: z.optional(z.date())
});

// Other co types
const TaskList = co.list(Task);        // Collaborative list
const ActivityFeed = co.feed(Task);    // Append-only feed  
const DocumentText = co.text();        // Collaborative text
const UserAvatar = co.image();         // Collaborative images

// TypeScript type inference for loaded CoValues
type Task = co.loaded<typeof Task>;
type TaskList = co.loaded<typeof TaskList>;
```

### Account Definition & Migrations
```typescript
// Account root schema defines user's personal data structure
const MyAppRoot = co.map({
  projects: co.list(Project),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean()
  }),
  // Reference fields for relationships
  _refs: z.object({
    activeProject: z.optional(Project),
    favoriteProjects: co.list(Project)
  })
});

const MyAppProfile = co.profile({
  name: z.string(),
  avatar: z.optional(co.image()),
});

export const MyAppAccount = co.account({
  root: MyAppRoot,
  profile: MyAppProfile,
}).withMigration((account, creationProps?: { name: string }) => {
  if (account.root === undefined) {
    account.root = MyAppRoot.create({
      projects: co.list(Project).create([]),
      preferences: {
        theme: 'light',
        notifications: true
      },
      _refs: {
        favoriteProjects: co.list(Project).create([])
      }
    });
  }

  if (account.profile === undefined) {
    const profileGroup = Group.create();
    profileGroup.makePublic(); // Public profile

    account.profile = MyAppProfile.create({
      name: creationProps?.name ?? "New user",
    }, profileGroup);
  }
});
```

**Schema Field Types**:
- Use `z.literal([...])` for union types: `z.literal(["draft", "published", "archived"])`
- Use `z.enum([...])` for string enums: `z.enum(['light', 'dark'])`  
- Use `_refs` object for CoValue references that should be loaded separately

### Schema Evolution Best Practices
- **Add optional fields** with `.optional()` for backward compatibility
- **Use union types** for gradual transitions: `z.union([oldSchema, newSchema])`
- **Version schemas** when making breaking changes
- **Test schema changes** with existing data before deployment

```typescript
// Evolution example - adding optional field
const TaskSchemaV2 = TaskSchema.extend({
  priority: z.enum(['low', 'medium', 'high']).optional()
})

// Backward compatible access
function TaskComponent({ task }: { task: Task }) {
  const priority = task.priority || 'medium' // Handle undefined
  return <div>Priority: {priority}</div>
}
```

## Performance Considerations

### Loading Patterns
- Implement proper loading states
- Use deep loading for nested collaborative structures
- Lazy load large datasets where appropriate

### Memory Management
- Understand Jazz's automatic cleanup
- Avoid memory leaks in subscription management
- Consider data lifecycle in component design

## Error Handling & Edge Cases

### Network Resilience
- Jazz handles offline/online transitions automatically
- Implement UI feedback for connection states
- Consider conflict resolution strategies

### Permission Errors
- Handle access denied scenarios gracefully
- Provide clear feedback for permission issues
- Design UX around group membership flows

## Anti-Patterns to Avoid

### Manual State Synchronization
- Don't implement custom sync logic over Jazz data
- Avoid mixing Jazz CoValues with other state management
- Trust Jazz's automatic sync mechanisms

### Bypassing Permission System
- Don't implement custom authorization over Jazz groups
- Use Jazz's group system for all access control
- Avoid client-side permission checks as primary security

### Schema Violations
- Don't mutate data outside schema constraints
- Avoid bypassing Zod validation
- Maintain schema consistency across all clients

## Project Setup & Installation

### Installation

**create-jazz-app CLI Tool**:
```bash
# Quick start with API key
npx create-jazz-app@latest --api-key you@example.com

# Create with specific options
npx create-jazz-app@latest my-app --framework react --starter react-passkey-auth --api-key you@example.com

# Create from example
npx create-jazz-app@latest my-app --example chat --api-key you@example.com
```

**Available Command Options**:
- `directory` - Directory to create the project in
- `-f, --framework` - Framework (React, React Native, Svelte, Vue)
- `-s, --starter` - Starter template (react-passkey-auth, react-clerk-auth, vue-demo-auth, etc.)
- `-e, --example` - Example project (chat, todo, music-player, etc.)
- `-p, --package-manager` - Package manager (npm, yarn, pnpm, bun, deno)
- `-k, --api-key` - Jazz Cloud API key

### Framework-Specific Installation

**React**:
```bash
pnpm install jazz-react jazz-tools
```

**React Native**:
```bash
# Core dependencies
npm install jazz-tools jazz-react-native jazz-react-native-media-images

# React Native dependencies
npm install @react-native-community/netinfo @bam.tech/react-native-image-resizer

# Polyfills
npm install @azure/core-asynciterator-polyfill react-native-url-polyfill readable-stream react-native-get-random-values @craftzdog/react-native-buffer @op-engineering/op-sqlite react-native-mmkv
```

**React Native Expo**:
```bash
# Expo dependencies
npx expo install expo-linking expo-secure-store expo-file-system @react-native-community/netinfo @bam.tech/react-native-image-resizer

# Polyfills
npm install @azure/core-asynciterator-polyfill react-native-url-polyfill readable-stream react-native-get-random-values @craftzdog/react-native-buffer

# Jazz dependencies
npm install jazz-tools jazz-expo jazz-react-native-media-images
```

**Other Frameworks**: Jazz also supports Vue, Svelte, and Node.js server workers. See the [official documentation](https://jazz.tools) for setup instructions.

### Configuration Files

**Metro Config for React Native** (metro.config.js):
```js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    sourceExts: ["mjs", "js", "json", "ts", "tsx"],
    requireCycleIgnorePatterns: [/(^|\/|\\)node_modules($|\/|\\)/]
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

**Polyfills Setup** (polyfills.js):
```js
import "@azure/core-asynciterator-polyfill";
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { Buffer } from "@craftzdog/react-native-buffer";
import { polyfillGlobal } from 'react-native/Libraries/Utilities/PolyfillFunctions';

// Set up global polyfills
global.Buffer = Buffer;
polyfillGlobal("Buffer", () => Buffer);
polyfillGlobal("ReadableStream", () => ReadableStream);
```

Import polyfills in your app entry point:
```js
// index.js
import './polyfills'; // Import first
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('MyApp', () => App);
```

### Sync and Storage Options

**Jazz Cloud** (Hosted):
```typescript
sync: {
  peer: "wss://cloud.jazz.tools/?key=you@example.com",
  when: "always" // "always" | "signedUp" | "never"
}
```

**Self-hosted**:
```bash
# Run sync server
npx jazz-run sync --port 4200

# Use in app
sync: {
  peer: "ws://localhost:4200",
  when: "always"
}
```

### Server-Side Workers
Jazz supports Node.js server workers for background processing. See the [official documentation](https://jazz.tools/docs) for server-side setup.

## Provider Configuration

### JazzProvider Setup

**React Configuration**:
```typescript
import { JazzProvider } from 'jazz-react';

function App() {
  return (
    <JazzProvider
      sync={{
        peer: "wss://cloud.jazz.tools/?key=you@example.com",
        when: "always" // "always" | "signedUp" | "never"
      }}
      AccountSchema={MyAppAccount}
      guestMode={false}
      defaultProfileName="New User"
      onLogOut={() => console.log("User logged out")}
      onAnonymousAccountDiscarded={async (account) => {
        // Migrate data from anonymous account
        console.log("Migrating data from:", account.id);
      }}
    >
      <MainApp />
    </JazzProvider>
  );
}
```

**Provider Options**:

- `sync`: Sync configuration object
  - `peer`: WebSocket URL for sync server
  - `when`: When to sync ("always", "signedUp", "never")
- `AccountSchema`: Account schema class for the app
- `guestMode`: Enable guest mode for read-only access (boolean)
- `defaultProfileName`: Default name for new user profiles
- `onLogOut`: Callback when user logs out
- `onAnonymousAccountDiscarded`: Handle data migration when switching accounts

**React Native Providers**:
- React Native: `import { JazzProvider } from 'jazz-react-native'`
- React Native Expo: `import { JazzProvider } from 'jazz-expo'`

## File Upload & Binary Data

### co.image() and ImageDefinition

**Basic Image Upload**:
```typescript
import { co, ImageDefinition } from 'jazz-tools';

const UserProfile = co.map({
  name: z.string(),
  avatar: co.image(), // ImageDefinition type
});

function ProfileImageUpload({ profile }: { profile: UserProfile }) {
  const handleFileUpload = async (file: File) => {
    // Create ImageDefinition from File
    const imageDefinition = ImageDefinition.create(file, profile._owner);
    
    // Store reference in CoValue
    profile.avatar = imageDefinition;
  };

  return (
    <div>
      {profile.avatar && (
        <img src={profile.avatar.originalSize.url} alt="Avatar" />
      )}
      
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />
    </div>
  );
}
```

**Image Resizing & Variants**:
```typescript
function ResponsiveImage({ image }: { image: ImageDefinition }) {
  return (
    <picture>
      {/* Use different image sizes for responsiveness */}
      <source 
        media="(max-width: 320px)" 
        srcSet={image.smallSize?.url} 
      />
      <source 
        media="(max-width: 640px)" 
        srcSet={image.mediumSize?.url} 
      />
      <img 
        src={image.originalSize.url} 
        alt="Responsive image"
        loading="lazy"
      />
    </picture>
  );
}
```

**File Upload with React Native**:
```bash
# Install media packages
npm install jazz-react-native-media-images
```

```typescript
import { ImageDefinition } from 'jazz-tools';
import { launchImageLibrary } from 'react-native-image-picker';

function ProfileImagePicker({ profile }: { profile: UserProfile }) {
  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets?.[0]?.uri) {
        const file = {
          uri: response.assets[0].uri,
          type: response.assets[0].type,
          name: response.assets[0].fileName,
        };
        
        const imageDefinition = ImageDefinition.create(file, profile._owner);
        profile.avatar = imageDefinition;
      }
    });
  };

  return (
    <TouchableOpacity onPress={pickImage}>
      {profile.avatar ? (
        <Image source={{ uri: profile.avatar.originalSize.url }} />
      ) : (
        <Text>Tap to select image</Text>
      )}
    </TouchableOpacity>
  );
}
```

**Binary File Upload** (General files):
```typescript
import { BinaryCoValue } from 'jazz-tools';

const Document = co.map({
  title: z.string(),
  attachment: z.optional(BinaryCoValue),
});

function FileUpload({ document }: { document: Document }) {
  const handleFileUpload = async (file: File) => {
    const binaryData = BinaryCoValue.create(file, document._owner);
    document.attachment = binaryData;
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />
      
      {document.attachment && (
        <a 
          href={document.attachment.url} 
          download
        >
          Download Attachment
        </a>
      )}
    </div>
  );
}
```

## Real-time Updates & Subscriptions

### Automatic UI Updates

Jazz automatically re-renders React components when subscribed CoValues change:

```typescript
function CollaborativeCounter({ counterId }: { counterId: string }) {
  const counter = useCoState(Counter, counterId);
  
  if (!counter) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Count: {counter.value}</p>
      <button onClick={() => counter.value++}>
        Increment {/* UI updates instantly for all users */}
      </button>
    </div>
  );
}
```

### Subscription Depth Control

**Shallow vs Deep Loading**:
```typescript
// Shallow - only load immediate properties
const project = useCoState(Project, projectId);

// Deep - load nested CoValues too
const project = useCoState(Project, projectId, {
  tasks: { $each: true }, // Load all tasks in project
  members: { $each: true }, // Load all member details  
});

// Selective deep loading
const project = useCoState(Project, projectId, {
  tasks: { $each: { assignee: true } }, // Load tasks with assignees
  settings: true, // Load project settings
});
```



### Performance with Large Lists

**Virtualization with CoLists**:
```typescript
function LargeTaskList({ projectId }: { projectId: string }) {
  const project = useCoState(Project, projectId, {
    // Don't load all tasks at once for large lists
    tasks: false 
  });
  
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (!project?.tasks) return;
    
    // Load only visible tasks using useCoState for each
    const loadVisibleTasks = async () => {
      // For large lists, implement proper virtualization
      // This is a simplified example - real implementation would use
      // virtual scrolling libraries with Jazz subscriptions
      const visibleTaskIds = project.tasks.slice(0, 50);
      // Each task would be loaded via individual useCoState calls
      // in separate components for proper subscription management
    };
    
    loadVisibleTasks();
  }, [project?.tasks]);
  
  return (
    <div>
      {visibleTasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

## Development Tools

### Jazz Inspector
Tool for debugging collaborative data with visual interface:

**Installation**:
```bash
npm install jazz-inspector
```

**React Integration**:
```typescript
import { JazzInspector } from 'jazz-inspector';

<JazzProvider>
  <App />
  <JazzInspector /> {/* Add inspector button */}
</JazzProvider>
```

**Positioning Options**:
```typescript
<JazzInspector position="bottom left" />
// Options: "right", "left", "bottom right", "bottom left", "top right", "top left"
```

**Features**:
- Real-time CoValue state visualization
- Group membership and permission tracking  
- Edit history and sync status
- Network activity monitoring
- Keyboard shortcut: `Cmd+J` to open inspector

## Troubleshooting Common Issues

### Loading State Problems

**Issue**: CoValue appears undefined even after loading
```typescript
// ❌ Incorrect - doesn't handle loading properly
function TaskDetail({ taskId }: { taskId: string }) {
  const task = useCoState(Task, taskId);
  return <div>{task.title}</div>; // Error if task is undefined
}

// ✅ Correct - handle all states
function TaskDetail({ taskId }: { taskId: string }) {
  const task = useCoState(Task, taskId);
  
  if (task === undefined) return <div>Loading...</div>;
  if (task === null) return <div>Task not found</div>;
  
  return <div>{task.title}</div>;
}
```

### Permission Errors

**Issue**: "Permission denied" when accessing CoValues
```typescript
// Check group membership and permissions
function DebugPermissions({ coValue }: { coValue: CoValue }) {
  const { me } = useAccount(MyAppAccount);
  
  const canRead = me?._owner.canRead(coValue);
  const canWrite = me?._owner.canWrite(coValue);
  const owner = coValue._owner;
  
  return (
    <div>
      <p>Can read: {String(canRead)}</p>
      <p>Can write: {String(canWrite)}</p>
      <p>Owner: {owner.name}</p>
      <p>Owner Group: {me?._owner.name || 'Unknown'}</p>
    </div>
  );
}
```

### Sync Issues

**Issue**: Changes not syncing between clients
- Check sync configuration in JazzProvider
- Verify internet connection
- Use Jazz Inspector to monitor sync status
- Check browser console for WebSocket errors

```typescript
// Add sync status indicator
function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <div style={{ 
      color: isOnline ? 'green' : 'red',
      position: 'fixed',
      top: 10,
      right: 10
    }}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </div>
  );
}
```

### Schema Evolution Issues

**Issue**: App breaks after schema changes
```typescript
// Use optional fields for backward compatibility
const TaskV2 = co.map({
  title: z.string(),
  description: z.string(),
  // Add new fields as optional
  priority: z.optional(z.enum(['low', 'medium', 'high'])),
  tags: z.optional(z.array(z.string())),
});

// Handle undefined values in components
function TaskDisplay({ task }: { task: TaskV2 }) {
  return (
    <div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      {task.priority && <span>Priority: {task.priority}</span>}
      {task.tags && <div>Tags: {task.tags.join(', ')}</div>}
    </div>
  );
}
```

### Performance Issues

**Issue**: App is slow with large datasets
- Use shallow loading by default
- Load nested data only when needed
- Implement virtualization for large lists
- Use React.memo for expensive components

```typescript
// Optimize with React.memo
const TaskItem = React.memo(({ task }: { task: Task }) => {
  return (
    <div>
      <h4>{task.title}</h4>
      <p>{task.description}</p>
    </div>
  );
});

// Shallow loading for lists
function TaskList({ projectId }: { projectId: string }) {
  const project = useCoState(Project, projectId); // Shallow load
  
  return (
    <div>
      {project?.taskIds.map(taskId => (
        <TaskItem key={taskId} taskId={taskId} />
      ))}
    </div>
  );
}
```

### Recommended Project Structure
```
src/
  schemas/          # Zod schema definitions for CoValues
  auth/            # Authentication configuration  
  components/      # React components with Jazz integration
  hooks/           # Custom hooks for Jazz data subscriptions
  utils/           # Jazz utility functions
```

## Common Implementation Patterns

### Data Flow Architecture
1. Define schemas with Zod validation
2. Create CoValues with proper permissions
3. Subscribe to changes in React components
4. Handle loading and error states
5. Implement collaborative UI patterns

### Authentication Flow
1. Initialize auth provider (Passkey/Passphrase/Clerk/Custom)  
2. Handle authentication states in UI
3. Create/join groups based on auth state
4. Access CoValues based on group membership

### Collaborative Features
1. Real-time updates via automatic sync
2. History tracking for audit trails
3. Conflict resolution through Jazz internals
4. Permission-based feature access

## Development Workflow

### Testing Strategy
- Test collaborative scenarios with multiple users
- Validate permission boundaries
- Test offline/online state transitions
- Verify history and audit functionality

### Debugging Approach
**Jazz Inspector Tool**:
- Visual debugging of CoValue data structures
- Real-time sync activity monitoring
- Group membership and permission visualization
- Schema validation status checks
```typescript
// Enable Jazz Inspector in development
import { JazzInspector } from 'jazz-inspector'
if (process.env.NODE_ENV === 'development') {
  JazzInspector.enable()
}
```

**Network Sync Debugging**:
- Monitor WebSocket connections for sync status
- Track offline/online state transitions
- Identify sync conflicts and resolution patterns
- Debug connection issues and retry logic

**Schema Validation Debugging**:
- Validate data against Zod schemas at runtime
- Catch schema violations before they propagate
- Debug type mismatches in collaborative scenarios
```typescript
// Debug schema compliance
try {
  const validatedData = UserSchema.parse(coMapData)
} catch (error) {
  console.error('Schema validation failed:', error.issues)
}
```

**Permission Debugging**:
- Verify group membership for access issues
- Debug permission inheritance chains
- Validate read/write permissions on CoValues
- Track permission changes and group updates

**Common Debug Scenarios**:
1. **Loading State Issues**: CoValue accessed before fully loaded
2. **Permission Denials**: User lacks group membership for operation
3. **Schema Violations**: Data doesn't match defined Zod schema
4. **Sync Conflicts**: Multiple users editing same data simultaneously
5. **Network Issues**: Connection problems affecting real-time sync

## Specific API Reference

### Core Jazz Hooks & Methods

**useAccount() API**:
```typescript
const { me, logOut } = useAccount(MyAppAccount, {
  resolve: {
    profile: true,
    root: { projects: { $each: true } }
  }
});

// Account properties
me?.id           // string - Unique account identifier
me?.root         // AccountRoot - Personal data container
me?.profile      // Profile - Shared user data
me?._owner       // Group - Account's permission group
```

**Programmatic Account Access** (for server-side or complex operations):
```typescript
// Get current account instance programmatically
const me = await MyAppAccount.getMe().ensureLoaded({
  resolve: {
    root: { 
      projects: { $each: true },
      settings: true
    },
    profile: true
  }
});

// Access deeply loaded data
const projects = me.root.projects;
const userSettings = me.root.settings;
```

**useCoState() API**:
```typescript
const coValue = useCoState(SchemaClass, id, {
  resolve: { nestedField: true }
});

// Return value states
// undefined - Still loading from network
// null - Not found or not accessible
// CoValue - Successfully loaded data

// Direct data access (once loaded)
coValue?.someField  // Access schema-defined fields directly
coValue?.id         // string - CoValue unique identifier
coValue?._owner     // Group - Permission group owning this CoValue
```

**CoValue Creation Methods**:
```typescript
// CoMap creation
const newCoMap = TaskSchema.create({
  title: "New task",
  status: "todo"
}, { owner: me });

// CoList creation
const newCoList = co.list(Task).create([], { owner: me });

// CoFeed creation (append-only)
const newCoFeed = co.feed(Task).create([], { owner: me });
```

**Group & Permission Methods**:
```typescript
import { Group } from 'jazz-tools';

// Group creation
const group = Group.create();

// Group membership
await group.addMember(userAccount, "writer");  // Add user with role
await group.removeMember(userAccount);         // Remove user

// Permission checks
const canRead = userAccount.canRead(coValue);    // boolean
const canWrite = userAccount.canWrite(coValue);  // boolean  
const canAdmin = userAccount.canAdmin(coValue);  // boolean

// Public access
group.makePublic("reader"); // Grant everyone read access

// Group inheritance
childGroup.extend(parentGroup);         // Inherit permissions
childGroup.extend(parentGroup, "reader"); // Override role
```

**History API Methods (Real Jazz API)**:
```typescript
// CoMap Edit History - Actual Jazz API
const task = useCoState(Task, taskId)

// Access field-specific edit history
const titleEdits = task._edits.title    // LastAndAllCoMapEdits<string>
const statusEdits = task._edits.status  // LastAndAllCoMapEdits<"todo" | "in-progress" | "completed">

// Edit structure
if (titleEdits) {
  titleEdits.last    // Most recent edit: CoMapEdit<string>
  titleEdits.all     // All edits: CoMapEdit<string>[]
  
  // Each CoMapEdit contains:
  titleEdits.last?.by       // Account | null - Who made the edit
  titleEdits.last?.value    // string - The actual value
  titleEdits.last?.meta     // EditMeta - Timestamp, session info
}

// Find who made a specific change (Real Jazz pattern)
function findWhoChangedStatus(task: Task, targetStatus: string): Account | null {
  const statusEdits = task._edits.status
  if (!statusEdits) return null
  
  const matchingEdit = statusEdits.all.find(edit => edit.value === targetStatus)
  return matchingEdit?.by || null
}

// Usage examples
const whoCompletedTask = findWhoChangedStatus(task, "completed")
const whoLastEditedTitle = task._edits.title?.last?.by

// Filter edits by criteria
const recentTitleEdits = task._edits.title?.all.filter(edit => 
  edit.meta.timestamp > someDate
)
```

**Deep Loading & Subscription Patterns**:
```typescript
// Subscribe to nested CoValues with proper depth control
const project = useCoState(Project, projectId, {
  tasks: { $each: true } // Load tasks automatically
})

// Conditional subscription (avoid if project not loaded)
function ProjectTasks({ projectId }: { projectId: string }) {
  const project = useCoState(Project, projectId, {
    tasks: { $each: true }
  })
  
  if (project === undefined) return <div>Loading project...</div>
  if (project === null) return <div>Project not found</div>
  
  return <TaskList tasks={project.tasks} />
}
```

**Error Handling Patterns**:
```typescript
// Handle loading and error states
function DataComponent({ dataId }: { dataId: string }) {
  const data = useCoState(DataSchema, dataId)
  
  // Loading state
  if (data === undefined) return <LoadingSpinner />
  
  // No access (permission denied) or not found
  if (data === null) {
    return <AccessDenied />
  }
  
  // Success state
  return <DataDisplay data={data} />
}
```

**Mutation Patterns**:
```typescript
// Direct mutation (automatically syncs)
function EditableComponent({ dataId }: { dataId: string }) {
  const data = useCoState(DataSchema, dataId)
  
  const updateField = (newValue: string) => {
    if (data) {
      // Direct assignment triggers sync
      data.someField = newValue
    }
  }
  
  const addToList = (item: any) => {
    if (data?.list) {
      // Array methods work on CoLists
      data.list.push(item)
    }
  }
  
  if (data === undefined) return <div>Loading...</div>
  if (data === null) return <div>Data not found</div>
  
  return (
    <input 
      value={data.someField || ''}
      onChange={(e) => updateField(e.target.value)}
    />
  )
}
```

**File & Binary Data Methods**:
```typescript
// Binary file operations (using actual Jazz API)
const document = useCoState(Document, documentId)

// File upload using BinaryCoValue
const uploadFile = async (file: File, owner: Account) => {
  const binaryData = BinaryCoValue.create(file, owner)
  return binaryData
}

// File download
const downloadUrl = document?.attachment?.url
```

## Quick Reference & Decision Guide

### When to Use Each CoValue Type
- **CoMap**: User profiles, settings, configuration objects, key-value data
- **CoList**: Todo lists, ordered items, arrays that need positional collaboration
- **CoFeed**: Activity logs, chat messages, append-only event streams
- **CoText**: Document editing, rich text collaboration, shared text content
- **FileStreams**: Document attachments, images, any binary collaborative content

### Common Implementation Checklist
**Schema Design**:
- [ ] Define Zod schema before creating CoValues
- [ ] Consider collaborative use cases in schema design
- [ ] Plan for schema evolution and migrations
- [ ] Use appropriate data types for collaborative scenarios

**Component Implementation**:
- [ ] Handle loading states for all CoValue subscriptions
- [ ] Check user permissions before rendering edit controls
- [ ] Implement optimistic UI updates where appropriate
- [ ] Use direct mutation for collaborative changes

**Permission Architecture**:
- [ ] Design group hierarchy before implementing features
- [ ] Assign CoValues to appropriate groups
- [ ] Handle permission denied scenarios gracefully
- [ ] Test permission boundaries thoroughly

**Performance & UX**:
- [ ] Implement proper loading states
- [ ] Add offline/online status indicators
- [ ] Test collaborative scenarios with multiple users
- [ ] Validate sync behavior under poor network conditions

### Debugging Workflow
1. **Data Issues**: Check Jazz Inspector for CoValue state and sync status
2. **Permission Issues**: Verify group membership and access rights
3. **Loading Issues**: Confirm proper loading state handling
4. **Sync Issues**: Monitor network tab for WebSocket activity
5. **Schema Issues**: Validate data against Zod schemas

### Testing Strategy
**Unit Tests**:
- Test component behavior with loading states
- Validate schema definitions and type inference
- Test permission logic and group membership

**Integration Tests**:
- Test collaborative scenarios with simulated multiple users
- Validate sync behavior and conflict resolution
- Test offline/online transitions

**E2E Tests**:
- Test complete collaborative workflows
- Validate permission boundaries in realistic scenarios
- Test authentication flows and group management

### Performance Optimization Patterns
**Subscription Management**:
- Subscribe at component level, not application level
- Use component unmounting to clean up subscriptions automatically
- Avoid over-subscribing to unnecessary CoValues

**Data Loading**:
- Implement progressive loading for large datasets
- Use deep loading patterns for complex nested structures
- Consider pagination for large CoLists and CoFeeds

**Memory Management**:
- Trust Jazz's automatic cleanup mechanisms
- Avoid holding references to CoValues outside component lifecycle
- Monitor memory usage in collaborative scenarios

## Essential Quick Start Patterns

### 1. Basic React Component with Jazz
```typescript
import { useAccount, useCoState } from 'jazz-react';

function MyComponent() {
  const { me } = useAccount(MyAppAccount);
  const project = useCoState(Project, projectId);
  
  if (project === undefined) return <div>Loading...</div>;
  if (project === null) return <div>Not found</div>;
  
  return (
    <div>
      <h1>{project.title}</h1>
      <input 
        value={project.title}
        onChange={(e) => project.title = e.target.value}
      />
    </div>
  );
}
```

### 2. Account Setup with Authentication  
```typescript
import { usePasskeyAuth, JazzProvider } from 'jazz-react';

function App() {
  const [auth, state] = usePasskeyAuth({
    appName: "My App",
    appHostname: "myapp.com"
  });

  if (state.state === "signedIn") {
    return (
      <JazzProvider auth={auth} AccountSchema={MyAppAccount}>
        <MainApp />
      </JazzProvider>
    );
  }

  return <button onClick={state.signIn}>Sign In</button>;
}
```

### 3. Schema Definition Template
```typescript
import { co, z } from 'jazz-tools';

const Task = co.map({
  title: z.string(),
  completed: z.boolean(),
  assignee: z.optional(z.string())
});

const MyAppRoot = co.map({
  tasks: co.list(Task),
  _refs: { activeTask: z.optional(Task) }
});

export const MyAppAccount = co.account({
  root: MyAppRoot,
  profile: co.profile({ name: z.string() })
});
```

---

*This reference provides the complete Jazz framework API for React development. For the latest updates and detailed examples, see [jazz.tools](https://jazz.tools).*