/**
 * LoanGuard Module 5: Interactive Scam Connection Mapper Network Canvas
 * Renders a force-directed graph of advertisements and shared identifiers.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GraphNode, GraphEdge, RiskCategory, AdRecord } from '../types';
import { ShieldAlert, Phone, Globe, Mail, FileText, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: { clusterId: number; adIds: string[]; primaryIdentifier: string }[];
  onSelectAd?: (adId: string) => void;
  ads: AdRecord[];
}

interface CanvasNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  clusters,
  onSelectAd,
  ads
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'phone' | 'domain' | 'email' | 'text_similarity'>('all');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter edges and active nodes based on selected filter
  const filteredEdges = useMemo(() => {
    if (filterType === 'all') return edges;
    return edges.filter(e => e.relationshipType === filterType);
  }, [edges, filterType]);

  const activeNodeIds = useMemo(() => {
    if (filterType === 'all') return new Set(nodes.map(n => n.id));
    const active = new Set<string>();
    filteredEdges.forEach(e => {
      active.add(e.source);
      active.add(e.target);
    });
    return active;
  }, [filteredEdges, nodes, filterType]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => activeNodeIds.has(n.id));
  }, [nodes, activeNodeIds]);

  // Simulation physics state
  const simNodesRef = useRef<CanvasNode[]>([]);

  useEffect(() => {
    const width = 800;
    const height = 500;
    // Initialize node positions in a circle or preserve previous positions
    const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    const angleStep = (2 * Math.PI) / (filteredNodes.length || 1);

    simNodesRef.current = filteredNodes.map((n, i) => {
      const existing = existingMap.get(n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: 0, vy: 0, radius: n.type === 'ad' ? 22 : 16 };
      }
      const radius = n.type === 'ad' ? 22 : 16;
      const angle = i * angleStep;
      const dist = 140 + (i % 3) * 60;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius
      };
    });
  }, [filteredNodes]);

  // Animation Loop for Force-Directed Graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const simNodes = simNodesRef.current;
      const nodeMap = new Map(simNodes.map(n => [n.id, n]));

      // 1. Force Simulation Step
      const k = 0.05; // spring constant
      const repulsion = 1200;
      const centerForce = 0.01;

      // Repulsion between all node pairs
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i];
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.max(15, Math.hypot(dx, dy));
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // Spring force along edges
      for (const edge of filteredEdges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.hypot(dx, dy);
          const desiredDist = 120;
          const displacement = dist - desiredDist;
          const fx = (dx / (dist || 1)) * displacement * k;
          const fy = (dy / (dist || 1)) * displacement * k;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      // Center gravity & velocity dampening
      for (const node of simNodes) {
        node.vx += (width / 2 - node.x) * centerForce;
        node.vy += (height / 2 - node.y) * centerForce;

        node.vx *= 0.85; // damping
        node.vy *= 0.85;

        node.x += node.vx;
        node.y += node.vy;

        // Keep inside bounds
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      }

      // 2. Canvas Drawing
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw Edges
      for (const edge of filteredEdges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const isHighlighted = selectedNode && (source.id === selectedNode.id || target.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#38bdf8'; // bright sky blue
          ctx.lineWidth = 2.5;
        } else if (edge.relationshipType === 'phone') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; // red for shared phone
          ctx.lineWidth = 1.8;
        } else if (edge.relationshipType === 'domain') {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)'; // amber for shared domain
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'; // slate
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();

        // Edge label (drawn midpoint)
        if (isHighlighted || filteredEdges.length < 12) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = isHighlighted ? '#e0f2fe' : 'rgba(148, 163, 184, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(edge.label, midX, midY - 4);
        }
      }

      // Draw Nodes
      for (const node of simNodes) {
        const isSelected = selectedNode?.id === node.id;

        // Glow ring for selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        if (node.type === 'ad') {
          // Color by risk category
          if (node.riskCategory === 'HIGH RISK') {
            ctx.fillStyle = '#ef4444'; // Red
          } else if (node.riskCategory === 'NEEDS CHECKING') {
            ctx.fillStyle = '#f59e0b'; // Amber
          } else {
            ctx.fillStyle = '#10b981'; // Green
          }
        } else if (node.type === 'phone') {
          ctx.fillStyle = '#6366f1'; // Indigo
        } else if (node.type === 'domain') {
          ctx.fillStyle = '#06b6d4'; // Cyan
        } else if (node.type === 'email') {
          ctx.fillStyle = '#8b5cf6'; // Purple
        } else {
          ctx.fillStyle = '#64748b'; // Slate
        }

        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();

        // Node Label
        ctx.font = node.type === 'ad' ? 'bold 11px "Plus Jakarta Sans", sans-serif' : '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [filteredEdges, zoom, pan, selectedNode]);

  // Click detection on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    const clickedNode = simNodesRef.current.find(node => {
      const dist = Math.hypot(node.x - clickX, node.y - clickY);
      return dist <= node.radius + 4;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      if (clickedNode.type === 'ad' && clickedNode.adId && onSelectAd) {
        onSelectAd(clickedNode.adId);
      }
    } else {
      setSelectedNode(null);
    }
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Selected ad details
  const selectedAdRecord = useMemo(() => {
    if (selectedNode?.type === 'ad' && selectedNode.adId) {
      return ads.find(a => a.id === selectedNode.adId);
    }
    return null;
  }, [selectedNode, ads]);

  // Connected ads to selected node
  const connectedAdsToSelected = useMemo(() => {
    if (!selectedNode) return [];
    const connectedAdIds = new Set<string>();

    if (selectedNode.type === 'ad') {
      filteredEdges.forEach(e => {
        if (e.source === selectedNode.id) {
          // target could be identifier or direct ad
          const otherNode = nodes.find(n => n.id === e.target);
          if (otherNode?.type === 'ad' && otherNode.adId) connectedAdIds.add(otherNode.adId);
          // if identifier, find all ads connected to this identifier
          if (otherNode?.type !== 'ad') {
            filteredEdges.forEach(subEdge => {
              if (subEdge.target === otherNode?.id && subEdge.source !== selectedNode.id) {
                connectedAdIds.add(subEdge.source);
              }
            });
          }
        } else if (e.target === selectedNode.id) {
          const otherNode = nodes.find(n => n.id === e.source);
          if (otherNode?.type === 'ad' && otherNode.adId) connectedAdIds.add(otherNode.adId);
        }
      });
    } else {
      // Identifier node selected: find all connected ads
      filteredEdges.forEach(e => {
        if (e.target === selectedNode.id || e.source === selectedNode.id) {
          const adId = e.source === selectedNode.id ? e.target : e.source;
          const adNode = nodes.find(n => n.id === adId);
          if (adNode?.type === 'ad' && adNode.adId) connectedAdIds.add(adNode.adId);
        }
      });
    }

    return ads.filter(a => connectedAdIds.has(a.id));
  }, [selectedNode, filteredEdges, nodes, ads]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              Scam Connection Mapper (Graph Network)
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{nodes.length} Network Nodes</span>
              <span>·</span>
              <span>{edges.length} Discovered Associations</span>
              <span>·</span>
              <span>{clusters.length} Campaign Clusters</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Relations
          </button>
          <button
            onClick={() => setFilterType('phone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'phone' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Shared Phone
          </button>
          <button
            onClick={() => setFilterType('domain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'domain' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Shared Domain
          </button>
          <button
            onClick={() => setFilterType('text_similarity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === 'text_similarity' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Text Match
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-lg">
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); }}
            title="Reset Graph Position"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Detail Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
        {/* Canvas Area */}
        <div className="lg:col-span-3 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={760}
            height={480}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-grab active:cursor-grabbing w-full h-[480px]"
          />

          {/* Canvas Overlay Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 text-xs flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-slate-300">High Risk Ad</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-300">Needs Checking</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Lower Risk</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-slate-300">Phone Identifier</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              <span className="text-slate-300">Domain</span>
            </span>
          </div>

          <div className="absolute top-3 right-3 text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
            Click node to view connections · Drag to pan
          </div>
        </div>

        {/* Node Inspection & Cluster Drawer */}
        <div className="p-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Association Inspector
            </h4>

            {selectedNode ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                  <span className="text-xs text-indigo-400 font-mono block mb-1">
                    {selectedNode.type.toUpperCase()} NODE
                  </span>
                  <div className="font-semibold text-slate-100 text-sm">{selectedNode.label}</div>
                  {selectedNode.riskCategory && (
                    <div className="mt-2 text-xs">
                      <span className="text-slate-400">Risk Assessment: </span>
                      <span className={`font-semibold ${
                        selectedNode.riskCategory === 'HIGH RISK' ? 'text-red-400' :
                        selectedNode.riskCategory === 'NEEDS CHECKING' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {selectedNode.riskCategory}
                      </span>
                    </div>
                  )}
                </div>

                {/* Connected Advertisements */}
                <div>
                  <div className="text-xs font-medium text-slate-300 mb-2 flex items-center justify-between">
                    <span>Associated Advertisements ({connectedAdsToSelected.length})</span>
                  </div>

                  {connectedAdsToSelected.length === 0 ? (
                    <p className="text-xs text-slate-400">No other advertisements currently link to this specific node.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {connectedAdsToSelected.map(ad => (
                        <div
                          key={ad.id}
                          onClick={() => onSelectAd && onSelectAd(ad.id)}
                          className="p-2.5 bg-slate-800/40 hover:bg-slate-800 rounded-lg border border-slate-700/40 cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-semibold text-slate-200 line-clamp-1">{ad.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                            <span className="font-mono">{ad.id}</span>
                            <span>·</span>
                            <span className={
                              ad.riskCategory === 'HIGH RISK' ? 'text-red-400 font-medium' :
                              ad.riskCategory === 'NEEDS CHECKING' ? 'text-amber-400 font-medium' : 'text-emerald-400'
                            }>{ad.riskCategory}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium mb-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Regulatory Safeguard
                  </div>
                  LoanGuard maps shared identifiers as <strong className="text-slate-200">possible associations</strong>, not conclusive proof of common ownership. Cross-verify with telecom and registrar records.
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Info className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select any advertisement or identifier node on the canvas to inspect campaign clusters and shared contact networks.
                </p>
              </div>
            )}
          </div>

          {/* Cluster Summary Pills */}
          {clusters.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Identified Syndicates ({clusters.length})
              </span>
              <div className="space-y-1.5">
                {clusters.map(c => (
                  <div key={c.clusterId} className="flex items-center justify-between text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded">
                    <span>Cluster #{c.clusterId}: {c.primaryIdentifier}</span>
                    <span className="text-indigo-400 font-mono tabular-nums">{c.adIds.length} ads</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
