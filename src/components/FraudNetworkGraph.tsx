import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Smartphone, MapPin, Zap, Link2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FraudNode {
  id: string;
  name: string;
  flagged: boolean;
  type: 'worker' | 'device' | 'upi' | 'zone' | 'velocity' | 'gps';
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface FraudLink {
  source: string;
  target: string;
  type: string;
}

const NODE_COLORS: Record<string, string> = {
  worker_flagged: '#EF4444',
  worker_clean: '#3B82F6',
  device: '#F59E0B',
  upi: '#A855F7',
  zone: '#6B7280',
  velocity: '#F97316',
  gps: '#EC4899',
};

const LINK_COLORS: Record<string, string> = {
  'Correlated claims': '#EF4444',
  'Collusion': '#A855F7',
  'Shared device': '#F59E0B',
  'GPS mismatch': '#EC4899',
  'High frequency': '#F97316',
  'Same zone': '#374151',
};

export default function FraudNetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<FraudNode[]>([]);
  const linksRef = useRef<FraudLink[]>([]);
  const draggingRef = useRef<FraudNode | null>(null);
  const hoveredRef = useRef<FraudNode | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: FraudNode[]; links: FraudLink[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<FraudNode | null>(null);
  const [stats, setStats] = useState({ flaggedWorkers: 0, alerts: 0, connections: 0 });

  // Fetch data
  useEffect(() => {
    const fetchFraudData = async () => {
      const { data: claims } = await supabase
        .from('claims')
        .select('*, policies!inner(worker_id, workers!inner(name, zone_id))')
        .or('status.eq.flagged,status.eq.rejected')
        .order('fraud_score', { ascending: false })
        .limit(30);

      if (!claims || claims.length === 0) {
        setLoading(false);
        return;
      }

      const nodes: FraudNode[] = [];
      const links: FraudLink[] = [];
      const nodeIds = new Set<string>();

      const addNode = (node: Omit<FraudNode, 'x' | 'y' | 'vx' | 'vy'>) => {
        if (!nodeIds.has(node.id)) {
          nodeIds.add(node.id);
          nodes.push({ ...node, x: 0, y: 0, vx: 0, vy: 0 });
        }
      };

      claims.forEach((c: any) => {
        const workerId = c.policies?.worker_id;
        const workerName = c.policies?.workers?.name || 'Unknown';
        const zoneId = c.policies?.workers?.zone_id;
        const details = (c.fraud_details as Record<string, any>) || {};

        addNode({ id: workerId, name: workerName, flagged: c.fraud_score > 0.6, type: 'worker' });

        if (zoneId) {
          const zoneName = zoneId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          addNode({ id: `zone-${zoneId}`, name: zoneName, flagged: false, type: 'zone' });
          if (!links.find(l => l.source === workerId && l.target === `zone-${zoneId}`)) {
            links.push({ source: workerId, target: `zone-${zoneId}`, type: 'Same zone' });
          }
        }

        if (details.device_fingerprint_mismatch || details.shared_device_id) {
          const deviceId = details.shared_device_id || `dev-${workerId.slice(0, 6)}`;
          addNode({ id: `device-${deviceId}`, name: deviceId, flagged: true, type: 'device' });
          links.push({ source: workerId, target: `device-${deviceId}`, type: 'Shared device' });
        }

        if (details.gps_mismatch || details.location_spoofing_detected) {
          addNode({ id: `gps-${workerId}`, name: 'GPS Spoof', flagged: true, type: 'gps' });
          links.push({ source: workerId, target: `gps-${workerId}`, type: 'GPS mismatch' });
        }

        if (details.velocity_check_failed || details.high_frequency_claims || details['3_claims_in_48hrs']) {
          addNode({ id: `vel-${workerId}`, name: 'Velocity', flagged: true, type: 'velocity' });
          links.push({ source: workerId, target: `vel-${workerId}`, type: 'High frequency' });
        }

        if (details.network_collusion_detected) {
          addNode({ id: 'collusion-ring', name: 'Collusion Ring', flagged: true, type: 'upi' });
          links.push({ source: workerId, target: 'collusion-ring', type: 'Collusion' });
        }
      });

      // Cross-link flagged workers in same zone
      const flaggedByZone: Record<string, string[]> = {};
      claims.forEach((c: any) => {
        const zoneId = c.policies?.workers?.zone_id;
        const workerId = c.policies?.worker_id;
        if (zoneId && c.fraud_score > 0.5) {
          if (!flaggedByZone[zoneId]) flaggedByZone[zoneId] = [];
          if (!flaggedByZone[zoneId].includes(workerId)) flaggedByZone[zoneId].push(workerId);
        }
      });
      Object.values(flaggedByZone).forEach(workers => {
        for (let i = 0; i < workers.length; i++) {
          for (let j = i + 1; j < workers.length; j++) {
            links.push({ source: workers[i], target: workers[j], type: 'Correlated claims' });
          }
        }
      });

      setStats({
        flaggedWorkers: nodes.filter(n => n.type === 'worker' && n.flagged).length,
        alerts: nodes.filter(n => n.type !== 'worker' && n.type !== 'zone' && n.flagged).length,
        connections: links.filter(l => l.type !== 'Same zone').length,
      });

      setGraphData({ nodes, links });
      setLoading(false);
    };

    fetchFraudData();
  }, []);

  // Initialize positions
  useEffect(() => {
    if (!graphData || !containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = 480;
    const cx = w / 2;
    const cy = h / 2;

    graphData.nodes.forEach((n, i) => {
      const angle = (i / graphData.nodes.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 80;
      n.x = cx + Math.cos(angle) * radius;
      n.y = cy + Math.sin(angle) * radius;
    });

    nodesRef.current = graphData.nodes;
    linksRef.current = graphData.links;
  }, [graphData]);

  // Force simulation + canvas render
  const simulate = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 480;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const cx = w / 2;
    const cy = h / 2;

    // Simple force simulation
    const alpha = 0.15;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Center force
    nodes.forEach(n => {
      if (n.fx != null) { n.x = n.fx; n.vy = 0; }
      if (n.fy != null) { n.y = n.fy; n.vx = 0; }
      if (n.fx != null || n.fy != null) return;
      n.vx += (cx - n.x) * 0.002;
      n.vy += (cy - n.y) * 0.002;
    });

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 800 / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        if (a.fx == null) { a.vx -= dx; }
        if (a.fy == null) { a.vy -= dy; }
        if (b.fx == null) { b.vx += dx; }
        if (b.fy == null) { b.vy += dy; }
      }
    }

    // Link attraction
    links.forEach(l => {
      const a = nodeMap.get(l.source);
      const b = nodeMap.get(l.target);
      if (!a || !b) return;
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = l.type === 'Same zone' ? 140 : 100;
      const force = (dist - targetDist) * 0.008;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      if (a.fx == null) { a.vx += dx; }
      if (a.fy == null) { a.vy += dy; }
      if (b.fx == null) { b.vx -= dx; }
      if (b.fy == null) { b.vy -= dy; }
    });

    // Apply velocity
    nodes.forEach(n => {
      if (n.fx != null && n.fy != null) return;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
      // Bounds
      n.x = Math.max(40, Math.min(w - 40, n.x));
      n.y = Math.max(40, Math.min(h - 40, n.y));
    });

    // --- RENDER ---
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    bgGrad.addColorStop(0, 'rgba(30, 41, 59, 0.4)');
    bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 16);
    ctx.fill();

    // Grid dots
    ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
    for (let gx = 20; gx < w; gx += 30) {
      for (let gy = 20; gy < h; gy += 30) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw links
    links.forEach(l => {
      const a = nodeMap.get(l.source);
      const b = nodeMap.get(l.target);
      if (!a || !b) return;

      const color = LINK_COLORS[l.type] || '#374151';
      const isDanger = l.type === 'Correlated claims' || l.type === 'Collusion';

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = isDanger ? 2.5 : 1.5;
      ctx.globalAlpha = isDanger ? 0.8 : 0.4;

      if (l.type === 'Same zone') {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Link label
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Label background
      const labelW = ctx.measureText(l.type).width + 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(mx - labelW / 2, my - 7, labelW, 14, 4);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fillText(l.type, mx, my);
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    const hovered = hoveredRef.current;
    nodes.forEach(n => {
      const isHovered = hovered?.id === n.id;
      const color = n.type === 'worker'
        ? (n.flagged ? NODE_COLORS.worker_flagged : NODE_COLORS.worker_clean)
        : NODE_COLORS[n.type] || '#6B7280';

      const radius = n.type === 'worker' ? (n.flagged ? 20 : 16) : n.type === 'zone' ? 10 : 14;
      const r = isHovered ? radius + 3 : radius;

      // Glow for flagged
      if (n.flagged) {
        const glow = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 2.5);
        glow.addColorStop(0, `${color}40`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node circle
      const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, `${color}CC`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered ? '#FFFFFF' : `${color}88`;
      ctx.lineWidth = isHovered ? 3 : 1.5;
      ctx.stroke();

      // Icon inside node
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${n.type === 'worker' ? 13 : 11}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = n.type === 'worker' ? (n.flagged ? '⚠' : '👤')
        : n.type === 'device' ? '📱'
        : n.type === 'gps' ? '📍'
        : n.type === 'velocity' ? '⚡'
        : n.type === 'upi' ? '🔗'
        : '🗺';
      ctx.fillText(icon, n.x, n.y + 1);

      // Label
      ctx.font = `${n.flagged ? 'bold ' : ''}11px "Space Grotesk", Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Label background
      const labelText = n.name;
      const tw = ctx.measureText(labelText).width + 10;
      const ly = n.y + r + 6;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(n.x - tw / 2, ly - 2, tw, 16, 4);
      ctx.fill();

      ctx.fillStyle = n.flagged ? color : '#CBD5E1';
      ctx.fillText(labelText, n.x, ly);
    });

    animFrameRef.current = requestAnimationFrame(simulate);
  }, []);

  // Start animation
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;

    const timer = setTimeout(() => {
      simulate();
    }, 50);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [graphData, simulate]);

  // Mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getNodeAt = (x: number, y: number): FraudNode | null => {
      const rect = canvas.getBoundingClientRect();
      const mx = x - rect.left;
      const my = y - rect.top;
      for (const n of nodesRef.current) {
        const r = n.type === 'worker' ? 20 : 14;
        const dx = n.x - mx, dy = n.y - my;
        if (dx * dx + dy * dy < r * r) return n;
      }
      return null;
    };

    const onMouseDown = (e: MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY);
      if (node) {
        draggingRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (drag) {
        const rect = canvas.getBoundingClientRect();
        drag.fx = e.clientX - rect.left;
        drag.fy = e.clientY - rect.top;
      } else {
        const node = getNodeAt(e.clientX, e.clientY);
        hoveredRef.current = node;
        canvas.style.cursor = node ? 'grab' : 'default';
      }
    };

    const onMouseUp = () => {
      const drag = draggingRef.current;
      if (drag) {
        setSelectedNode({ ...drag });
        drag.fx = null;
        drag.fy = null;
        draggingRef.current = null;
        canvas.style.cursor = 'default';
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
    };
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Analyzing fraud network...</p>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-secondary" />
        </div>
        <p className="text-muted-foreground">No fraud network patterns detected</p>
        <p className="text-xs text-muted-foreground/60">Flagged or rejected claims will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5 px-3 py-1.5">
          <User className="w-3.5 h-3.5" />
          {stats.flaggedWorkers} Flagged Workers
        </Badge>
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 gap-1.5 px-3 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {stats.alerts} Alerts
        </Badge>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1.5">
          <Link2 className="w-3.5 h-3.5" />
          {stats.connections} Suspicious Links
        </Badge>
      </div>

      {/* Canvas graph */}
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-2xl"
          style={{ height: 480 }}
        />

        {/* Selected node tooltip */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-elevated max-w-[220px] animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedNode.type}</span>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <p className="font-display font-bold text-sm">{selectedNode.name}</p>
            {selectedNode.flagged && (
              <Badge variant="destructive" className="mt-2 text-xs">⚠ Flagged</Badge>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.worker_flagged }} />
          Flagged Worker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.worker_clean }} />
          Clean Worker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.device }} />
          Shared Device
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.gps }} />
          GPS Spoof
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.velocity }} />
          Velocity Alert
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.upi }} />
          Collusion
        </span>
      </div>
    </div>
  );
}
