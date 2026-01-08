/**
 * Session Storage Module
 * 
 * Handles saving and loading session data to device storage.
 * Uses JSONL format for samples (one JSON object per line) for efficient
 * streaming writes and reads.
 * 
 * Directory structure:
 * - [documentDirectory]/sessions/
 *   - [sessionId]/
 *     - metadata.json
 *     - samples.jsonl
 *     - export.csv (generated on demand)
 */

// Using legacy API for compatibility
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { 
  Session, 
  SessionMetadata, 
  SensorSample, 
  SwingEvent 
} from '../types';
import { generateUUID } from '../utils/math';

// Base directory for all session data
const SESSIONS_DIR = `${FileSystem.documentDirectory}sessions/`;

/**
 * Initialize storage directory
 */
async function ensureSessionsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(SESSIONS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SESSIONS_DIR, { intermediates: true });
  }
}

/**
 * Get session directory path
 */
function getSessionDir(sessionId: string): string {
  return `${SESSIONS_DIR}${sessionId}/`;
}

/**
 * Get metadata file path for a session
 */
function getMetadataPath(sessionId: string): string {
  return `${getSessionDir(sessionId)}metadata.json`;
}

/**
 * Get samples file path for a session
 */
function getSamplesPath(sessionId: string): string {
  return `${getSessionDir(sessionId)}samples.jsonl`;
}

/**
 * Get CSV export path for a session
 */
function getCsvPath(sessionId: string): string {
  return `${getSessionDir(sessionId)}export.csv`;
}

/**
 * Session Writer - for streaming writes during recording
 */
export class SessionWriter {
  private sessionId: string;
  private metadata: SessionMetadata;
  private sampleBuffer: SensorSample[] = [];
  private writePromise: Promise<void> | null = null;
  private isInitialized: boolean = false;
  private sampleCount: number = 0;
  
  // Buffer settings
  private readonly BUFFER_SIZE = 100; // Write every 100 samples (1 second at 100Hz)
  
  constructor(deviceId: string, deviceName?: string, targetSampleRate: number = 100) {
    this.sessionId = generateUUID();
    
    this.metadata = {
      id: this.sessionId,
      name: `Session ${new Date().toLocaleDateString()}`,
      startTime: new Date().toISOString(),
      durationMs: 0,
      sampleCount: 0,
      targetSampleRate,
      deviceId,
      deviceName,
      events: [],
    };
  }
  
  /**
   * Initialize session directory and files
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await ensureSessionsDir();
    
    const sessionDir = getSessionDir(this.sessionId);
    await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });
    
    // Write initial metadata
    await this.saveMetadata();
    
    // Create empty samples file
    await FileSystem.writeAsStringAsync(getSamplesPath(this.sessionId), '');
    
    this.isInitialized = true;
  }
  
  /**
   * Add a sample to the session
   */
  async addSample(sample: SensorSample): Promise<void> {
    this.sampleBuffer.push(sample);
    this.sampleCount++;
    
    // Flush buffer when it reaches threshold
    if (this.sampleBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }
  
  /**
   * Add a detected swing event
   */
  addEvent(event: SwingEvent): void {
    this.metadata.events.push(event);
  }
  
  /**
   * Flush sample buffer to disk
   */
  private async flushBuffer(): Promise<void> {
    if (this.sampleBuffer.length === 0) return;
    
    // Wait for any pending write
    if (this.writePromise) {
      await this.writePromise;
    }
    
    const samplesToWrite = [...this.sampleBuffer];
    this.sampleBuffer = [];
    
    // Convert samples to JSONL
    const jsonl = samplesToWrite
      .map(s => JSON.stringify(s))
      .join('\n') + '\n';
    
    // Read existing content and append (expo-file-system doesn't support append in all versions)
    const existingContent = await FileSystem.readAsStringAsync(
      getSamplesPath(this.sessionId)
    ).catch(() => '');
    
    // Write combined content
    this.writePromise = FileSystem.writeAsStringAsync(
      getSamplesPath(this.sessionId),
      existingContent + jsonl
    );
    
    await this.writePromise;
    this.writePromise = null;
  }
  
  /**
   * Finalize the session (call when recording stops)
   */
  async finalize(): Promise<SessionMetadata> {
    // Flush remaining samples
    await this.flushBuffer();
    
    // Update metadata with final values
    this.metadata.endTime = new Date().toISOString();
    this.metadata.sampleCount = this.sampleCount;
    
    const startMs = new Date(this.metadata.startTime).getTime();
    const endMs = new Date(this.metadata.endTime).getTime();
    this.metadata.durationMs = endMs - startMs;
    
    // Calculate actual sample rate
    if (this.metadata.durationMs > 0) {
      this.metadata.actualSampleRate = 
        (this.sampleCount / this.metadata.durationMs) * 1000;
    }
    
    // Save final metadata
    await this.saveMetadata();
    
    return this.metadata;
  }
  
  /**
   * Save metadata to disk
   */
  private async saveMetadata(): Promise<void> {
    await FileSystem.writeAsStringAsync(
      getMetadataPath(this.sessionId),
      JSON.stringify(this.metadata, null, 2)
    );
  }
  
  /**
   * Update session name
   */
  async setName(name: string): Promise<void> {
    this.metadata.name = name;
    await this.saveMetadata();
  }
  
  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Get current metadata
   */
  getMetadata(): SessionMetadata {
    return { ...this.metadata, sampleCount: this.sampleCount };
  }
}

/**
 * List all saved sessions
 */
export async function listSessions(): Promise<SessionMetadata[]> {
  await ensureSessionsDir();
  
  const sessions: SessionMetadata[] = [];
  
  try {
    const contents = await FileSystem.readDirectoryAsync(SESSIONS_DIR);
    
    for (const sessionId of contents) {
      try {
        const metadataPath = getMetadataPath(sessionId);
        const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
        
        if (metadataInfo.exists) {
          const content = await FileSystem.readAsStringAsync(metadataPath);
          const metadata = JSON.parse(content) as SessionMetadata;
          sessions.push(metadata);
        }
      } catch (error) {
        console.warn(`Failed to load session ${sessionId}:`, error);
      }
    }
    
    // Sort by start time, newest first
    sessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
  } catch (error) {
    console.error('Failed to list sessions:', error);
  }
  
  return sessions;
}

/**
 * Load a complete session (metadata + samples)
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
  try {
    // Load metadata
    const metadataContent = await FileSystem.readAsStringAsync(
      getMetadataPath(sessionId)
    );
    const metadata = JSON.parse(metadataContent) as SessionMetadata;
    
    // Load samples
    const samplesContent = await FileSystem.readAsStringAsync(
      getSamplesPath(sessionId)
    );
    
    const samples: SensorSample[] = samplesContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as SensorSample);
    
    return { metadata, samples };
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Load only session metadata
 */
export async function loadSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  try {
    const content = await FileSystem.readAsStringAsync(getMetadataPath(sessionId));
    return JSON.parse(content) as SessionMetadata;
  } catch (error) {
    console.error(`Failed to load session metadata ${sessionId}:`, error);
    return null;
  }
}

