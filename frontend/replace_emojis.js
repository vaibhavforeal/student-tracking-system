const fs = require('fs');
const path = require('path');
const srcDir = 'd:/Software Ideas/College Student Management/student-tracking-system-master/frontend/src';

const mappings = [
  { file: 'pages/admin/ManageDepartments.jsx', replaces: [
    { from: "?? {error}", to: "<AlertTriangle size={16} style={{ marginBottom: -3 }} /> {error}", icon: "AlertTriangle" },
    { from: "?", to: "<X size={20} />", icon: "X" }
  ]},
  { file: 'pages/admin/ManageFeedback.jsx', replaces: [
    { from: "? Your Reply", to: "<Check size={14} style={{ display: 'inline', marginBottom: -2 }} /> Your Reply", icon: "Check" }
  ]},
  { file: 'pages/admin/ManageSections.jsx', replaces: [
    { from: "?", to: "<X size={20} />", icon: "X" }
  ]},
  { file: 'pages/admin/ManageSkillCourses.jsx', replaces: [
    { from: "?? {error}", to: "<AlertTriangle size={16} style={{ marginBottom: -3 }} /> {error}", icon: "AlertTriangle" },
    { from: "?? {catError}", to: "<AlertTriangle size={16} style={{ marginBottom: -3 }} /> {catError}", icon: "AlertTriangle" },
    { from: ">?<", to: "><X size={20} /><", icon: "X" },
    { from: "?</button>", to: "<X size={20} /></button>", icon: "X" }
  ]},
  { file: 'pages/admin/ManageStaff.jsx', replaces: [
    { from: "?", to: "<X size={20} />", icon: "X" }
  ]},
  { file: 'pages/admin/ManageStudents.jsx', replaces: [
    { from: ">?<", to: "><X size={20} /><", icon: "X" },
    { from: "?</button>", to: "<X size={20} /></button>", icon: "X" }
  ]},
  { file: 'pages/admin/ManageUsers.jsx', replaces: [
    { from: "?? {error}", to: "<AlertTriangle size={16} style={{ marginBottom: -3 }} /> {error}", icon: "AlertTriangle" }
  ]},
  { file: 'pages/admin/Reports.jsx', replaces: [
    { from: "? \", to: "\", code: true },
    { from: "? Failed", to: "Failed", code: true },
    { from: "message.startsWith('?')", to: "messageType === 'success'", code: true },
    { from: "setMessage(? \ report downloaded successfully!);", to: "setMessage(\ report downloaded successfully!); setMessageType('success');", code: true },
    { from: "setMessage(? Failed to generate report. \);", to: "setMessage(Failed to generate report. \); setMessageType('error');", code: true },
    { from: "const [message, setMessage] = useState('');", to: "const [message, setMessage] = useState('');\n  const [messageType, setMessageType] = useState('success');", code: true },
    { from: ">?<", to: "><Check size={18} /><", icon: "Check" },
    { from: "emoji: '??'", to: "icon: <BarChart2 size={24} />", icon: "BarChart2" },
    { from: "emoji: '??'", to: "icon: <FileText size={24} />", icon: "FileText" },
    { from: "{f.emoji}", to: "{f.icon}", code: true },
    { from: ">??<", to: "><BarChart2 size={48} /><", icon: "BarChart2" }
  ]},
  { file: 'pages/admin/SemesterPromotion.jsx', replaces: [
    { from: "?? {error}", to: "<AlertTriangle size={16} style={{ marginBottom: -3 }} /> {error}", icon: "AlertTriangle" },
    { from: ">?<", to: "><Check size={24} /><", icon: "Check" }
  ]},
  { file: 'pages/admin/StudentDetail.jsx', replaces: [
    { from: ">?<", to: "><X size={20} /><", icon: "X" },
    { from: "?</button>", to: "<X size={20} /></button>", icon: "X" }
  ]},
  { file: 'pages/admin/Trash.jsx', replaces: [
    { from: "'? Delete'", to: "<><X size={16} style={{ marginBottom: -2 }} /> Delete</>", icon: "X" }
  ]},
  { file: 'pages/shared/VerifyStudent.jsx', replaces: [
    { from: "label: '? ACTIVE STUDENT'", to: "label: 'ACTIVE STUDENT'", code: true },
    { from: "label: '? INACTIVE'", to: "label: 'INACTIVE'", code: true },
    { from: "label: '?? GRADUATED'", to: "label: 'GRADUATED'", code: true },
    { from: "label: '? DROPPED'", to: "label: 'DROPPED'", code: true },
    { from: "icon: '??'", to: "icon: <CheckCircle2 size={16} color=\"#22c55e\" />", icon: "CheckCircle2" },
    { from: "icon: '??'", to: "icon: <XCircle size={16} color=\"#ef4444\" />", icon: "XCircle" },
    { from: "icon: '??'", to: "icon: <GraduationCap size={16} color=\"#eab308\" />", icon: "GraduationCap" },
    { from: "{statusObj.icon} {statusObj.label}", to: "<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{statusObj.icon} {statusObj.label}</span>", code: true }
  ]},
  { file: 'pages/student/Dashboard.jsx', replaces: [
    { from: " ??", to: " <Hand size={28} style={{ color: '#fbbf24', marginLeft: 8 }} />", icon: "Hand" }
  ]},
  { file: 'pages/student/Feedback.jsx', replaces: [
    { from: " ??", to: " <PartyPopper size={16} style={{ marginLeft: 6, display: 'inline' }} />", icon: "PartyPopper" }
  ]},
  { file: 'pages/student/SkillCourses.jsx', replaces: [
    { from: "'?? Browse Catalog'", to: "<><Search size={16} style={{ marginRight: 6, marginBottom: -3, display: 'inline' }} /> Browse Catalog</>", icon: "Search" },
    { from: "'?? My Courses'", to: "<><Book size={16} style={{ marginRight: 6, marginBottom: -3, display: 'inline' }} /> My Courses</>", icon: "Book" },
    { from: "? Enrolled", to: "<><Check size={14} style={{ display: 'inline', marginBottom: -2, marginRight: 4 }} /> Enrolled</>", icon: "Check" },
    { from: "? Completed", to: "<><Check size={14} style={{ display: 'inline', marginBottom: -2, marginRight: 4 }} /> Completed</>", icon: "Check" }
  ]}
];

for (let map of mappings) {
  let p = path.join(srcDir, map.file);
  if (!fs.existsSync(p)) {
    console.log("Not found: " + p);
    continue;
  }
  let c = fs.readFileSync(p, 'utf8');
  let iconsToImport = new Set();
  let changed = false;
  for (let rep of map.replaces) {
    if (c.includes(rep.from)) {
      c = c.replaceAll(rep.from, rep.to);
      if (rep.icon) iconsToImport.add(rep.icon);
      changed = true;
    }
  }
  
  if (changed && iconsToImport.size > 0) {
    let importStr = import { \ } from 'lucide-react';\n;
    if (!c.includes('lucide-react')) {
      let lines = c.split('\n');
      let importIdx = lines.findIndex(l => !l.startsWith('import'));
      if (importIdx === -1) importIdx = 0;
      lines.splice(importIdx, 0, importStr.trim());
      c = lines.join('\n');
    } else {
      c = c.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
        let existing = p1.split(',').map(s => s.trim());
        for (let i of iconsToImport) {
          if (!existing.includes(i)) existing.push(i);
        }
        return import { \ } from 'lucide-react';;
      });
    }
  }
  if (changed) {
    fs.writeFileSync(p, c);
    console.log("Updated " + map.file);
  }
}
