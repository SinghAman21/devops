import { useWebSocket } from '../hooks/useWebSocket';
import EventLog from '../components/EventLog';
import FlowDiagram from '../components/FlowDiagram';
import InfraPanel from '../components/InfraPanel';
export default function MonitorPage() { const stream = useWebSocket(); return <><div className="page-heading"><div><p className="eyebrow">OBSERVABILITY / REAL TIME</p><h2>System monitor</h2><p className="muted">Animated order flow and live infrastructure telemetry.</p></div><span className={`pill ${stream.connected ? 'healthy' : 'warning'}`}>{stream.connected ? 'CONNECTED' : 'RECONNECTING'}</span></div><div className="monitor-grid"><div className="grid"><FlowDiagram events={stream.events} infra={stream.infra} /><EventLog events={stream.events} /></div><InfraPanel infra={stream.infra} /></div></>; }
