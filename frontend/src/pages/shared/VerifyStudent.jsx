import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import BarcodeScanner from '../../components/BarcodeScanner';
import client from '../../api/client';
import {
  HiOutlineSearch, HiOutlineShieldCheck, HiOutlineExclamationCircle,
} from 'react-icons/hi';

export default function VerifyStudent() {
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher');

  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { verified, student, error }
  const [scannerActive, setScannerActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(null);

  const verifyStudent = useCallback(async (enrollmentNo) => {
    if (!enrollmentNo?.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await client.get(`/verify/${encodeURIComponent(enrollmentNo.trim())}`);
      setResult(data);
      setLastScanTime(new Date());
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ verified: false, error: 'Student not found' });
      } else {
        setResult({ verified: false, error: err.response?.data?.error || 'Verification failed' });
      }
      setLastScanTime(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBarcodeDetected = useCallback((code) => {
    verifyStudent(code);
    setManualInput(code);
  }, [verifyStudent]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    verifyStudent(manualInput);
  };

  const statusConfig = {
    active: { label: '✓ ACTIVE STUDENT', className: 'verification-status-active', icon: '🟢' },
    inactive: { label: '✗ INACTIVE', className: 'verification-status-inactive', icon: '🔴' },
    graduated: { label: '🎓 GRADUATED', className: 'verification-status-graduated', icon: '🟡' },
    dropped: { label: '✗ DROPPED', className: 'verification-status-dropped', icon: '🔴' },
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Verify Student</h1>
          <p className="page-subtitle">Scan a student's barcode to verify their identity and status</p>
        </div>
        <button
          className={`btn ${scannerActive ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={() => setScannerActive(!scannerActive)}
        >
          {scannerActive ? 'Pause Scanner' : 'Resume Scanner'}
        </button>
      </div>

      <div className="verify-layout">
        {/* Scanner Section */}
        <div className="card verify-scanner-card">
          <div className="card-body">
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <HiOutlineShieldCheck /> Barcode Scanner
            </h3>

            <BarcodeScanner onDetected={handleBarcodeDetected} active={scannerActive} />

            {/* Manual Input Fallback */}
            <div className="verify-manual-input">
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <HiOutlineSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                  <input
                    className="form-input"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter enrollment number manually..."
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !manualInput.trim()}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Result Section */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div className="spinner spinner-lg" />
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-gray-500)' }}>Verifying student...</p>
          </div>
        )}

        {!loading && result && (
          <div className={`card verification-card ${result.verified ? '' : 'verification-card-error'}`}>
            {result.verified && result.student ? (
              <div className="card-body">
                {/* Status Banner */}
                {(() => {
                  const config = statusConfig[result.student.status] || statusConfig.inactive;
                  return (
                    <div className={`verification-status-banner ${config.className}`}>
                      <span className="verification-status-icon">{config.icon}</span>
                      <span className="verification-status-label">{config.label}</span>
                    </div>
                  );
                })()}

                {/* Student Info */}
                <div className="verification-profile">
                  {/* Avatar */}
                  <div className="verification-avatar">
                    {result.student.photoUrl ? (
                      <img src={result.student.photoUrl} alt={`${result.student.firstName} ${result.student.lastName}`} />
                    ) : (
                      <span>{result.student.firstName?.charAt(0)}{result.student.lastName?.charAt(0)}</span>
                    )}
                  </div>

                  {/* Name & Enrollment */}
                  <div className="verification-name-section">
                    <h2 className="verification-name">
                      {result.student.firstName} {result.student.lastName}
                    </h2>
                    <span className="badge badge-sky" style={{ fontSize: 'var(--font-sm)' }}>
                      {result.student.enrollmentNo}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="verification-details-grid">
                  <VerifyField label="Department" value={result.student.department} />
                  <VerifyField label="Batch" value={result.student.batch?.name} />
                  <VerifyField label="Section" value={result.student.section?.name} />
                  <VerifyField label="Semester" value={result.student.semester} />
                  <VerifyField label="Degree" value={result.student.batch?.degree} />
                  <VerifyField label="Gender" value={result.student.gender} />
                  <VerifyField label="Phone" value={result.student.phone} />
                  <VerifyField
                    label="Validity"
                    value={result.student.batch ? `${result.student.batch.startYear} – ${result.student.batch.endYear}` : null}
                  />
                </div>

                {/* Health & Emergency */}
                {result.student.health && (
                  <div className="verification-section">
                    <h4 className="verification-section-title">Health & Emergency</h4>
                    <div className="verification-details-grid">
                      <VerifyField label="Blood Group" value={result.student.health.bloodGroup} highlight />
                      <VerifyField label="Emergency Contact" value={result.student.health.emergencyContactName} />
                      <VerifyField label="Emergency Phone" value={result.student.health.emergencyContactPhone} highlight />
                    </div>
                  </div>
                )}

                {/* Parents */}
                {result.student.parents?.length > 0 && (
                  <div className="verification-section">
                    <h4 className="verification-section-title">Parent / Guardian</h4>
                    <div className="verification-details-grid">
                      {result.student.parents.map((p, i) => (
                        <div key={i} style={{ gridColumn: 'span 2' }}>
                          <VerifyField
                            label={p.relation}
                            value={`${p.name} — ${p.phone}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scan Timestamp */}
                {lastScanTime && (
                  <div className="verification-timestamp">
                    Verified at {lastScanTime.toLocaleTimeString()} on {lastScanTime.toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <HiOutlineExclamationCircle style={{ fontSize: '3rem', color: 'var(--color-danger)', marginBottom: 'var(--space-3)' }} />
                <h3 style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>Verification Failed</h3>
                <p style={{ color: 'var(--color-gray-500)' }}>{result.error || 'Student not found in the system.'}</p>
                <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)' }}>
                  The barcode may be invalid or the student record may have been removed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no scan has been performed */}
        {!loading && !result && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-400)' }}>
            <HiOutlineShieldCheck style={{ fontSize: '3rem', marginBottom: 'var(--space-3)', opacity: 0.5 }} />
            <p style={{ fontSize: 'var(--font-lg)' }}>Ready to scan</p>
            <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
              Point the camera at a student's barcode or enter their enrollment number above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyField({ label, value, highlight }) {
  return (
    <div className="verification-field">
      <div className="verification-field-label">{label}</div>
      <div className={`verification-field-value ${highlight ? 'verification-field-highlight' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}
