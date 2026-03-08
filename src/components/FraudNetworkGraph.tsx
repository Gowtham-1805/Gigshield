import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from '@/integrations/supabase/client';

interface FraudNode {
  id: string;
  name: string;
  flagged: boolean;
  type: 'worker' | 'device' | 'upi' | 'zone';
}

interface FraudLink {
  source: string;
  target: string;
  type: string;
}

export default function FraudNetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: FraudNode[]; links: FraudLink[] } | null>(null);
  const [loading, setLoading] = useState(true);

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

      const addNode = (node: FraudNode) => {
        if (!nodeIds.has(node.id)) {
          nodeIds.add(node.id);
          nodes.push(node);
        }
      };

      // Build graph from fraud_details
      claims.forEach((c: any) => {
        const workerId = c.policies?.worker_id;
        const workerName = c.policies?.workers?.name || 'Unknown';
        const zoneId = c.policies?.workers?.zone_id;
        const details = c.fraud_details as Record<string, any> || {};

        addNode({ id: workerId, name: workerName, flagged: c.fraud_score > 0.6, type: 'worker' });

        // Add zone connection
        if (zoneId) {
          addNode({ id: `zone-${zoneId}`, name: zoneId.replace(/-/g, ' ').toUpperCase(), flagged: false, type: 'zone' });
          const existingLink = links.find(l => l.source === workerId && l.target === `zone-${zoneId}`);
          if (!existingLink) {
            links.push({ source: workerId, target: `zone-${zoneId}`, type: 'Same zone' });
          }
        }

        // Device fingerprint mismatch
        if (details.device_fingerprint_mismatch || details.shared_device_id) {
          const deviceId = details.shared_device_id || `dev-${workerId.slice(0, 4)}`;
          addNode({ id: `device-${deviceId}`, name: `Device ${deviceId}`, flagged: true, type: 'device' });
          links.push({ source: workerId, target: `device-${deviceId}`, type: 'Shared device' });
        }

        // GPS mismatch / spoofing
        if (details.gps_mismatch || details.location_spoofing_detected) {
          addNode({ id: `gps-spoof-${workerId}`, name: '📍 GPS Spoof', flagged: true, type: 'device' });
          links.push({ source: workerId, target: `gps-spoof-${workerId}`, type: 'GPS mismatch' });
        }

        // Velocity check / high frequency
        if (details.velocity_check_failed || details.high_frequency_claims || details['3_claims_in_48hrs']) {
          addNode({ id: `velocity-${workerId}`, name: '⚡ Velocity Alert', flagged: true, type: 'device' });
          links.push({ source: workerId, target: `velocity-${workerId}`, type: 'High frequency' });
        }

        // Network collusion
        if (details.network_collusion_detected) {
          addNode({ id: `collusion-ring`, name: '🔗 Collusion Ring', flagged: true, type: 'upi' });
          links.push({ source: workerId, target: `collusion-ring`, type: 'Collusion' });
        }
      });

      // Cross-link workers in the same zone who are both flagged
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

      setGraphData({ nodes, links });
      setLoading(false);
    };

    fetchFraudData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !graphData || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current?.clientWidth || 600;
    const height = 420;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = graphData.nodes.map((n) => ({ ...n }));
    const links = graphData.links.map((l) => ({ ...l }));

    // Defs for glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) =>
        d.type === 'Correlated claims' ? 'hsl(0, 84%, 60%)' :
        d.type === 'Collusion' ? 'hsl(38, 92%, 50%)' :
        'hsl(var(--border))'
      )
      .attr('stroke-width', (d: any) => d.type === 'Correlated claims' ? 2.5 : 1.5)
      .attr('stroke-dasharray', (d: any) => d.type === 'Same zone' ? '6 3' : 'none')
      .attr('opacity', 0.7);

    const linkLabels = svg
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '8')
      .attr('fill', 'hsl(var(--muted-foreground))')
      .attr('opacity', 0.8)
      .text((d: any) => d.type);

    const nodeColor = (d: any) => {
      if (d.type === 'device') return 'hsl(38, 92%, 50%)';
      if (d.type === 'upi') return 'hsl(280, 60%, 55%)';
      if (d.type === 'zone') return 'hsl(var(--muted-foreground))';
      return d.flagged ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))';
    };

    const nodeRadius = (d: any) => {
      if (d.type === 'worker') return d.flagged ? 16 : 12;
      if (d.type === 'zone') return 8;
      return 10;
    };

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', nodeRadius)
      .attr('fill', nodeColor)
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .attr('opacity', (d: any) => d.flagged ? 1 : 0.7)
      .attr('filter', (d: any) => d.flagged ? 'url(#glow)' : 'none')
      .style('cursor', 'grab')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Tooltip on hover
    node.append('title').text((d: any) => `${d.name} (${d.type})`);

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => d.type === 'worker' ? -22 : -16)
      .attr('font-size', (d: any) => d.type === 'worker' ? '11' : '9')
      .attr('font-weight', (d: any) => d.flagged ? 'bold' : 'normal')
      .attr('fill', (d: any) => d.flagged ? 'hsl(0, 84%, 60%)' : 'hsl(var(--foreground))')
      .text((d: any) => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => Math.max(20, Math.min(width - 20, d.source.x)))
        .attr('y1', (d: any) => Math.max(20, Math.min(height - 20, d.source.y)))
        .attr('x2', (d: any) => Math.max(20, Math.min(width - 20, d.target.x)))
        .attr('y2', (d: any) => Math.max(20, Math.min(height - 20, d.target.y)));

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', (d: any) => Math.max(20, Math.min(width - 20, d.x)))
        .attr('cy', (d: any) => Math.max(20, Math.min(height - 20, d.y)));

      labels
        .attr('x', (d: any) => Math.max(20, Math.min(width - 20, d.x)))
        .attr('y', (d: any) => Math.max(20, Math.min(height - 20, d.y)));
    });

    return () => { simulation.stop(); };
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading fraud network...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No fraud network data detected
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="flex gap-4 mb-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive inline-block" /> Flagged Worker</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(221, 83%, 53%)' }} /> Clean Worker</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(38, 92%, 50%)' }} /> Device/Alert</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: 'hsl(280, 60%, 55%)' }} /> Collusion Ring</span>
      </div>
      <svg ref={svgRef} className="w-full rounded-xl border border-border/50" style={{ minHeight: 420 }} />
    </div>
  );
}
