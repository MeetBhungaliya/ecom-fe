import type { BaseEntity } from './common.types';

// ============================================
// USER & AUTH TYPES
// ============================================

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export enum Permission {
  // Products
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_EDIT = 'product:edit',
  PRODUCT_DELETE = 'product:delete',

  // Orders
  ORDER_VIEW = 'order:view',
  ORDER_PROCESS = 'order:process',
  ORDER_CANCEL = 'order:cancel',

  // Inventory
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_UPDATE = 'inventory:update',

  // Accounts
  ACCOUNT_VIEW = 'account:view',
  ACCOUNT_MANAGE = 'account:manage',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',

  // Automation
  AUTOMATION_VIEW = 'automation:view',
  AUTOMATION_MANAGE = 'automation:manage',

  // Media
  MEDIA_VIEW = 'media:view',
  MEDIA_UPLOAD = 'media:upload',
  MEDIA_DELETE = 'media:delete',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MANAGE = 'settings:manage',
  TEAM_MANAGE = 'team:manage',
}

export type User = BaseEntity & {
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  permissions: Permission[];
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
