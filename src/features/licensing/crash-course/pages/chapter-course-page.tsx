import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './crash-course-page.css';

const STORAGE_VID_PROGRESS = 'crash_vid_progress_v1';
const STORAGE_MODULE_PROGRESS = 'crash_module_progress_v1';
const STORAGE_NOTES = 'crash_notes_v1';

interface VideoItem {
  id: string;
  title: string;
  durationMin: number;
  src: string;
}

interface ModuleData {
  id: string;
  title: string;
  videos: VideoItem[];
}

type ModulesMap = Record<string, ModuleData>;

interface LocationState {
  module?: ModuleData;
}

const FALLBACK_MODULES: ModulesMap = {
  m1: {
    id: 'm1',
    title: "Do's/Don'ts & Strategies",
    videos: [
      { id: 'm1v1', title: 'Mindset & Gameplan', durationMin: 6, src: '' },
      { id: 'm1v2', title: "Top 5 Do's", durationMin: 5, src: '' },
      { id: 'm1v3', title: "Top 5 Don'ts", durationMin: 5, src: '' },
      { id: 'm1v4', title: 'Study Rhythm', durationMin: 7, src: '' },
      { id: 'm1v5', title: 'Accountability', durationMin: 6, src: '' },
      { id: 'm1v6', title: 'Fast-Track Tips', durationMin: 6, src: '' },
    ],
  },
  m2: {
    id: 'm2',
    title: 'Life Insurance Concepts',
    videos: [
      { id: 'm2v1', title: 'Term & Whole Life', durationMin: 8, src: '' },
      { id: 'm2v2', title: 'Qualified vs Non-Qualified', durationMin: 7, src: '' },
      { id: 'm2v3', title: 'Riders', durationMin: 6, src: '' },
      { id: 'm2v4', title: 'Beneficiaries', durationMin: 6, src: '' },
      { id: 'm2v5', title: 'Underwriting Basics', durationMin: 7, src: '' },
      { id: 'm2v6', title: 'Policy Provisions', durationMin: 6, src: '' },
      { id: 'm2v7', title: 'State vs. Carrier', durationMin: 6, src: '' },
    ],
  },
  m3: {
    id: 'm3',
    title: 'Annuities & General Life',
    videos: [
      { id: 'm3v1', title: 'Fixed & Indexed', durationMin: 8, src: '' },
      {
        id: 'm3v2',
        title: 'Qualified vs Non-Qualified',
        durationMin: 7,
        src: '',
      },
      { id: 'm3v3', title: 'Suitability', durationMin: 6, src: '' },
    ],
  },
  m4: {
    id: 'm4',
    title: 'Medical and Disability Concepts',
    videos: [
      { id: 'm4v1', title: 'Medical Basics', durationMin: 7, src: '' },
      { id: 'm4v2', title: 'Disability Income', durationMin: 7, src: '' },
      { id: 'm4v3', title: 'Med Underwriting', durationMin: 6, src: '' },
      { id: 'm4v4', title: 'Ethics & Compliance', durationMin: 6, src: '' },
    ],
  },
  m5: {
    id: 'm5',
    title: 'Practice Tests / Simulated Exams',
    videos: [
      { id: 'm5v1', title: 'Practice Test A', durationMin: 12, src: '' },
      { id: 'm5v2', title: 'Practice Test B', durationMin: 12, src: '' },
      { id: 'm5v3', title: 'Simulated Final', durationMin: 18, src: '' },
    ],
  },
};

