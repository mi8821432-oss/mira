export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  timestamp: number;
}

export interface ToolExecutionRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  result: any;
  status: 'executing' | 'success' | 'error';
  message: string;
  timestamp: number;
}

export interface ReminderItem {
  id: string;
  title: string;
  time: string;
  createdAt: number;
  active: boolean;
}

export interface SmartDeviceState {
  ambientLight: 'cyber-violet' | 'neon-cyan' | 'matrix-green' | 'solar-gold';
  overdriveMode: boolean;
  securityGrid: boolean;
  stealthMode: boolean;
}
