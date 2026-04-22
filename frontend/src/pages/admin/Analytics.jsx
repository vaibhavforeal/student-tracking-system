import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  HiOutlineTrendingUp, HiOutlineExclamation,
  HiOutlineScale, HiOutlineSparkles, HiOutlineRefresh,
} from 'react-icons/hi';

const CHART_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
const PIE_COLORS = ['#22c55e', '#ef4444', '#38bdf8', '#f59e0b'];

export default function Analytics() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState('');
  const [aiResults, setAiResults] = useState({});
  const [activeAiTab, setActiveAiTab] = useState(null);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/reports/analytics-data');
      setChartData(data);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (type) => {
    setAiLoading(type);
    setActiveAiTab(type);
    try {
      const { data } = await client.post(`/ai/${type}`, {});
      setAiResults(prev => ({ ...prev, [type]: data }));
    } catch (err) {
      setAiResults(prev => ({
        ...prev,
        [type]: { analysis: `❌ Failed to generate analysis: ${err.response?.data?.error || err.message}` },
      }));
    } finally {
      setAiLoading('');
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    // Simple markdown rendering: bold, headers, lists, code
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) return <h4 key={i} className="ai-h4">{line.replace('### ', '')}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} className="ai-h3">{line.replace('## ', '')}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="ai-h2">{line.replace('# ', '')}</h2>;
      // Bold
      let rendered = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Lists
      if (line.match(/^[-*]\s/)) {
        return <li key={i} className="ai-li" dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-*]\s/, '') }} />;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={i} className="ai-li ai-ol" dangerouslySetInnerHTML={{ __html: rendered.replace(/^\d+\.\s/, '') }} />;
      }
      // Empty line
      if (!line.trim()) return <br key={i} />;
      // Regular paragraph
      return <p key={i} className="ai-p" dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  const aiActions = [
    {
      type: 'performance-trend',
      title: 'Performance Trends',
      description: 'Analyze overall student performance trends',
      icon: HiOutlineTrendingUp,
      color: 'sky',
    },
    {
      type: 'at-risk-students',
      title: 'At-Risk Students',
      description: 'Identify students who may need intervention',
      icon: HiOutlineExclamation,
      color: 'red',
    },
    {
      type: 'class-comparison',
      title: 'Class Comparison',
      description: 'Compare performance across sections',
      icon: HiOutlineScale,
      color: 'purple',
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Analytics Dashboard</h1>
            <p className="page-subtitle">Loading analytics data...</p>
          </div>
        </div>
        <div className="analytics-loading">
          <div className="spinner-lg"></div>
          <p>Crunching the numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p className="page-subtitle">Performance insights, trends, and AI-powered analysis</p>
        </div>
        <button className="btn btn-secondary" onClick={loadChartData}>
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Course Performance Bar Chart */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title">Average Marks by Course</h3>
          </div>
          <div className="card-body chart-container">
            {chartData?.coursePerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                    formatter={(value) => [`${value}%`, 'Avg Performance']}
                  />
                  <Bar dataKey="avgPercentage" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No marks data available</div>
            )}
          </div>
        </div>

        {/* Attendance Trend Line Chart */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title">Attendance Trend</h3>
          </div>
          <div className="card-body chart-container">
            {chartData?.attendanceTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                    formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ fill: '#818cf8', r: 5 }}
                    activeDot={{ r: 7, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No attendance data available</div>
            )}
          </div>
        </div>

        {/* Student Status Pie Chart */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title">Student Status Distribution</h3>
          </div>
          <div className="card-body chart-container">
            {chartData?.statusDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  >
                    {chartData.statusDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No student data available</div>
            )}
          </div>
        </div>

        {/* Batch Performance Bar Chart */}
        <div className="card analytics-chart-card">
          <div className="card-header">
            <h3 className="card-title">Batch-wise Performance</h3>
          </div>
          <div className="card-body chart-container">
            {chartData?.batchPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.batchPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                    formatter={(value) => [`${value}%`, 'Avg Performance']}
                  />
                  <Bar dataKey="avgPercentage" fill="url(#batchGradient)" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="batchGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No batch data available</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analytics Section */}
      <div className="ai-section">
        <div className="ai-section-header">
          <div>
            <h2>
              <HiOutlineSparkles style={{ color: '#818cf8', marginRight: '8px', verticalAlign: 'middle' }} />
              AI-Powered Insights
            </h2>
            <p>Use Gemini AI to analyze student data and generate actionable insights</p>
          </div>
        </div>

        <div className="ai-actions-grid">
          {aiActions.map(action => (
            <button
              key={action.type}
              className={`ai-action-card ${activeAiTab === action.type ? 'active' : ''}`}
              onClick={() => runAiAnalysis(action.type)}
              disabled={aiLoading === action.type}
              id={`ai-${action.type}`}
            >
              <div className={`ai-action-icon ${action.color}`}>
                <action.icon />
              </div>
              <div className="ai-action-info">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
              {aiLoading === action.type && <div className="spinner"></div>}
            </button>
          ))}
        </div>

        {/* AI Results */}
        {activeAiTab && aiResults[activeAiTab] && (
          <div className="card ai-results-card">
            <div className="card-header">
              <h3 className="card-title">
                <HiOutlineSparkles style={{ color: '#818cf8', marginRight: '6px' }} />
                {aiActions.find(a => a.type === activeAiTab)?.title} — AI Analysis
              </h3>
              <span className="badge badge-purple">
                {new Date(aiResults[activeAiTab].generatedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="card-body ai-results-body">
              {/* Summary stats for at-risk */}
              {activeAiTab === 'at-risk-students' && aiResults[activeAiTab].summary && (
                <div className="ai-summary-stats">
                  <div className="ai-stat">
                    <span className="ai-stat-value">{aiResults[activeAiTab].summary.totalAnalyzed}</span>
                    <span className="ai-stat-label">Students Analyzed</span>
                  </div>
                  <div className="ai-stat danger">
                    <span className="ai-stat-value">{aiResults[activeAiTab].summary.atRiskCount}</span>
                    <span className="ai-stat-label">At Risk</span>
                  </div>
                  <div className="ai-stat warning">
                    <span className="ai-stat-value">{aiResults[activeAiTab].summary.riskPercentage}%</span>
                    <span className="ai-stat-label">Risk Rate</span>
                  </div>
                </div>
              )}

              {/* At-risk students table */}
              {activeAiTab === 'at-risk-students' && aiResults[activeAiTab].atRiskStudents?.length > 0 && (
                <div className="data-table-wrapper" style={{ marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Unique ID</th>
                        <th>Name</th>
                        <th>Batch</th>
                        <th>Section</th>
                        <th>Marks %</th>
                        <th>Attendance %</th>
                        <th>Weak Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiResults[activeAiTab].atRiskStudents.map(s => (
                        <tr key={s.enrollmentNo}>
                          <td>{s.enrollmentNo}</td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td>{s.batch}</td>
                          <td>{s.section}</td>
                          <td>
                            <span className={`badge ${typeof s.marksPercentage === 'number' && s.marksPercentage < 40 ? 'badge-red' : 'badge-green'}`}>
                              {typeof s.marksPercentage === 'number' ? `${s.marksPercentage}%` : s.marksPercentage}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${typeof s.attendanceRate === 'number' && s.attendanceRate < 75 ? 'badge-red' : 'badge-green'}`}>
                              {typeof s.attendanceRate === 'number' ? `${s.attendanceRate}%` : s.attendanceRate}
                            </span>
                          </td>
                          <td>{s.weakSubjects?.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Class comparison data table */}
              {activeAiTab === 'class-comparison' && aiResults[activeAiTab].comparisonData?.length > 0 && (
                <div className="data-table-wrapper" style={{ marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Batch</th>
                        <th>Students</th>
                        <th>Avg Performance</th>
                        <th>Avg Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiResults[activeAiTab].comparisonData.map(s => (
                        <tr key={s.section + s.batch}>
                          <td style={{ fontWeight: 500 }}>{s.section}</td>
                          <td>{s.batch} ({s.degree})</td>
                          <td>{s.studentCount}</td>
                          <td>
                            <span className={`badge ${s.avgPerformance >= 60 ? 'badge-green' : s.avgPerformance >= 40 ? 'badge-amber' : 'badge-red'}`}>
                              {s.avgPerformance}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${s.avgAttendance >= 75 ? 'badge-green' : s.avgAttendance >= 50 ? 'badge-amber' : 'badge-red'}`}>
                              {s.avgAttendance}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Text Analysis */}
              <div className="ai-analysis-content">
                {renderMarkdown(aiResults[activeAiTab].analysis)}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {aiLoading && (
          <div className="card ai-loading-card">
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner-lg"></div>
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>
                AI is analyzing your data... This may take a moment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