function LayoutCSS() {
  return (
    <style>{`
.mcx-wrap { max-width: 1400px; margin: 0 auto; color: var(--text); }

.mcx-topbar{
  display:flex; align-items:center; gap:14px;
  padding:12px 4px 10px;
}
.mcx-back{ color:var(--muted); font-weight:800; cursor:pointer; user-select:none; }
.mcx-title{ font-weight:1000; letter-spacing:.04em; }

.mcx-playerRow{
  display:grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  align-items: start;
}

.mcx-resizer{ position: relative; }
.mcx-resize-handle{
  position:absolute; top:0; right:-6px; bottom:0; width:12px; cursor:col-resize;
  background: transparent;
}

.mcx-videoCard{
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 14px 30px rgba(0,0,0,.35);
  overflow: hidden;
}
.mcx-videoTop{ padding: 12px 12px 0 12px; }
.mcx-video{
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 10px;
}
.mcx-nowRow{
  display:flex; align-items:center; gap:10px; padding: 10px 12px;
  color: var(--muted); font-weight:800;
}
.mcx-duration{ margin-left:auto; display:flex; align-items:center; gap:6px; }

.mcx-lessons{ padding: 8px 12px 12px; border-top: 1px solid var(--border); }
.mcx-lessonsHead{
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom: 8px;
}
.mcx-lessonList{
  max-height: 300px; overflow:auto;
  border:1px solid var(--border); border-radius: 10px; background:#0b0e13;
}
.mcx-lesson{
  display:grid; grid-template-columns: 44px 1fr 70px 120px; align-items:center;
  gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.06);
  color: var(--text);
}
.mcx-lesson:last-child{ border-bottom: none; }
.mcx-lesson .idx{ opacity:.8; font-weight:900; text-align:center; }
.mcx-lesson .ttl{ font-weight:900; }
.mcx-lesson .tm{ opacity:.9; font-weight:800; text-align:right; }
.mcx-lesson .bar{ height:8px; background:#0b0e13; border:1px solid var(--border); border-radius:999px; overflow:hidden; }
.mcx-lesson .fill{ height:100%; background:linear-gradient(90deg, var(--gold), var(--gold-600)); }
.mcx-lesson.active{ background: rgba(255,255,255,.06); }

.mcx-notes{
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 14px 30px rgba(0,0,0,.35);
  overflow: hidden;
  min-height: 400px;
  display:flex; flex-direction:column;
}
.mcx-notesHead{
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; border-bottom:1px solid var(--border);
}
.mcx-toolbar{ display:flex; gap:6px; }
.mcx-toolbtn{
  border:1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06);
  border-radius:8px; padding:6px 8px; font-weight:900; cursor:pointer;
}
.mcx-close{ opacity:.8; cursor:pointer; }

.mcx-noteArea{
  border: none; outline: none; resize: none;
  width: 100%; height: 100%; padding: 12px; color: var(--text);
  background: transparent; font-size: 14px; line-height: 1.45;
}
.mcx-noteFoot{
  padding:8px 12px; border-top:1px solid var(--border);
  color:var(--muted); font-weight:800;
}

.mcx-notesToggle{ margin-left: 8px; }

@media (max-width: 1100px){
  .mcx-playerRow{ grid-template-columns: 1fr; }
  .mcx-notes{ order: 3; }
}
    `}</style>
  );
}

