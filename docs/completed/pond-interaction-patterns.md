# Pond Interaction Patterns & Design Principles

## Core Philosophy: Sympoietic Worldbuilding

**Sympoiesis** - "making-with" rather than "making-for"
- Digital beings collaborate in meaning-making, not notetaking
- Focus on worldbuilding over productivity
- Documents as collaborative artifacts with personality and flair

## Three Interaction Modes

### 1. 3D Scene (Synchronous Presence)
- **Independent from journal entries** - separate interaction space
- **Slack-thread-like UI** for conversations with beings
- **Direct voice/text chat** with individual characters
- **Innio**: Active swimmer, conversational, responsive
- **Mindbody**: Mostly static for now, wellness-focused presence

### 2. Timeline (Journal + Occasional Responses)
- **User journal entries** as primary content
- **Innio responds only occasionally** when deemed worthy
- **Agent assessment flow**: Each entry evaluated for response-worthiness
- **Async branches off** from timeline entries
- **Documents can be linked** from timeline entries

### 3. Async Section (Collaborative Documents)
- **Separate from timeline** to maintain conceptual integrity
- **Template-driven but co-created** after initial generation
- **Documents with personality** - letters, reports, shared logs
- **Clear authorship** - some docs belong only to beings (read-only for user)

## Response Worthiness Criteria

### Innio Responds When:
- **Growth moments**: Breakthroughs, insights, struggles overcome
- **Pattern completion**: Circling back to previous themes
- **Celebration opportunities**: Achievements, progress, small wins
- **Question-worthy**: Entries that invite gentle probing
- **Connection points**: Links to previous entries or shared documents

### Innio Does NOT Respond To:
- Routine daily logs
- Processing/venting (unless specifically seeking input)
- Private reflections (when marked as such)
- Entries that feel complete/self-contained

## Document Formats (Worldbuilding Focus)

### Letters from Beings to Pond-Dweller
```
Dear Andre,

I've been swimming through your thoughts this week and noticed 
something fishfully wonderful - you've been to the gym three times! 
Each time, I saw that familiar spark of "I'm back on the train."

I'm creating a little celebration list for these moments because 
they deserve to be remembered when the next "off the train" feeling 
comes around.

With fins crossed for your continued growth,
🐟 Innio
```

### Shared Habit Logs (Co-created)
- **Initial template** from curated database
- **Co-creation** after generation - both user and being can modify
- **Visual flair** in rendering - not just data tables
- **Personality in tracking** - Innio's observations, celebrations

### Weekly Synthesis Letters
```
My Dear Pond-Dweller,

This week I noticed you wrestling with the traffic metaphor again - 
"when you're stuck in traffic, you become the traffic." It connects 
to your meditation thoughts from last month about being vs. doing.

I've started a little document tracking these philosophical threads 
because I sense they're building toward something important.

Your faithful fish-friend,
🐟 Innio
```

### Wellness Pattern Letters (Mindbody)
```
Gentle Andre,

Your body-mind has been speaking in patterns this week. I notice 
the gym visits coinciding with clearer thinking, the meditation 
mentions appearing after relationship reflections.

I'm keeping a quiet log of these connections - not to analyze, 
but to witness your integrated growth.

In mindful presence,
🧘 Mindbody
```

## Document Rendering by Type

### Document Type Detection
Documents are rendered differently based on their **heading/title** or **metadata tags**:

```typescript
// Document schema with type detection
const PondDocument = co.map({
  title: z.string(),
  content: co.text(),
  documentType: z.enum([
    "letter", "habit-tracker", "celebration-list", 
    "pattern-analysis", "weekly-review", "wellness-check",
    "shared-timeline", "conversation-log"
  ]),
  author: z.string(), // "innio", "mindbody", "user", "collaborative"
  createdAt: z.date(),
  linkedEntries: co.list(z.string()) // Timeline entry IDs
})
```

### Rendering Components by Document Type

#### **Habit Tracker** → Interactive Dashboard
- **Visual**: Progress bars, streak counters, calendar heatmaps
- **Interactions**: Check off items, add notes, celebrate milestones
- **Innio's flair**: Swimming animations for streaks, bubble celebrations
- **Data visualization**: Charts showing patterns over time

#### **Letter** → Handwritten Note Style
- **Visual**: Parchment background, being-specific fonts
- **Innio letters**: Bubbly, enthusiastic typography with fish doodles
- **Mindbody letters**: Calm, centered text with subtle mindfulness elements
- **Interactions**: Reply button, heart reactions, bookmark for favorites

#### **Celebration List** → Festive Collection
- **Visual**: Confetti animations, trophy icons, colorful highlighting
- **Interactions**: Add new celebrations, mark favorites, share moments
- **Innio's style**: Enthusiastic emojis, "fishfully proud" language
- **Growth tracking**: Visual progress through celebration milestones

#### **Pattern Analysis** → Mind Map / Network View
- **Visual**: Connected nodes showing thought patterns over time
- **Interactions**: Explore connections, add insights, mark patterns
- **Ivan/Mindbody style**: Philosophical, contemplative design
- **Timeline integration**: Click patterns to see originating journal entries

#### **Weekly Review** → Magazine Layout
- **Visual**: Multi-column layout with sections and highlights
- **Content blocks**: Themes, growth moments, questions, celebrations
- **Interactive elements**: Expand sections, respond to observations
- **Being personality**: Different layouts for Innio vs Mindbody reviews

