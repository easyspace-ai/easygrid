/**
 * User interface - simplified version from @teable/openapi
 */
export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  isAdmin?: boolean;
  hasPassword?: boolean;
  notifyMeta?: Record<string, unknown>;
  lastSignInTime?: string;
  deactivatedTime?: string;
  createdTime?: string;
}

/**
 * Session context type
 */
export interface ISession {
  user?: IUser;
}

export interface ISessionContext extends ISession {
  refresh: () => void;
  refreshAvatar: () => void;
}