export default function ChapterCoursePage() {
  const { chapterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const moduleState = (location.state as LocationState | null)?.module;
  const fallback = (chapterId ? FALLBACK_MODULES[chapterId] : null) ?? null;
  const moduleData: ModuleData =
    moduleState ??
    fallback ?? {
      id: chapterId || 'm1',
      title: 'Module',
      videos: [{ id: 'v1', title: 'Lesson', durationMin: 5, src: '' }],
    };

  const [vidProgress, setVidProgress] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_VID_PROGRESS) || '{}');
    } catch {
      return {};
    }
  });

  const [notes, setNotes] = useState(() => {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_NOTES) || '{}') as Record<string, string>;
      return all[moduleData.id] || '';
    } catch {
      return '';
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const active = moduleData.videos[activeIndex] ?? moduleData.videos[0];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const totalMinutes = useMemo(
    () => moduleData.videos.reduce((sum, video) => sum + (video.durationMin || 0), 0),
    [moduleData]
  );

  useEffect(() => {
    const all = (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_NOTES) || '{}') as Record<string, string>;
      } catch {
        return {};
      }
    })();
    all[moduleData.id] = notes;
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(all));
  }, [notes, moduleData.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !active) return;

    const key = `${moduleData.id}:${active.id}`;
    const onTime = () => {
      if (!el.duration || Number.isNaN(el.duration)) return;

      const pct = Math.max(0, Math.min(100, Math.round((el.currentTime / el.duration) * 100)));
      setVidProgress((prev) => {
        const next = { ...prev, [key]: pct };
        localStorage.setItem(STORAGE_VID_PROGRESS, JSON.stringify(next));

        const ids = moduleData.videos.map((video) => `${moduleData.id}:${video.id}`);
        const avg = Math.round(ids.reduce((sum, id) => sum + (next[id] || 0), 0) / ids.length);

        const moduleProgress = (() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_MODULE_PROGRESS) || '{}') as Record<string, number>;
          } catch {
            return {};
          }
        })();

        moduleProgress[moduleData.id] = avg;
        localStorage.setItem(STORAGE_MODULE_PROGRESS, JSON.stringify(moduleProgress));
        return next;
      });
    };

    const onEnded = () => {
      const nextIndex = activeIndex + 1;
      if (nextIndex < moduleData.videos.length) {
        setActiveIndex(nextIndex);
      }
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [active, activeIndex, moduleData]);

  useEffect(() => {
    const grid = stripRef.current;
    if (!grid) return;

    const handle = grid.querySelector('.mcx-resize-handle') as HTMLDivElement | null;
    if (!handle) return;

    let down = false;
    const minLeft = 420;
    const minRight = 340;

    const start = (event: MouseEvent | TouchEvent) => {
      down = true;
      event.preventDefault();
    };

    const move = (event: MouseEvent | TouchEvent) => {
      if (!down) return;
      const rect = grid.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
      const x = clientX - rect.left;
      const clamped = Math.max(minLeft, Math.min(x, rect.width - minRight));
      grid.style.gridTemplateColumns = `${clamped}px ${rect.width - clamped}px`;
    };

    const end = () => {
      down = false;
    };

    handle.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: true });

    return () => {
      handle.removeEventListener('mousedown', start);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      handle.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, []);

  const progressOf = (video: VideoItem): number => {
    const key = `${moduleData.id}:${video.id}`;
    return vidProgress[key] || 0;
  };

  return (
    <div className="mcx-wrap">
      <LayoutCSS />

      <div className="mcx-topbar">
        <span className="mcx-back" onClick={() => navigate(-1)}>
          {'<'} Back
        </span>
        <div className="mcx-title">{moduleData.title}</div>
      </div>

      <div className="mcx-playerRow" ref={stripRef}>
        <div className="mcx-resizer">
          <div className="mcx-videoCard">
            <div className="mcx-videoTop">
              <video
                ref={videoRef}
                key={active?.id}
                className="mcx-video"
                src={active?.src || ''}
                controls
                playsInline
              />
            </div>

            <div className="mcx-nowRow">
              <span>Now Playing</span>
              <span className="mcx-duration">⏱ {active?.durationMin || '–'}m</span>
            </div>

            <div className="mcx-lessons">
              <div className="mcx-lessonsHead">
                <div style={{ fontWeight: 900 }}>Lessons</div>
                <button
                  className="cc-btn cc-btn-gold mcx-notesToggle"
                  onClick={() => {
                    const grid = stripRef.current;
                    if (!grid) return;
                    const collapsed = grid.dataset.notes === 'off';
                    if (collapsed) {
                      grid.style.gridTemplateColumns = '';
                      grid.dataset.notes = 'on';
                    } else {
                      grid.style.gridTemplateColumns = '1fr 0px';
                      grid.dataset.notes = 'off';
                    }
                  }}
                >
                  Notes
                </button>
              </div>

              <div className="mcx-lessonList">
                {moduleData.videos.map((video, index) => (
                  <div
                    key={video.id}
                    className={`mcx-lesson ${index === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="idx">#{index + 1}</div>
                    <div className="ttl">{video.title}</div>
                    <div className="tm">{video.durationMin || '–'}m</div>
                    <div className="bar">
                      <div className="fill" style={{ width: `${progressOf(video)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mcx-resize-handle" aria-hidden />
        </div>

        <aside className="mcx-notes">
          <div className="mcx-notesHead">
            <div style={{ fontWeight: 1000 }}>Notes</div>
            <div className="mcx-toolbar">
              <button
                className="mcx-toolbtn"
                onClick={() => {
                  document.execCommand('bold');
                }}
              >
                B
              </button>
              <button
                className="mcx-toolbtn"
                onClick={() => {
                  document.execCommand('italic');
                }}
              >
                I
              </button>
              <button
                className="mcx-toolbtn"
                onClick={() => {
                  document.execCommand('underline');
                }}
              >
                U
              </button>
              <button
                className="mcx-toolbtn"
                onClick={() => {
                  const color =
                    prompt('Highlight color (e.g. #fff48f or yellow):', '#fff48f') || '';
                  if (!color) return;
                  document.execCommand('backColor', false, color);
                }}
              >
                H
              </button>
              <span
                className="mcx-close"
                title="Hide Notes"
                onClick={() => {
                  const grid = stripRef.current;
                  if (!grid) return;
                  grid.style.gridTemplateColumns = '1fr 0px';
                  grid.dataset.notes = 'off';
                }}
              >
                ×
              </span>
            </div>
          </div>

          <textarea
            className="mcx-noteArea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Your notes for this module..."
          />
          <div className="mcx-noteFoot">Saved automatically for this chapter.</div>
        </aside>
      </div>

      <div style={{ opacity: 0.8, marginTop: 8, fontSize: 12 }}>Total duration: {totalMinutes}m</div>
    </div>
  );
}