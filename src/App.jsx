import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Github, Linkedin, ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleHelp, ExternalLink, File, FileText, Folder, GraduationCap, Layers3, Menu, RefreshCw, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api, isConfigured } from './api';

const ROOT_URL = import.meta.env.VITE_DRIVE_ROOT_URL || 'https://drive.google.com/drive/folders/1wls3_9Y_tgoV9Twq8bsiIo3wkrxkcoQ6';
const COLLECTIONS = [
  { key:'CS & CY', short:'S1–S2', name:'B.Tech CS, CY', info:'First year · Semesters 1, 2', folder:'CS&CY_FIRST_YR_NOTES' },
  { key:'CS', short:'CS', name:'B.Tech CS 2019 Scheme', info:'Computer Science · S3–S8', folder:'B.TECH_CS_2019_SCHEME' },
  { key:'CY', short:'CY', name:'B.Tech CY 2019 Scheme', info:'Cyber Security · S3–S8', folder:'B.TECH_CY_2019_SCHEME' }
];
const normalizeName = name => name.toUpperCase().replace(/[^A-Z0-9]/g, '');
const rootId = ROOT_URL.match(/folders\/([\w-]+)/)?.[1];

const formatBytes = bytes => {
  if (!Number.isFinite(+bytes) || +bytes <= 0) return '';
  if (+bytes < 1024 * 1024) return `${Math.round(+bytes/1024)} KB`;
  return `${(+bytes/(1024*1024)).toFixed(1)} MB`;
};
const isPdf = item => item.mimeType === 'application/pdf' || /\.pdf$/i.test(item.name || '');
const captionDurationMs = 4000;
const captions = [
  { lang: 'en', lines: ['Everything you need.', 'One place to learn.'] },
  { lang: 'ml', lines: ['നിങ്ങൾക്ക് വേണ്ട എല്ലാ നോട്ടുകളും', 'ഒറ്റ കൂടക്കിഴിൽ.'] }
].map(caption => {
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(caption.lang, { granularity: 'grapheme' }) : null;
  return { ...caption, units: caption.lines.map(line => segmenter
    ? Array.from(segmenter.segment(line), part => part.segment)
    : Array.from(line.matchAll(/\S+\s*/gu), match => match[0])) };
});

function HeroHeadline() {
  const [frame, setFrame] = useState({ index: 0, count: 1 });
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    function start() {
      clearTimeout(timer);
      const started = performance.now();
      function tick() {
        const elapsed = performance.now() - started;
        const index = Math.floor(elapsed / captionDurationMs) % captions.length;
        const phase = elapsed % captionDurationMs;
        const length = captions[index].units.flat().length;
        const count = motion.matches ? length : Math.min(length, 1 + Math.floor(phase * length / 850));
        setFrame({ index, count });
        timer = setTimeout(tick, count === length ? captionDurationMs - phase : 850 / length);
      }
      tick();
    }
    start();
    motion.addEventListener('change', start);
    return () => { clearTimeout(timer); motion.removeEventListener('change', start); };
  }, []);
  const caption = captions[frame.index];
  const [first, second] = caption.units;
  return <h1 className="typed-heading" aria-label={captions[0].lines.join(' ')}>
    {captions.map(({lang, lines}) => <span key={lang} lang={lang} className="heading-space" aria-hidden="true">{lines[0]}<br/>{lines[1]}</span>)}
    <span lang={caption.lang} className="heading-ink" aria-hidden="true">
      {first.slice(0, frame.count).join('')}<br/>
      <span className="headline-accent">{second.slice(0, Math.max(0, frame.count - first.length)).join('')}</span>
    </span>
  </h1>;
}

