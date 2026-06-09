import { useState, useEffect } from 'react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/DesignHelpers';
import { AreaChart, LabeledBars, PieChart as DesignPie } from '../../components/ui/DesignCharts';

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const STATUS_COLORS = { active: 'var(--good)', inactive: 'var(--bad)', graduated: 'var(--info)', dropped: 'var(--warn)' };
const BAR_PALETTE = ['#5b54e6', '#19a89a', '#c98a1e', '#d2553f', '#9b3d8f', '#3b7ec9', '#2f9968', '#e06090'];

export default function Analytics() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState('');
  const [aiResults, setAiResults] = useState({});
  const [activeAiTab, setActiveAiTab] = useState(null);

  useEffect(() => { loadChartData(); }, []);

  const loadChartData = async () => { setLoading(true); try { const { data } = await client.get('/reports/analytics-data'); setChartData(data); } catch (err) { console.error(err); } finally { setLoading(false); } };

  const runAiAnalysis = async (type) => {
    setAiLoading(type); setActiveAiTab(type);
    try { const { data } = await client.post(`/ai/${type}`, {}); setAiResults(prev => ({ ...prev, [type]: data })); }
    catch (err) { setAiResults(prev => ({ ...prev, [type]: { analysis: `Failed: ${err.response?.data?.error || err.message}` } })); }
    finally { setAiLoading(''); }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '12px 0 4px' }}>{line.replace('### ', '')}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '14px 0 6px' }}>{line.replace('## ', '')}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '16px 0 8px' }}>{line.replace('# ', '')}</h2>;
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
      if (line.match(/^[-*]\s/)) return <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, marginLeft: 16 }} dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-*]\s/, '') }} />;
      if (line.match(/^\d+\.\s/)) return <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, marginLeft: 16, listStyleType: 'decimal' }} dangerouslySetInnerHTML={{ __html: rendered.replace(/^\d+\.\s/, '') }} />;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  const aiActions = [
    { type: 'performance-trend', title: 'Performance Trends', desc: 'Analyze overall student performance trends', icon: 'chart', tint: 'var(--info)' },
    { type: 'at-risk-students', title: 'At-Risk Students', desc: 'Identify students who may need intervention', icon: 'alertTriangle', tint: 'var(--bad)' },
    { type: 'class-comparison', title: 'Class Comparison', desc: 'Compare performance across sections', icon: 'layers', tint: 'var(--accent)' },
  ];

  if (loading) return (
    <div className="rd-content-inner">
      <PageHead title="Analytics" sub="Loading analytics data..." />
      <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /><p style={{ marginTop: 16, color: 'var(--faint)' }}>Crunching the numbers...</p></div>
    </div>
  );

  /* Build data for custom chart components from API response */
  const courseBarData = (chartData?.coursePerformance || []).map((c, i) => ({
    label: c.name?.length > 8 ? c.name.slice(0, 8) + '...' : c.name,
    value: Math.round(c.avgPercentage || 0),
    color: BAR_PALETTE[i % BAR_PALETTE.length],
  }));

  const attendanceLineData = (chartData?.attendanceTrend || []).map(t => t.attendanceRate || 0);

  const statusPieData = (chartData?.statusDistribution || []).map(s => ({
    label: s.name,
    value: s.value,
    color: STATUS_COLORS[s.name?.toLowerCase()] || 'var(--accent)',
  }));

  const batchBarData = (chartData?.batchPerformance || []).map((b, i) => ({
    label: b.name?.length > 10 ? b.name.slice(0, 10) + '...' : b.name,
    value: Math.round(b.avgPercentage || 0),
    color: BAR_PALETTE[i % BAR_PALETTE.length],
  }));

  return (
    <div className="rd-content-inner">
      <PageHead title="Analytics" sub="Performance insights, trends, and AI-powered analysis">
        <button className="rd-btn rd-btn-ghost" onClick={loadChartData}><Icon name="refresh" /> Refresh</button>
      </PageHead>

      {/* Charts Grid - 2x2 matching prototype */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        {/* Average marks by course */}
        <div className="rd-card fade-up">
          <div className="rd-card-head"><div><div className="rd-card-title">Average marks by course</div><div className="rd-card-sub">Current semester</div></div></div>
          <div className="rd-card-pad" style={{ paddingTop: 22 }}>
            {courseBarData.length > 0
              ? <LabeledBars data={courseBarData} suffix="%" height={230} />
              : <div style={{ display: 'grid', placeItems: 'center', height: 230, color: 'var(--faint)' }}>No marks data</div>}
          </div>
        </div>

        {/* Attendance trend */}
        <div className="rd-card fade-up" style={{ animationDelay: '60ms' }}>
          <div className="rd-card-head"><div><div className="rd-card-title">Attendance trend</div><div className="rd-card-sub">Institution-wide</div></div></div>
          <div className="rd-card-pad" style={{ paddingTop: 22 }}>
            {attendanceLineData.length > 0 ? (
              <>
                <AreaChart data={attendanceLineData} height={210} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {MONTHS.slice(0, attendanceLineData.length).map(m => <span key={m} style={{ fontSize: 10.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{m}</span>)}
                </div>
              </>
            ) : <div style={{ display: 'grid', placeItems: 'center', height: 210, color: 'var(--faint)' }}>No attendance data</div>}
          </div>
        </div>

        {/* Student status distribution */}
        <div className="rd-card fade-up" style={{ animationDelay: '120ms' }}>
          <div className="rd-card-head"><div><div className="rd-card-title">Student status distribution</div><div className="rd-card-sub">All enrolled students</div></div></div>
          <div className="rd-card-pad" style={{ paddingTop: 22, display: 'grid', placeItems: 'center' }}>
            {statusPieData.length > 0
              ? <DesignPie data={statusPieData} size={170} />
              : <div style={{ display: 'grid', placeItems: 'center', height: 170, color: 'var(--faint)' }}>No student data</div>}
          </div>
        </div>

        {/* Batch-wise performance */}
        <div className="rd-card fade-up" style={{ animationDelay: '180ms' }}>
          <div className="rd-card-head"><div><div className="rd-card-title">Batch-wise performance</div><div className="rd-card-sub">Average score per batch</div></div></div>
          <div className="rd-card-pad" style={{ paddingTop: 22 }}>
            {batchBarData.length > 0
              ? <LabeledBars data={batchBarData} suffix="%" height={230} />
              : <div style={{ display: 'grid', placeItems: 'center', height: 230, color: 'var(--faint)' }}>No batch data</div>}
          </div>
        </div>
      </div>

      {/* AI Section */}
      <div className="rd-card rd-card-pad fade-up" style={{ background: 'var(--surface-2)', marginBottom: 'var(--gap)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Icon name="spark" style={{ width: 20, height: 20, color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>AI-Powered Insights</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>Generate actionable insights from student data.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {aiActions.map(action => (
            <button key={action.type} onClick={() => runAiAnalysis(action.type)} disabled={aiLoading === action.type}
              className="rd-card rd-card-pad"
              style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9,
                border: `1.5px solid ${activeAiTab === action.type ? 'var(--accent)' : 'var(--border)'}`,
                background: activeAiTab === action.type ? 'var(--accent-soft)' : 'var(--surface)',
                color: 'inherit' }}>
              <div className="rd-stat-ico" style={{ background: activeAiTab === action.type ? 'var(--surface)' : 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={action.icon} /></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--color-gray-900)' }}>{action.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{action.desc}</div>
              {aiLoading === action.type && <div className="spinner" style={{ marginTop: 4 }} />}
            </button>
          ))}
        </div>

        {/* AI Results */}
        {activeAiTab && aiResults[activeAiTab] && (
          <div className="rd-card rd-card-pad" style={{ marginTop: 14, borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="spark" style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>{aiActions.find(a => a.type === activeAiTab)?.title} — AI Analysis</span>
              {aiResults[activeAiTab].generatedAt && (
                <span className="rd-badge" style={{ marginLeft: 'auto', color: 'var(--accent)', background: 'var(--accent-soft)' }}>
                  {new Date(aiResults[activeAiTab].generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* At-risk summary */}
            {activeAiTab === 'at-risk-students' && aiResults[activeAiTab].summary && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[
                  [aiResults[activeAiTab].summary.totalAnalyzed, 'Analyzed', 'var(--ink)'],
                  [aiResults[activeAiTab].summary.atRiskCount, 'At Risk', 'var(--bad)'],
                  [`${aiResults[activeAiTab].summary.riskPercentage}%`, 'Risk Rate', 'var(--warn)'],
                ].map(([v, l, c]) => (
                  <div key={l} className="rd-card" style={{ flex: 1, padding: '13px', textAlign: 'center', background: 'var(--surface-2)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: c }}>{v}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* At-risk table */}
            {activeAiTab === 'at-risk-students' && aiResults[activeAiTab].atRiskStudents?.length > 0 && (
              <div className="rd-table-wrap" style={{ marginBottom: 20 }}>
                <table className="rd-tbl">
                  <thead><tr><th>ID</th><th>Name</th><th>Batch</th><th>Section</th><th>Marks</th><th>Attendance</th><th>Weak Subjects</th></tr></thead>
                  <tbody>{aiResults[activeAiTab].atRiskStudents.map(s => (
                    <tr key={s.enrollmentNo}>
                      <td><span className="rd-badge rd-badge-id">{s.enrollmentNo}</span></td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td><td>{s.batch}</td><td>{s.section}</td>
                      <td><span className="rd-badge" style={{ color: typeof s.marksPercentage === 'number' && s.marksPercentage < 40 ? 'var(--bad)' : 'var(--good)', background: typeof s.marksPercentage === 'number' && s.marksPercentage < 40 ? 'var(--bad-soft)' : 'var(--good-soft)' }}>{typeof s.marksPercentage === 'number' ? `${s.marksPercentage}%` : s.marksPercentage}</span></td>
                      <td><span className="rd-badge" style={{ color: typeof s.attendanceRate === 'number' && s.attendanceRate < 75 ? 'var(--bad)' : 'var(--good)', background: typeof s.attendanceRate === 'number' && s.attendanceRate < 75 ? 'var(--bad-soft)' : 'var(--good-soft)' }}>{typeof s.attendanceRate === 'number' ? `${s.attendanceRate}%` : s.attendanceRate}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>{s.weakSubjects?.join(', ') || '\u2014'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* Class comparison table */}
            {activeAiTab === 'class-comparison' && aiResults[activeAiTab].comparisonData?.length > 0 && (
              <div className="rd-table-wrap" style={{ marginBottom: 20 }}>
                <table className="rd-tbl">
                  <thead><tr><th>Section</th><th>Batch</th><th>Students</th><th>Avg Performance</th><th>Avg Attendance</th></tr></thead>
                  <tbody>{aiResults[activeAiTab].comparisonData.map(s => (
                    <tr key={s.section + s.batch}>
                      <td style={{ fontWeight: 500 }}>{s.section}</td><td>{s.batch} ({s.degree})</td><td>{s.studentCount}</td>
                      <td><span className="rd-badge" style={{ color: s.avgPerformance >= 60 ? 'var(--good)' : s.avgPerformance >= 40 ? 'var(--warn)' : 'var(--bad)', background: s.avgPerformance >= 60 ? 'var(--good-soft)' : s.avgPerformance >= 40 ? 'var(--warn-soft)' : 'var(--bad-soft)' }}>{s.avgPerformance}%</span></td>
                      <td><span className="rd-badge" style={{ color: s.avgAttendance >= 75 ? 'var(--good)' : s.avgAttendance >= 50 ? 'var(--warn)' : 'var(--bad)', background: s.avgAttendance >= 75 ? 'var(--good-soft)' : s.avgAttendance >= 50 ? 'var(--warn-soft)' : 'var(--bad-soft)' }}>{s.avgAttendance}%</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '16px 0' }}>{renderMarkdown(aiResults[activeAiTab].analysis)}</div>
          </div>
        )}

        {aiLoading && (
          <div className="rd-card rd-card-pad" style={{ textAlign: 'center', padding: '48px 20px', marginTop: 14 }}>
            <div className="spinner spinner-lg" /><p style={{ marginTop: 16, color: 'var(--faint)' }}>AI is analyzing your data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
