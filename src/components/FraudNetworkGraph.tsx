import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { mockNetworkFraud } from '@/lib/mock-data';

export default function FraudNetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = 400;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const nodes = mockNetworkFraud.nodes.map((n) => ({ ...n }));
    const links = mockNetworkFraud.links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 2');

    const linkLabels = svg
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '9')
      .attr('fill', 'hsl(var(--muted-foreground))')
      .text((d) => d.type);

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: any) => (d.flagged ? 14 : 10))
      .attr('fill', (d: any) => (d.flagged ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2)
      .attr('opacity', (d: any) => (d.flagged ? 1 : 0.6))
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -18)
      .attr('font-size', '10')
      .attr('font-weight', (d: any) => (d.flagged ? 'bold' : 'normal'))
      .attr('fill', (d: any) => (d.flagged ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'))
      .text((d: any) => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <svg ref={svgRef} className="w-full" style={{ minHeight: 400 }} />
  );
}