function App() {
  const [semesters, setSemesters] = useState({});
  const [loadingHome, setLoadingHome] = useState(isConfigured);
  const [homeError, setHomeError] = useState('');
  const [chosen, setChosen] = useState(null);
  const [trail, setTrail] = useState([]);
  const [children, setChildren] = useState({});
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [refreshId, setRefreshId] = useState(0);

  const loadHome = useCallback(async () => {
    if (!isConfigured) return;
    setLoadingHome(true); setHomeError('');
    try {
      const result = await api('list', { folderId: rootId });
      setSemesters(Object.fromEntries(COLLECTIONS.map(group => [
        group.key, result.items.filter(item => item.type === 'folder' &&
          normalizeName(item.name) === normalizeName(group.folder))
      ])));
    } catch (err) { setHomeError(err.message); }
    finally { setLoadingHome(false); }
  }, []);
  useEffect(() => { loadHome(); }, [loadHome, refreshId]);

  const current = trail[trail.length-1];
  useEffect(() => {
    if (!current || !isConfigured) return;
    let cancelled = false;
    setLoadingFolder(true); setFolderError('');
    api('list', { folderId: current.id, path: trail.map(folder => folder.id).join('/') }).then(result => {
      if (!cancelled) setChildren(prev => ({...prev, [current.id]: result.items || []}));
    }).catch(err => { if (!cancelled) setFolderError(err.message); })
      .finally(() => { if (!cancelled) setLoadingFolder(false); });
    return () => { cancelled = true; };
  }, [trail, refreshId]);

  const refresh = () => { setChildren({}); setRefreshId(id => id+1); };
  const goHome = () => { setChosen(null); setTrail([]); setSearch(''); setPreview(null); setMenuOpen(false); };
  const selectSemester = (sem) => {
    setChosen(sem); setSearch(''); setPreview(null);
    const options = semesters[sem.key] || [];
    if (options.length === 1) setTrail([options[0]]);
    else setTrail([]);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const enterFolder = (folder) => { setTrail(prev => [...prev, folder]); setSearch(''); window.scrollTo({top:0,behavior:'smooth'}); };
  const back = () => { if (trail.length > 1) setTrail(x => x.slice(0,-1)); else if (chosen && (semesters[chosen.key] || []).length > 1) setTrail([]); else goHome(); setSearch(''); };
  const options = chosen ? (semesters[chosen.key] || []) : [];
  const items = current ? (children[current.id] || []) : [];
  const filteredItems = useMemo(() => items.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())), [items, search]);
  const folders = filteredItems.filter(item => item.type === 'folder');
  const files = filteredItems.filter(item => item.type === 'file');
  const matches = options.filter(item => `${item.name} ${item.path || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <div className="site">
    <header className="topbar"><div className="container nav-inner">
      <button className="brand" onClick={goHome} aria-label="Be.Techie Notes homepage">
        <img className="site-logo" src="/brand/logo.png" alt=""/>
        <span className="site-wordmark"><img src="/brand/wordmark.png" alt="Be.Techie Notes"/></span>
      </button>
      <nav id="primary-navigation" className={menuOpen ? 'navlinks open' : 'navlinks'}>
        <button onClick={goHome} className={!chosen ? 'active' : ''}>Home</button>
        <a href={ROOT_URL} target="_blank" rel="noreferrer">Google Drive <ExternalLink size={13}/></a>
        <span className="github-link">2019 Scheme <span className="tiny-orange">✦</span></span>
      </nav>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="primary-navigation">{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button>
    </div></header>

    <main>
      {!chosen ? <>
        <section className="hero container">
          <div className="eyebrow"><span className="status-dot"/> YOUR STUDY SPACE, SIMPLIFIED <span className="eyebrow-line"/></div>
          <HeroHeadline/>
          <p className="hero-copy">Choose your course and semester to find notes for each subject.</p>
          <div className="hero-actions"><a className="primary-btn" href="#semesters">Explore courses <ArrowRight size={17}/></a><a className="secondary-btn" href={ROOT_URL} target="_blank" rel="noreferrer">View Drive <ExternalLink size={16}/></a></div>
          <div className="hero-meta"><span><GraduationCap size={16}/> B.Tech · 2019 Scheme</span><span className="meta-divider"/><span><ShieldCheck size={15}/> Computer Science & Cyber Security</span></div>
          <div className="hero-decoration" aria-hidden="true"><span>19</span><small>SCHEME</small></div>
        </section>
        <section id="semesters" className="semester-section"><div className="container">
          <div className="section-heading"><div><div className="section-overline">YOUR LEARNING PATH</div><h2>Choose your <em>course.</em></h2><p>Browse shared first-year notes or select your branch for semesters 3–8.</p></div><div className="section-badge"><Layers3 size={16}/> 3 COLLECTIONS</div></div>
          {!isConfigured && <div className="notice"><CircleHelp size={20}/><div><strong>Connect Google Drive to load your notes</strong><p>README.md explains how to deploy Apps Script and set <code>VITE_APPS_SCRIPT_URL</code> to connect your notes collection.</p></div></div>}
          {homeError && <div className="notice error"><CircleHelp size={19}/><div><strong>Couldn't load Drive folders</strong><p>{homeError}</p></div><button className="plain-btn" onClick={refresh}>Retry</button></div>}
          <div className="semester-grid">{COLLECTIONS.map((sem, i) => <button key={sem.key} className="semester-card" onClick={() => selectSemester(sem)} disabled={loadingHome || !!homeError}>
            <div className="card-top"><span className="card-index">{String(i+1).padStart(2,'0')} / 03</span><span className="card-arrow"><ArrowRight size={19}/></span></div>
            <div className="card-number">{sem.short}</div>
            <div className="card-bottom"><div><strong>{sem.name}</strong><span>{sem.info}</span></div><span className="card-accent"/></div>
            {isConfigured && !homeError && !loadingHome && (semesters[sem.key] || []).length === 0 && <span className="missing-tag">Folder not found</span>}
          </button>)}</div>
          <div className="section-footer"><span><Sparkles size={16}/> Find subject notes in each semester.</span><button className="refresh-link" onClick={refresh}><RefreshCw size={15} className={loadingHome ? 'spin' : ''}/> Refresh Drive</button></div>
        </div></section>
      </> : <section className="explorer-section container">
        <div className="breadcrumbs"><button onClick={goHome}>Home</button><ChevronRight size={15}/><button onClick={() => {setTrail([]);setSearch('');}}>{chosen.key}</button>{trail.map((part,index)=><React.Fragment key={`${part.id}-${index}`}><ChevronRight size={15}/><button className={index===trail.length-1 ? 'current-crumb' : ''} onClick={() => { setTrail(old=>old.slice(0,index+1));setSearch(''); }}>{part.name}</button></React.Fragment>)}</div>
        <button className="back-link" onClick={back}><ArrowLeft size={17}/> Back</button>
        <div className="explorer-title"><div><div className="section-overline">B.TECH / 2019 SCHEME</div><h1>{current ? current.name : chosen.name}<span className="period">.</span></h1><p>{current ? 'Browse folders and notes from Google Drive.' : 'Choose a course folder to see subjects and study materials.'}</p></div><span className="explorer-symbol">{current ? <Folder size={27}/> : <BookOpen size={27}/>}</span></div>
        <div className="explorer-toolbar"><div className="search-wrap"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={current ? 'Search in this folder…' : 'Search course folders…'} aria-label="Search folders or files"/>{search && <button onClick={()=>setSearch('')} aria-label="Clear search"><X size={16}/></button>}</div><button className="refresh-button" onClick={refresh} title="Refresh"><RefreshCw size={18}/></button></div>
        {!current ? <div className="item-area"><div className="content-title"><h2>Available course folders</h2><span>{matches.length} folders</span></div>{matches.length ? <div className="folder-grid">{matches.map(folder=><button key={folder.id} className="folder-tile" onClick={()=>enterFolder(folder)}><div className="folder-tile-icon"><Folder size={23}/></div><div className="tile-details"><strong>{folder.name}</strong><small>{folder.path || 'Google Drive folder'}</small></div><ArrowRight className="tile-right" size={19}/></button>)}</div> : <Empty text="No matching course folders found. Refresh Drive or check the folder hierarchy."/>}</div>
        : <div className="item-area">{folderError && <div className="notice error"><CircleHelp size={19}/><div><strong>Folder could not load</strong><p>{folderError === 'This folder is outside the configured Drive root.'
            ? 'The notes service could not verify this folder’s location. Open it in Google Drive to view the notes you have access to.'
            : folderError}</p>{current.url && <a href={current.url} target="_blank" rel="noreferrer">Open folder in Google Drive <ExternalLink size={14}/></a>}</div><button className="plain-btn" onClick={refresh}>Retry</button></div>}
          {loadingFolder ? <div className="loading-state"><RefreshCw size={21} className="spin"/> Loading Drive contents…</div> : <>
            {folders.length>0 && <><div className="content-title"><h2>Folders <span className="title-count">{folders.length}</span></h2><span>EXPLORE SUBJECTS</span></div><div className="folder-grid">{folders.map(folder=><button className="folder-tile" key={folder.id} onClick={()=>enterFolder(folder)}><div className="folder-tile-icon"><Folder size={23}/></div><div className="tile-details"><strong>{folder.name}</strong><small>Open folder</small></div><ArrowRight className="tile-right" size={19}/></button>)}</div></>}
            {files.length>0 && <><div className="content-title files-heading"><h2>Study materials <span className="title-count">{files.length}</span></h2><span>NOTES & RESOURCES</span></div><div className="files-list">{files.map(file=><div key={file.id} className="file-row"><span className="file-icon">{isPdf(file) ? <FileText size={21}/> : <File size={21}/>}</span><div className="file-info"><strong title={file.name}>{file.name}</strong><span>{isPdf(file) ? 'PDF document' : 'Study resource'}{file.size ? ` · ${formatBytes(file.size)}` : ''}</span></div><div className="file-actions">{isPdf(file) && <button onClick={()=>setPreview(file)}>Preview</button>}<a href={file.url} target="_blank" rel="noreferrer" title="Open in Drive"><ExternalLink size={18}/></a>{file.downloadUrl && <a href={file.downloadUrl} target="_blank" rel="noreferrer" title="Download"><ArrowDownToLine size={18}/></a>}</div></div>)}</div></>}
            {!folderError && !folders.length && !files.length && <Empty text={search ? 'No matching items in this folder.' : 'This folder is empty, or you do not have permission to view its contents.'}/>}
          </>}
        </div>}
      </section>}
    </main>
    <footer className="footer"><div className="container footer-inner"><span className="footer-brand">Be.Techie Notes</span>
      <div className="developer-credit"><div><small>Meet the Developer</small><strong>Deon George</strong></div>
        <a href="https://github.com/deon-george" target="_blank" rel="noreferrer" aria-label="Deon George on GitHub"><Github size={20}/></a>
        <a href="https://www.linkedin.com/in/deon-george-vadakkel/" target="_blank" rel="noreferrer" aria-label="Deon George on LinkedIn"><Linkedin size={20}/></a>
      </div><span>© {new Date().getFullYear()}</span><a href={ROOT_URL} target="_blank" rel="noreferrer">Powered by Google Drive <ExternalLink size={13}/></a></div></footer>
    {preview && <div className="modal" role="dialog" aria-modal="true" aria-label={`${preview.name} preview`} onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}><div className="modal-dialog"><div className="modal-head"><span><FileText size={18}/> {preview.name}</span><button onClick={()=>setPreview(null)} aria-label="Close preview"><X size={22}/></button></div><iframe src={`https://drive.google.com/file/d/${encodeURIComponent(preview.id)}/preview`} title={preview.name}/><div className="modal-foot"><span>Preview requires permission to access this file.</span><a href={preview.url} target="_blank" rel="noreferrer">Open in Drive <ExternalLink size={15}/></a></div></div></div>}
  </div>;
}
function Empty({text}) { return <div className="empty-state"><Folder size={29}/><strong>Nothing here yet</strong><p>{text}</p></div>; }
export default App;
