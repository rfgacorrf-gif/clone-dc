export interface Config {
  discord: {
    token: string;
    clientId: string;
    guildId: string;
  };
  owner: {
    id: string;
  };
  dropbox: {
    appKey: string;
    appSecret: string;
    refreshToken: string;
    rootPath: string;
  };
  clone: {
    maxClones: number;
    queueConcurrency: number;
    maxFileSizeMB: number;
  };
  paths: {
    temp: string;
    output: string;
    data: string;
    logs: string;
    icon: string;
    image: string;
  };
  logging: {
    level: string;
  };
}

export interface CloneJob {
  id: string;
  source: string;
  prefix: string;
  number: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  dropboxLink?: string;
  originalPackageName?: string;
  newPackageName?: string;
  appName?: string;
}

export interface NameCounter {
  prefix: string;
  nextNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CloneHistory {
  id: string;
  jobId: string;
  prefix: string;
  number: string;
  status: string;
  clonedAt: Date;
  dropboxLink?: string;
  error?: string;
}

export interface APKMetadata {
  packageName: string;
  versionCode: string;
  versionName: string;
  appName: string;
}

export interface SystemInfo {
  cpu: string;
  ram: string;
  ramUsed: string;
  ramFree: string;
  storage: string;
  storageUsed: string;
  storageFree: string;
  uptime: string;
  docker: string;
  nodejs: string;
  java: string;
  apktool: string;
  aapt2: string;
  zipalign: string;
  apksigner: string;
}
