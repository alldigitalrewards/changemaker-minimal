/**
 * Factory Exports
 *
 * Unified interface for all test data factories
 * Provides composable, deterministic data generation
 */

// Auth provisioning
export {
  ensureAuthUser,
  ensureAuthUsers,
  deleteAuthUser,
  DEFAULT_PASSWORD,
  type AuthProvisioningOptions,
  type AuthProvisioningResult,
  type AuthProvisioningContext,
} from "../auth-provisioning";

// Workspace factory
export {
  createWorkspace,
  createWorkspaces,
  upsertWorkspace,
  upsertWorkspaces,
  DEFAULT_WORKSPACES,
  type WorkspaceData,
  type WorkspaceFactoryOptions,
} from "./workspace.factory";

// User factory
export {
  createUserWithMemberships,
  createUsersWithMemberships,
  DEFAULT_USER_PREFERENCES,
  type UserData,
  type WorkspaceMembershipData,
  type UserWithMembershipData,
  type UserFactoryOptions,
} from "./user.factory";

// Challenge factory
export {
  createChallenge,
  createChallengeFromTemplate,
  createChallengesForWorkspace,
  createChallengesForWorkspaces,
  appendWorkspaceName,
  CHALLENGE_TEMPLATES,
  type ChallengeTemplate,
  type ChallengeData,
  type ChallengeFactoryOptions,
} from "./challenge.factory";