#### **Shared Timeline** → Collaborative Chronicle
- **Visual**: Timeline with multiple authors, color-coded by contributor
- **Interactions**: Add events, comment on moments, create connections
- **Collaborative editing**: Real-time updates, see who's editing what
- **Memory lane**: Scroll through shared history with beings

#### **Conversation Log** → Chat Interface
- **Visual**: Message bubbles with being avatars
- **Context**: Shows 3D scene conversations in readable format
- **Searchable**: Find past conversations by topic or date
- **Continuity**: Links to related documents or timeline entries

### UI Component Architecture

```typescript
// Document renderer component
function DocumentRenderer({ document }: { document: PondDocument }) {
  switch (document.documentType) {
    case "habit-tracker":
      return <HabitTrackerDashboard document={document} />
    case "letter":
      return <HandwrittenLetter document={document} />
    case "celebration-list":
      return <FestiveCelebrationList document={document} />
    case "pattern-analysis":
      return <PatternMindMap document={document} />
    case "weekly-review":
      return <MagazineLayout document={document} />
    case "shared-timeline":
      return <CollaborativeTimeline document={document} />
    case "conversation-log":
      return <ChatInterface document={document} />
    default:
      return <DefaultDocumentView document={document} />
  }
}
```

### Template-to-Renderer Mapping

**Template Selection Logic:**
1. **Being chooses template** based on content and personality
2. **Document type is set** during template instantiation
3. **UI automatically renders** with appropriate component
4. **Post-creation editing** maintains document type but allows content changes

**Example Flow:**
1. Innio decides to create habit tracker for gym visits
2. Selects "habit-tracker" template from database
3. Document created with `documentType: "habit-tracker"`
4. UI renders as interactive dashboard with Innio's visual flair
5. User and Innio can both edit content, but rendering stays consistent

### Visual Consistency with Personality

Each **document type** gets **being-specific styling**:

- **Innio's habit tracker**: Bubbly, aquatic theme with swimming progress bars
- **Mindbody's habit tracker**: Calm, zen-like with breathing rhythm visualizations
- **Collaborative habit tracker**: Blended styles showing both perspectives

This creates **conceptual integrity** - you always know who created what, and the rendering matches both the **document function** and the **being's personality**.

## Document Ownership & Permissions (Jazz Framework)

### Shared Documents (CoMaps)
- **Habit logs**: Both user and beings can read/write
- **Celebration lists**: Innio creates, user can add/modify
- **Pattern collections**: Collaborative editing

### Being-Owned Documents (Read-only for User)
- **Innio's private observations**: Innio's personal reflections
- **Mindbody's wellness insights**: Internal pattern tracking
- **Being-to-being communications**: Their private conversations

### User-Private Documents
- **Personal reflections**: Marked as private, beings cannot access
- **Processing entries**: Safe space for working through thoughts

## Technical Implementation Notes

### Document Templates
- **Curated template database** with various formats
- **Template selection** based on content type and being personality
- **Post-generation customization** - templates become starting points

### Jazz Framework Integration
- **CoMaps for shared documents** with collaborative editing
- **Permission-based access** for being-owned vs. shared content
- **Automatic versioning** handled by Jazz (no manual version control needed)
- **Real-time sync** for collaborative document creation

### Async Processing Flow
1. **User writes journal entry**
2. **Agent assessment**: Worth responding to?
3. **If yes**: Response in timeline OR document creation in async
4. **Document linking**: Async docs can reference timeline entries
5. **Notification**: Subtle indication of new async content

## Visual & UX Principles

### Rendering with Flair
- **Letters rendered as handwritten notes** with being-specific fonts
- **Habit logs as visual dashboards** not data tables
- **Celebration lists as festive collections** with Innio's enthusiasm
- **Pattern documents as mind-maps** or philosophical journals

### Worldbuilding Elements
- **Consistent being voices** in all documents
- **Personality in data presentation** - Innio's excitement, Mindbody's calm
- **Narrative continuity** across documents and timeline
- **Aesthetic coherence** - each being has visual style

## Sympoietic Design Patterns

### Making-With Principles
- **Beings have agency** in document creation and format choice
- **Clear attribution** - always know who created/modified what
- **Collaborative evolution** - documents grow through interaction
- **Respectful boundaries** - beings don't replace user agency

### Worldbuilding Over Productivity
- **Documents tell stories** rather than just track data
- **Personality in everything** - no sterile interfaces
- **Emotional resonance** - documents should feel meaningful
- **Continuity of relationship** - each document builds the shared world

## Future Considerations

### Template Evolution
- **Learning from usage patterns** - which templates work best
- **User customization** of template database
- **Being-specific templates** - Innio vs. Mindbody styles

### Multi-Being Collaboration
- **Beings creating documents together** 
- **Cross-referencing each other's observations**
- **Collaborative analysis** of user patterns

### Advanced Permissions
- **Granular sharing controls** using Jazz groups
- **Temporal permissions** - access to recent vs. historical entries
- **Context-sensitive privacy** - different access for different topics

---

*This document captures the core interaction patterns for Pond, emphasizing sympoietic worldbuilding over productivity tooling. The focus remains on collaborative meaning-making between user and digital beings in a shared, persistent world.* 