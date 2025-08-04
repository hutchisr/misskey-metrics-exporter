export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface MisskeyApiResponse {
  notesCount?: number;
  usersCount?: number;
  instancesCount?: number;
}

export interface MisskeyMeta {
  name?: string;
  version?: string;
  nodeVersion?: string;
  description?: string;
  maintainer?: {
    name?: string;
    email?: string;
  };
}

export interface MetricsData {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  totalNotes: number;
  recentNotes: {
    daily: number;
  };
  federation: {
    instances: number;
    remoteUsers: number;
  };
  database: {
    connections: number;
    size: number;
  };
}

export interface ExporterConfig {
  port: number;
  updateInterval: number;
  enableLogParsing: boolean;
  database: DatabaseConfig;
  misskeyUrl: string;
}
