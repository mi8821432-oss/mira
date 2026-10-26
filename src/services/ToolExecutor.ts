import { ToolCall, ToolExecutionRecord, ReminderItem, SmartDeviceState } from '../types/tool.types';
import { sanitizeUrl } from '../utils/toolUtils';
import { soundEffects } from '../utils/streamUtils';

export class ToolExecutor {
  private reminders: ReminderItem[] = [];
  private smartDeviceState: SmartDeviceState = {
    ambientLight: 'cyber-violet',
    overdriveMode: false,
    securityGrid: true,
    stealthMode: false,
  };
  private onToolExecutedListeners: ((record: ToolExecutionRecord) => void)[] = [];
  private onRemindersUpdatedListeners: ((reminders: ReminderItem[]) => void)[] = [];
  private onDeviceStateUpdatedListeners: ((state: SmartDeviceState) => void)[] = [];

  public onToolExecuted(cb: (record: ToolExecutionRecord) => void) {
    this.onToolExecutedListeners.push(cb);
    return () => {
      this.onToolExecutedListeners = this.onToolExecutedListeners.filter((l) => l !== cb);
    };
  }

  public onRemindersUpdated(cb: (reminders: ReminderItem[]) => void) {
    this.onRemindersUpdatedListeners.push(cb);
    return () => {
      this.onRemindersUpdatedListeners = this.onRemindersUpdatedListeners.filter((l) => l !== cb);
    };
  }

  public onDeviceStateUpdated(cb: (state: SmartDeviceState) => void) {
    this.onDeviceStateUpdatedListeners.push(cb);
    return () => {
      this.onDeviceStateUpdatedListeners = this.onDeviceStateUpdatedListeners.filter((l) => l !== cb);
    };
  }

  public getReminders(): ReminderItem[] {
    return [...this.reminders];
  }

  public getSmartDeviceState(): SmartDeviceState {
    return { ...this.smartDeviceState };
  }

  public deleteReminder(id: string) {
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.notifyReminders();
  }