/**
 * Update session metadata
 */
export async function updateSessionMetadata(
  sessionId: string, 
  updates: Partial<SessionMetadata>
): Promise<void> {
  const metadata = await loadSessionMetadata(sessionId);
  if (!metadata) throw new Error('Session not found');
  
  const updated = { ...metadata, ...updates, id: sessionId };
  
  await FileSystem.writeAsStringAsync(
    getMetadataPath(sessionId),
    JSON.stringify(updated, null, 2)
  );
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionDir = getSessionDir(sessionId);
  await FileSystem.deleteAsync(sessionDir, { idempotent: true });
}

/**
 * Generate CSV export for a session
 */
export async function generateCsv(sessionId: string): Promise<string> {
  const session = await loadSession(sessionId);
  if (!session) throw new Error('Session not found');
  
  const { metadata, samples } = session;
  
  // CSV header
  const headers = [
    'timestamp_ms',
    'quat_w', 'quat_x', 'quat_y', 'quat_z',
    'euler_roll', 'euler_pitch', 'euler_yaw',
    'accel_x', 'accel_y', 'accel_z',
    'gyro_x', 'gyro_y', 'gyro_z',
    'mag_x', 'mag_y', 'mag_z',
  ].join(',');
  
  // CSV rows
  const rows = samples.map(s => [
    s.timestampMs,
    s.quat?.w ?? '', s.quat?.x ?? '', s.quat?.y ?? '', s.quat?.z ?? '',
    s.euler?.roll ?? '', s.euler?.pitch ?? '', s.euler?.yaw ?? '',
    s.accel.x, s.accel.y, s.accel.z,
    s.gyro.x, s.gyro.y, s.gyro.z,
    s.mag.x, s.mag.y, s.mag.z,
  ].join(','));
  
  const csv = [headers, ...rows].join('\n');
  
  // Save CSV file
  const csvPath = getCsvPath(sessionId);
  await FileSystem.writeAsStringAsync(csvPath, csv);
  
  return csvPath;
}

/**
 * Share session data (JSONL or CSV)
 */
export async function shareSession(
  sessionId: string, 
  format: 'jsonl' | 'csv'
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  
  let filePath: string;
  
  if (format === 'csv') {
    filePath = await generateCsv(sessionId);
  } else {
    filePath = getSamplesPath(sessionId);
  }
  
  await Sharing.shareAsync(filePath, {
    mimeType: format === 'csv' ? 'text/csv' : 'application/json',
    dialogTitle: `Share Session (${format.toUpperCase()})`,
  });
}

/**
 * Share session metadata
 */
export async function shareSessionMetadata(sessionId: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  
  await Sharing.shareAsync(getMetadataPath(sessionId), {
    mimeType: 'application/json',
    dialogTitle: 'Share Session Metadata',
  });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  sessionCount: number;
  totalSizeBytes: number;
}> {
  await ensureSessionsDir();
  
  let totalSize = 0;
  let sessionCount = 0;
  
  try {
    const contents = await FileSystem.readDirectoryAsync(SESSIONS_DIR);
    sessionCount = contents.length;
    
    for (const sessionId of contents) {
      const sessionDir = getSessionDir(sessionId);
      const dirInfo = await FileSystem.getInfoAsync(sessionDir);
      if (dirInfo.exists && 'size' in dirInfo) {
        totalSize += (dirInfo as any).size || 0;
      }
    }
  } catch (error) {
    console.error('Failed to get storage stats:', error);
  }
  
  return { sessionCount, totalSizeBytes: totalSize };
}
