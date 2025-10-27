import rawVersionsData from '../../config/versions.json';

// Type assertion to ensure the imported data matches our interface
const versionsData = rawVersionsData as VersionsData;

export interface VersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseType: 'stable' | 'beta' | 'rc' | 'alpha';
  environment: 'development' | 'staging' | 'production';
  features: string[];
  bugfixes: string[];
  breakingChanges: string[];
  notes: string;
}

interface VersionsData {
  currentVersion: string;
  versions: VersionInfo[];
}

class VersionService {
  private versionsData: VersionsData;
  private versionsMap: Map<string, VersionInfo>;

  constructor() {
    this.versionsData = versionsData;
    this.versionsMap = new Map(
      this.versionsData.versions.map(version => [version.version, version])
    );
  }

  public getCurrentVersion(): VersionInfo {
    return this.getVersionInfo(this.versionsData.currentVersion) || this.versionsData.versions[0];
  }

  public getVersionInfo(version: string): VersionInfo | undefined {
    return this.versionsMap.get(version);
  }

  public getVersionHistory(): VersionInfo[] {
    return [...this.versionsData.versions].sort((a, b) => 
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );
  }

  public getVersionBadgeInfo(releaseType: VersionInfo['releaseType']): { text: string; color: string } {
    const colorMap: Record<string, string> = {
      stable: '#34A853',
      beta: '#007AFF',
      rc: '#FF9500',
      alpha: '#FF3B30',
    };

    return {
      text: releaseType.toUpperCase(),
      color: colorMap[releaseType] || '#8E8E93',
    };
  }

  public getBuildInfo() {
    return {
      buildId: `build-${this.getCurrentVersion().buildNumber}`,
      buildTime: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      gitBranch: process.env.GIT_BRANCH || 'main',
      buildEnvironment: process.env.NODE_ENV || 'development',
      buildMachine: process.env.HOSTNAME || 'unknown',
    };
  }
}

export const versionService = new VersionService();