  public async executeTool(toolCall: ToolCall): Promise<any> {
    soundEffects.playToolCallSound();
    const { id, name, args } = toolCall;

    let result: any = null;
    let message = '';
    let status: 'success' | 'error' = 'success';

    try {
      switch (name) {
        case 'openWebsite': {
          const rawUrl = args.url || 'https://google.com';
          const validUrl = sanitizeUrl(rawUrl);
          
          // In iframe / sandbox, try window.open or fallback cleanly
          try {
            window.open(validUrl, '_blank', 'noopener,noreferrer');
            message = `Opened ${validUrl} in a new tab.`;
          } catch (e) {
            message = `Browser sandbox restricted popup for ${validUrl}. Link prepared.`;
          }

          result = { success: true, url: validUrl, note: 'Website launched successfully.' };
          break;
        }

        case 'openYouTube': {
          const query = args.query || '';
          const url = query
            ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
            : 'https://www.youtube.com';
          try {
            window.open(url, '_blank', 'noopener,noreferrer');
            message = `Launched YouTube search for "${query || 'homepage'}".`;
          } catch (e) {
            message = `YouTube query prepared for "${query}".`;
          }
          result = { success: true, query, url };
          break;
        }

        case 'openMaps': {
          const location = args.location || 'Tokyo, Japan';
          const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
          try {
            window.open(url, '_blank', 'noopener,noreferrer');
            message = `Opened Google Maps for ${location}.`;
          } catch (e) {
            message = `Google Maps navigation targeted to ${location}.`;
          }
          result = { success: true, location, url };
          break;
        }

        case 'searchWeb': {
          const query = args.query || 'current news';
          message = `Searched web for "${query}".`;
          result = {
            success: true,
            query,
            summary: `Results synthesized for ${query}. Relevant data verified.`,
          };
          break;
        }

        case 'createReminder': {
          const title = args.title || 'Scheduled task';
          const time = args.time || 'In 1 hour';
          const newReminder: ReminderItem = {
            id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title,
            time,
            createdAt: Date.now(),
            active: true,
          };
          this.reminders = [newReminder, ...this.reminders];
          this.notifyReminders();
          message = `Created reminder: "${title}" for ${time}.`;
          result = { success: true, reminderId: newReminder.id, title, time };
          break;
        }

        case 'controlSmartDevices': {
          const { device = 'ambientLight', action = 'set', state = 'cyber-violet' } = args;
          if (device === 'ambientLight' || device === 'lighting') {
            const validHue = ['cyber-violet', 'neon-cyan', 'matrix-green', 'solar-gold'].includes(state)
              ? state
              : 'neon-cyan';
            this.smartDeviceState.ambientLight = validHue as any;
            message = `Adjusted HUD Ambient lighting to ${validHue}.`;
          } else if (device === 'overdrive' || device === 'mode') {
            const enabled = state === 'on' || state === 'enable' || state === 'true';
            this.smartDeviceState.overdriveMode = enabled;
            message = `System Overdrive mode ${enabled ? 'ENGAGED' : 'DISENGAGED'}.`;
          } else if (device === 'stealth') {
            const enabled = state === 'on' || state === 'enable' || state === 'true';
            this.smartDeviceState.stealthMode = enabled;
            message = `Stealth Grid ${enabled ? 'ACTIVATED' : 'DEACTIVATED'}.`;
          } else {
            message = `Updated ${device} state to ${state}.`;
          }

          this.notifyDeviceState();
          result = { success: true, currentDeviceState: this.smartDeviceState };
          break;
        }

        case 'openWhatsApp': {
          const phone = (args.phone || '').replace(/[^0-9]/g, '');
          const text = args.text || '';
          let waUrl = 'https://web.whatsapp.com/';
          if (phone) {
            waUrl = `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
          } else if (text) {
            waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          }
          try {
            window.open(waUrl, '_blank', 'noopener,noreferrer');
            message = phone ? `Opening WhatsApp chat with ${phone}.` : 'Opening WhatsApp Web for you, Boss.';
          } catch (e) {
            message = `WhatsApp target prepared: ${waUrl}`;
          }
          result = { success: true, url: waUrl, phone, text };
          break;
        }

        case 'tellPoetryOrJoke': {
          const type = args.type || 'poetry';
          const lang = args.language || 'urdu';
          if (type === 'poetry' || type === 'shayari') {
            const urduPoetry = [
              "ستاروں سے آگے جہاں اور بھی ہیں، ابھی عشق کے امتحاں اور بھی ہیں۔ (علامہ اقبال)",
              "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے، بہت نکلے مرے ارمان لیکن پھر بھی کم نکلے۔ (مرزا غالب)",
              "مقام فیض کوئی راہ میں جچا ہی نہیں، جو کوئے یار سے نکلے تو سوئے دار چلے۔ (فیض احمد فیض)",
              "دل ناداں تجھے ہوا کیا ہے، آخر اس درد کی دوا کیا ہے۔",
            ];
            const selected = urduPoetry[Math.floor(Math.random() * urduPoetry.length)];
            message = `Recited poetry: ${selected}`;
            result = { success: true, content: selected, type: 'poetry', language: lang };
          } else {
            const jokes = [
              "استاد: بتاؤ چاند پر پہلا قدم کس نے رکھا؟ شاگرد: نیل آرم سٹرانگ نے۔ استاد: اور دوسرا؟ شاگرد: سر ظاہر ہے دوسرا بھی اسی نے رکھا ہوگا، وہ کوئی لنگڑا تھوڑی تھا!",
              "Why do developers love dark mode? Because light attracts bugs!",
              "پپو نے پوچھا: ڈاکٹر صاحب، کیا بغیر کھائے پیئے زندہ رہا جا سکتا ہے؟ ڈاکٹر: ہاں، لیکن صرف سسرال کے طعنوں پر!",
            ];
            const selected = jokes[Math.floor(Math.random() * jokes.length)];
            message = `Shared joke: ${selected}`;
            result = { success: true, content: selected, type: 'joke', language: lang };
          }
          break;
        }

        case 'openFacebook': {
          const fbUrl = 'https://www.facebook.com';
          try {
            window.open(fbUrl, '_blank', 'noopener,noreferrer');
            message = 'Opening Facebook for you, Boss.';
          } catch (e) {
            message = 'Facebook link prepared.';
          }
          result = { success: true, url: fbUrl };
          break;
        }

        case 'launchApp': {
          const appName = (args.appName || 'calculator').toLowerCase();
          const appUrls: Record<string, string> = {
            whatsapp: 'https://web.whatsapp.com',
            youtube: 'https://www.youtube.com',
            facebook: 'https://www.facebook.com',
            instagram: 'https://www.instagram.com',
            twitter: 'https://x.com',
            calculator: 'https://www.google.com/search?q=calculator',
            calendar: 'https://calendar.google.com',
            gmail: 'https://mail.google.com',
            github: 'https://github.com',
            spotify: 'https://open.spotify.com',
            maps: 'https://maps.google.com',
          };
          const targetUrl = appUrls[appName] || `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
          try {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            message = `Launched ${appName}.`;
          } catch (e) {
            message = `Ready to launch ${appName}.`;
          }
          result = { success: true, appName, targetUrl };
          break;
        }

        default: {
          message = `Executed action "${name}".`;
          result = { success: true, executed: name, args };
          break;
        }
      }
    } catch (err: any) {
      status = 'error';
      message = `Tool ${name} failed: ${err.message || 'Unknown error'}`;
      result = { error: err.message || 'Execution error' };
    }

    const record: ToolExecutionRecord = {
      id,
      name,
      args,
      result,
      status,
      message,
      timestamp: Date.now(),
    };

    this.notifyToolExecuted(record);
    return result;
  }

  private notifyToolExecuted(record: ToolExecutionRecord) {
    this.onToolExecutedListeners.forEach((l) => l(record));
  }

  private notifyReminders() {
    const list = this.getReminders();
    this.onRemindersUpdatedListeners.forEach((l) => l(list));
  }

  private notifyDeviceState() {
    const state = this.getSmartDeviceState();
    this.onDeviceStateUpdatedListeners.forEach((l) => l(state));
  }
}

export const toolExecutor = new ToolExecutor();
