// Device fingerprint collection for anti-spoofing triangulation

export interface DeviceFingerprint {
  device_hash: string;
  ip_address?: string;
  user_agent: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  platform: string;
  has_touch: boolean;
  has_accelerometer: boolean;
  canvas_hash: string;
  wifi_bssid?: string;
  cell_tower_id?: string;
  signals: {
    mock_location_enabled?: boolean;
    accelerometer_variance?: number;
    battery_level?: number;
    connection_type?: string;
    gpu_renderer?: string;
  };
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("GigShield🛡️", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("anti-spoof", 4, 35);
    return canvas.toDataURL().slice(-32);
  } catch {
    return "canvas-blocked";
  }
}

function getGPURenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";
    const ext = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "no-debug-info";
    return (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || "unknown";
  } catch {
    return "webgl-blocked";
  }
}

async function checkAccelerometer(): Promise<{ available: boolean; variance?: number }> {
  return new Promise((resolve) => {
    if (!("DeviceMotionEvent" in window)) {
      resolve({ available: false });
      return;
    }

    const readings: number[] = [];
    let timeout: ReturnType<typeof setTimeout>;

    const handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc && acc.x != null && acc.y != null && acc.z != null) {
        readings.push(Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2));
      }
      if (readings.length >= 10) {
        window.removeEventListener("devicemotion", handler);
        clearTimeout(timeout);
        const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
        const variance = readings.reduce((a, b) => a + (b - mean) ** 2, 0) / readings.length;
        resolve({ available: true, variance });
      }
    };

    window.addEventListener("devicemotion", handler);
    timeout = setTimeout(() => {
      window.removeEventListener("devicemotion", handler);
      resolve({ available: readings.length > 0, variance: readings.length > 0 ? 0 : undefined });
    }, 3000);
  });
}

export async function collectDeviceFingerprint(): Promise<DeviceFingerprint> {
  const ua = navigator.userAgent;
  const screenRes = `${screen.width}x${screen.height}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const platform = navigator.platform || "unknown";
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const canvasHash = getCanvasHash();
  const gpuRenderer = getGPURenderer();
  const accel = await checkAccelerometer();

  // Connection info
  const conn = (navigator as any).connection;
  const connectionType = conn?.effectiveType || conn?.type || "unknown";

  // Battery
  let batteryLevel: number | undefined;
  try {
    const battery = await (navigator as any).getBattery?.();
    if (battery) batteryLevel = battery.level;
  } catch { /* not available */ }

  // Create a composite hash of device characteristics
  const rawFingerprint = [ua, screenRes, tz, lang, platform, canvasHash, gpuRenderer, String(hasTouch)].join("|");
  const deviceHash = await hashString(rawFingerprint);

  return {
    device_hash: deviceHash,
    user_agent: ua,
    screen_resolution: screenRes,
    timezone: tz,
    language: lang,
    platform,
    has_touch: hasTouch,
    has_accelerometer: accel.available,
    canvas_hash: canvasHash,
    signals: {
      accelerometer_variance: accel.variance,
      battery_level: batteryLevel,
      connection_type: connectionType,
      gpu_renderer: gpuRenderer,
    },
  };
}
