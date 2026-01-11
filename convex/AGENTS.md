# CONVEX KNOWLEDGE BASE

**Generated:** 2025-01-10
**Commit:** cf077f7f
**Branch:** electron-desktop-integration-polaris-ide

## OVERVIEW
Backend database operations with Convex real-time DB for users, projects, files, conversations, and messages.

## STRUCTURE
```
convex/
├── schema.ts              # Database schema definition
├── users.ts               # User subscription queries/mutations
├── projects.ts            # Project CRUD operations
├── files.ts               # File system operations
├── conversations.ts       # Chat/conversation management
├── messages.ts            # Message CRUD operations
├── auth.ts                # Authentication helpers
├── auth.config.ts         # Convex auth configuration
├── system.ts              # Internal API for Inngest
├── constants.ts           # Default values and config
└── _generated/            # Auto-generated types
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Authentication** | `auth.ts`, `auth.config.ts` | Stack Auth integration, user verification |
| **Database Schema** | `schema.ts` | Tables: users, projects, files, conversations, messages |
| **User Operations** | `users.ts` | Subscription status, project limits, Paddle integration |
| **Project Operations** | `projects.ts` | CRUD for projects, ownership validation |
| **File System** | `files.ts` | File/folder operations, path resolution, recursive deletion |
| **Conversations** | `conversations.ts`, `messages.ts` | Chat management, message retrieval |
| **Internal API** | `system.ts` | Inngest background jobs, path-based file operations |
| **Constants** | `constants.ts` | Default values and configuration |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| defineSchema | Function | `schema.ts` | Database schema definition |
| verifyAuth | Function | `auth.ts` | User authentication check |
| createProject | Mutation | `projects.ts` | Create new project |
| getFiles | Query | `files.ts` | Retrieve project files |
| createConversation | Mutation | `conversations.ts` | Start new chat |
| writeFileByPath | Mutation | `system.ts` | Internal file writing |
| resolvePathToFile | Function | `system.ts` | Path to file ID conversion |

## CONVENTIONS
- **Authentication Required**: All queries/mutations call `verifyAuth()` first
- **Ownership Validation**: Check `project.ownerId === identity.subject`
- **Type Safety**: Use `v.id("table")` and `v.string()` for arguments
- **Index Usage**: Leverage database indexes (by_owner, by_project, etc.)
- **Recursive Operations**: Files/folders use recursive deletion/updates
- **Internal Key**: `system.ts` validates `POLARIS_CONVEX_INTERNAL_KEY`
- **Real-time Updates**: Convex handles optimistic UI updates automatically

## ANTI-PATTERNS (THIS PROJECT)
- **No Direct DB Access**: All operations through Convex queries/mutations
- **No Hard-coded User IDs**: Always verify current user identity
- **No Unauthenticated Operations**: Every endpoint requires Stack Auth
- **No Manual Index Creation**: Use `index()` in schema definitions
- **No Circular Dependencies**: Keep operations separated by domain
- **No Client-side DB Logic**: Database operations only in Convex functions
