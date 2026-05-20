import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Download,
  Settings,
  Search,
  Code,
  FileText,
  Folder,
  Copy,
  Check,
  Eye,
  EyeOff,
  Tag,
  Clock,
  Star,
  Menu,
  X,
  FileJson,
  FileCode,
} from 'lucide-react';

// ============================================================================
// SYNTAX HIGHLIGHTING - Simple but effective
// ============================================================================
const LANGUAGE_KEYWORDS = {
  javascript: {
    keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch', 'new', 'this'],
    regex: /\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await|try|catch|new|this)\b/g,
    color: '#61afef'
  },
  python: {
    keywords: ['def', 'class', 'if', 'else', 'for', 'while', 'import', 'from', 'return', 'self', 'async', 'await', 'try', 'except', 'with', 'as', 'lambda', 'None', 'True', 'False'],
    regex: /\b(def|class|if|else|for|while|import|from|return|self|async|await|try|except|with|as|lambda|None|True|False)\b/g,
    color: '#61afef'
  },
  typescript: {
    keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'interface', 'type', 'import', 'export', 'async', 'await', 'try', 'catch'],
    regex: /\b(function|const|let|var|if|else|for|while|return|class|interface|type|import|export|async|await|try|catch)\b/g,
    color: '#61afef'
  },
  bash: {
    keywords: ['if', 'then', 'else', 'for', 'do', 'done', 'while', 'case', 'function', 'return', 'export', 'cd', 'ls', 'echo', 'grep'],
    regex: /\b(if|then|else|for|do|done|while|case|function|return|export|cd|ls|echo|grep)\b/g,
    color: '#61afef'
  },
  sql: {
    keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'JOIN', 'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING'],
    regex: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|JOIN|ON|AND|OR|ORDER|BY|GROUP|HAVING)\b/gi,
    color: '#61afef'
  },
  json: {
    keywords: [],
    regex: /[\{\}\[\]]/g,
    color: '#61afef'
  },
  html: {
    keywords: ['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'class', 'id', 'src', 'href'],
    regex: /\b(html|head|body|div|span|p|h1|h2|h3|class|id|src|href)\b/g,
    color: '#61afef'
  },
  css: {
    keywords: ['color', 'background', 'border', 'padding', 'margin', 'width', 'height', 'display', 'flex', 'grid', 'font', 'text'],
    regex: /\b(color|background|border|padding|margin|width|height|display|flex|grid|font|text)\b/g,
    color: '#61afef'
  }
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const AINotebook = () => {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [parentNoteId, setParentNoteId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');

  // Load notes from localStorage on mount
  useEffect(() => {
    const loadNotes = () => {
      try {
        const saved = localStorage.getItem('aiNotebook_notes_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
          if (parsed.length > 0) {
            setActiveNoteId(parsed[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load notes', e);
      }
    };
    loadNotes();
  }, []);

  // Auto-save to localStorage with debouncing
  useEffect(() => {
    if (notes.length > 0) {
      setAutoSaveStatus('saving');
      const timer = setTimeout(() => {
        try {
          localStorage.setItem('aiNotebook_notes_v2', JSON.stringify(notes));
          setAutoSaveStatus('saved');
        } catch (e) {
          console.error('Failed to save notes', e);
          setAutoSaveStatus('error');
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [notes]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  const createNewNote = (title = 'Untitled Note', parentId = null) => {
    const newNote = {
      id: Date.now(),
      title,
      parentId,
      blocks: [{ id: 'block_' + Date.now(), type: 'text', content: '' }],
      tags: [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setShowNewNoteModal(false);
    return newNote;
  };

  const updateNote = (id, updates) => {
    setNotes(notes.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ));
  };

  const deleteNote = (id) => {
    const childNotes = notes.filter(n => n.parentId === id);
    setNotes(notes.filter(n => n.id !== id && !childNotes.includes(n)));
    if (activeNoteId === id) {
      setActiveNoteId(notes.length > 1 ? notes[0].id : null);
    }
  };

  const toggleFolder = (id) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFavorite = (id) => {
    updateNote(id, { isFavorite: !notes.find(n => n.id === id)?.isFavorite });
  };

  const getChildNotes = (noteId) => notes.filter(n => n.parentId === noteId);
  const getRootNotes = () => notes.filter(n => !n.parentId);

  const filteredRootNotes = getRootNotes().filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <SidebarComponent
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notes={filteredRootNotes}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        expandedFolders={expandedFolders}
        toggleFolder={toggleFolder}
        getChildNotes={getChildNotes}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onNewNote={() => {
          setParentNoteId(null);
          setShowNewNoteModal(true);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        {activeNote ? (
          <HeaderComponent
            note={activeNote}
            onTitleChange={(title) => updateNote(activeNoteId, { title })}
            onDelete={() => deleteNote(activeNoteId)}
            onExport={(format) => exportNote(activeNote, format)}
            autoSaveStatus={autoSaveStatus}
            onToggleFavorite={() => toggleFavorite(activeNoteId)}
            isFavorite={activeNote.isFavorite}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        ) : null}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeNote ? (
            <EditorComponent
              note={activeNote}
              onAddBlock={(type) => addBlockToNote(activeNoteId, type, notes, setNotes)}
              onUpdateBlock={(blockId, content, language) => updateBlockInNote(activeNoteId, blockId, content, language, notes, setNotes)}
              onDeleteBlock={(blockId) => deleteBlockFromNote(activeNoteId, blockId, notes, setNotes)}
              onAddSubNote={() => {
                setParentNoteId(activeNoteId);
                setShowNewNoteModal(true);
              }}
              childNotes={getChildNotes(activeNoteId)}
              onSelectNote={setActiveNoteId}
            />
          ) : (
            <EmptyStateComponent
              onCreateNote={() => {
                setParentNoteId(null);
                setShowNewNoteModal(true);
              }}
            />
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <NewNoteModalComponent
          onCreate={(title) => createNewNote(title, parentNoteId)}
          onClose={() => {
            setShowNewNoteModal(false);
            setParentNoteId(null);
          }}
          isSubNote={parentNoteId !== null}
        />
      )}
    </div>
  );
};

// ============================================================================
// SIDEBAR COMPONENT - ENHANCED
// ============================================================================
const SidebarComponent = ({
  sidebarOpen,
  setSidebarOpen,
  notes,
  activeNoteId,
  setActiveNoteId,
  expandedFolders,
  toggleFolder,
  getChildNotes,
  searchTerm,
  setSearchTerm,
  onNewNote,
}) => {
  const favorites = notes.filter(n => n.isFavorite);
  const recent = notes.slice(0, 5);

  return (
    <div
      className={`${
        sidebarOpen ? 'w-80' : 'w-0'
      } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex flex-col shadow-sm`}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
            📚
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              StudyHub
            </h1>
            <p className="text-xs text-gray-500">AI Learning Notebook</p>
          </div>
        </div>

        <button
          onClick={onNewNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg"
        >
          <Plus size={18} /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">⭐ Favorites</h3>
          {favorites.map(note => (
            <NoteTreeItem
              key={note.id}
              note={note}
              activeNoteId={activeNoteId}
              onSelect={setActiveNoteId}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              getChildNotes={getChildNotes}
              level={0}
            />
          ))}
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {notes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            <FileText size={32} className="mx-auto mb-2 text-gray-400" />
            <p>No notes yet</p>
            <p className="text-xs mt-1">Create your first note to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notes.map(note => (
              <NoteTreeItem
                key={note.id}
                note={note}
                activeNoteId={activeNoteId}
                onSelect={setActiveNoteId}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                getChildNotes={getChildNotes}
                level={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Sidebar</span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          <Menu size={18} />
        </button>
      </div>
    </div>
  );
};

// Note Tree Item Component
const NoteTreeItem = ({
  note,
  activeNoteId,
  onSelect,
  expandedFolders,
  toggleFolder,
  getChildNotes,
  level = 0,
}) => {
  const childNotes = getChildNotes(note.id);
  const isExpanded = expandedFolders.has(note.id);
  const isActive = activeNoteId === note.id;

  return (
    <div>
      <button
        onClick={() => onSelect(note.id)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-left font-medium text-sm ${
          isActive
            ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-l-4 border-blue-600'
            : 'hover:bg-gray-100 text-gray-700 border-l-4 border-transparent'
        }`}
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        {childNotes.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(note.id);
            }}
            className="p-0 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {childNotes.length === 0 && <div className="w-4" />}

        <FileText size={15} className="flex-shrink-0" />
        <span className="flex-1 truncate">{note.title}</span>

        {note.isFavorite && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
      </button>

      {isExpanded && childNotes.length > 0 && (
        <div className="space-y-1">
          {childNotes.map(child => (
            <NoteTreeItem
              key={child.id}
              note={child}
              activeNoteId={activeNoteId}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              getChildNotes={getChildNotes}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================
const HeaderComponent = ({
  note,
  onTitleChange,
  onDelete,
  onExport,
  autoSaveStatus,
  onToggleFavorite,
  isFavorite,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 px-8 py-4 sticky top-0 z-10 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-6">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex-1">
          <input
            type="text"
            value={note.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-3xl font-bold w-full focus:outline-none bg-transparent"
          />
          <p className="text-xs mt-2 text-gray-500">
            Last updated {new Date(note.updatedAt).toLocaleDateString()} at{' '}
            {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              autoSaveStatus === 'saved'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {autoSaveStatus === 'saved' ? '✓ Saved' : 'Saving...'}
          </span>

          <button
            onClick={onToggleFavorite}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Add to favorites"
          >
            <Star size={20} className={isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'} />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export note"
            >
              <Download size={20} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onExport('md');
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm"
                >
                  <FileText size={16} /> Markdown (.md)
                </button>
                <button
                  onClick={() => {
                    onExport('html');
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm"
                >
                  <FileCode size={16} /> HTML (.html)
                </button>
                <button
                  onClick={() => {
                    onExport('json');
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FileJson size={16} /> JSON (.json)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EDITOR COMPONENT
// ============================================================================
const EditorComponent = ({
  note,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onAddSubNote,
  childNotes,
  onSelectNote,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-12 py-10">
      {/* Blocks */}
      <div className="space-y-6">
        {note.blocks.map((block, idx) => (
          <div key={block.id} className="group">
            {block.type === 'text' && (
              <TextBlockComponent
                block={block}
                updateBlock={onUpdateBlock}
                deleteBlock={onDeleteBlock}
              />
            )}
            {block.type === 'code' && (
              <CodeBlockComponent
                block={block}
                updateBlock={onUpdateBlock}
                deleteBlock={onDeleteBlock}
              />
            )}
            {block.type === 'heading' && (
              <HeadingBlockComponent
                block={block}
                updateBlock={onUpdateBlock}
                deleteBlock={onDeleteBlock}
              />
            )}
            {block.type === 'quote' && (
              <QuoteBlockComponent
                block={block}
                updateBlock={onUpdateBlock}
                deleteBlock={onDeleteBlock}
              />
            )}

            {idx === note.blocks.length - 1 && (
              <div className="mt-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AddBlockButton onClick={() => onAddBlock('text')} label="Text" />
                <AddBlockButton onClick={() => onAddBlock('heading')} label="Heading" />
                <AddBlockButton onClick={() => onAddBlock('code')} label="Code" icon={<Code size={14} />} />
                <AddBlockButton onClick={() => onAddBlock('quote')} label="Quote" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-Notes Section */}
      {(childNotes.length > 0 || true) && (
        <div className="mt-16 pt-10 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
              <Folder size={24} className="text-blue-600" /> Sub-Topics ({childNotes.length})
            </h3>
            <button
              onClick={onAddSubNote}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md font-medium"
            >
              <Plus size={16} /> Add Sub-Topic
            </button>
          </div>

          {childNotes.length === 0 ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-100">
              <p className="text-gray-700 mb-2">Create sub-topics to organize your learning.</p>
              <p className="text-sm text-gray-600">
                Example: For "RAG" create "Chunking", "Embeddings", "Vector DB", and "Retrieval"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childNotes.map(child => (
                <SubNoteCard
                  key={child.id}
                  note={child}
                  onSelect={() => onSelectNote(child.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Sub-Note Card
const SubNoteCard = ({ note, onSelect }) => {
  const blockCount = note.blocks.length;
  const textContent = note.blocks
    .filter(b => b.type === 'text')
    .map(b => b.content)
    .join(' ')
    .substring(0, 120);

  return (
    <button
      onClick={onSelect}
      className="p-5 rounded-lg border border-gray-200 transition-all text-left bg-white hover:border-blue-400 hover:shadow-md hover:bg-blue-50"
    >
      <h4 className="font-bold mb-2 text-gray-900 text-lg line-clamp-1">{note.title}</h4>
      <p className="text-xs mb-3 text-gray-500 font-medium">{blockCount} blocks</p>
      {textContent && (
        <p className="text-sm line-clamp-2 text-gray-600">{textContent}</p>
      )}
    </button>
  );
};

// Add Block Button
const AddBlockButton = ({ onClick, label, icon }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium hover:border-gray-400"
  >
    {icon}
    {label}
  </button>
);

// ============================================================================
// BLOCK COMPONENTS
// ============================================================================

const TextBlockComponent = ({ block, updateBlock, deleteBlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full p-4 rounded-lg font-normal text-base leading-relaxed resize-none focus:outline-none border-2 border-blue-300 bg-blue-50"
          style={{ minHeight: '180px' }}
        />
        <button
          onClick={() => deleteBlock(block.id)}
          className="absolute top-3 right-3 p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-text p-4 min-h-10 rounded-lg transition-colors text-gray-900 hover:bg-gray-50"
    >
      {block.content ? (
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words text-gray-800">{block.content}</p>
      ) : (
        <p className="text-base text-gray-400 italic">Click to write...</p>
      )}
    </div>
  );
};

const HeadingBlockComponent = ({ block, updateBlock, deleteBlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full px-4 py-3 text-2xl font-bold rounded-lg focus:outline-none border-2 border-blue-300 bg-blue-50"
        />
        <button
          onClick={() => deleteBlock(block.id)}
          className="absolute top-3 right-3 p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <h2
      onClick={() => setIsEditing(true)}
      className="text-3xl font-bold p-4 rounded-lg cursor-text transition-colors text-gray-900 hover:bg-gray-50"
    >
      {block.content || 'Heading...'}
    </h2>
  );
};

const QuoteBlockComponent = ({ block, updateBlock, deleteBlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="relative p-5 border-l-4 border-blue-500 rounded-lg bg-blue-50">
        <textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => updateBlock(block.id, e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full p-3 italic rounded focus:outline-none border-2 border-blue-300 resize-none bg-white"
          style={{ minHeight: '120px' }}
        />
        <button
          onClick={() => deleteBlock(block.id)}
          className="absolute top-3 right-3 p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <blockquote
      onClick={() => setIsEditing(true)}
      className="p-5 border-l-4 border-blue-500 rounded-lg cursor-text transition-all italic bg-blue-50 hover:bg-blue-100 text-gray-800"
    >
      {block.content || 'Add a quote...'}
    </blockquote>
  );
};

const CodeBlockComponent = ({ block, updateBlock, deleteBlock }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState(block.language || 'javascript');
  const textareaRef = useRef(null);

  const languages = [
    'javascript', 'python', 'typescript', 'html', 'css', 'bash',
    'json', 'sql', 'rust', 'go', 'java', 'cpp'
  ];

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    updateBlock(block.id, block.content, newLang);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlightCode = (code, lang) => {
    if (lang === 'json') {
      return code
        .replace(/(".*?":\s*)/g, '<span style="color: #61afef">$1</span>')
        .replace(/:\s*(".*?")/g, ': <span style="color: #98c379">$1</span>');
    }
    return code;
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Code size={16} className="text-gray-400" />
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-700 text-gray-100 text-sm rounded px-3 py-1.5 focus:outline-none cursor-pointer font-medium"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded transition-colors hover:bg-gray-700 text-gray-400"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <button
            onClick={copyCode}
            className="p-1.5 rounded transition-colors hover:bg-gray-700 text-gray-400 flex items-center gap-1"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-400" />
                <span className="text-xs text-green-400">Copied!</span>
              </>
            ) : (
              <Copy size={16} />
            )}
          </button>

          <button
            onClick={() => deleteBlock(block.id)}
            className="p-1.5 rounded transition-colors hover:bg-red-900/30 text-red-400"
            title="Delete block"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      {expanded && (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value, language)}
            className="w-full p-5 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            style={{ minHeight: '300px' }}
            spellCheck="false"
          />
          {/* Code line numbers and styling */}
          <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none px-5 py-5 font-mono text-sm text-gray-600 whitespace-pre overflow-hidden">
            {block.content.split('\n').map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const EmptyStateComponent = ({ onCreateNote }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
        <FileText size={48} className="text-blue-600" />
      </div>
      <h2 className="text-3xl font-bold mb-3 text-gray-900">No Notes Yet</h2>
      <p className="text-gray-600 mb-8 max-w-sm">Create your first note to start your learning journey. Organize with sub-topics, add code examples, and keep everything in one place.</p>
      <button
        onClick={onCreateNote}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
      >
        Create First Note
      </button>
    </div>
  </div>
);

const NewNoteModalComponent = ({ onCreate, onClose, isSubNote }) => {
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(title || 'Untitled Note');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-96 border border-gray-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">{isSubNote ? 'Create Sub-Topic' : 'Create New Note'}</h2>
        <p className="text-gray-600 text-sm mb-6">
          {isSubNote ? 'Organize your learning with sub-topics' : 'Start a new learning journey'}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isSubNote ? 'e.g., Chunking' : 'e.g., Understanding RAG'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const addBlockToNote = (noteId, type, notes, setNotes) => {
  setNotes(notes.map(n => {
    if (n.id === noteId) {
      return {
        ...n,
        blocks: [...n.blocks, {
          id: 'block_' + Date.now(),
          type,
          content: type === 'code' ? '// Write your code here\n' : '',
          language: 'javascript'
        }]
      };
    }
    return n;
  }));
};

const updateBlockInNote = (noteId, blockId, content, language, notes, setNotes) => {
  setNotes(notes.map(n => {
    if (n.id === noteId) {
      return {
        ...n,
        blocks: n.blocks.map(b =>
          b.id === blockId 
            ? { ...b, content, language: language || b.language } 
            : b
        )
      };
    }
    return n;
  }));
};

const deleteBlockFromNote = (noteId, blockId, notes, setNotes) => {
  setNotes(notes.map(n => {
    if (n.id === noteId) {
      return {
        ...n,
        blocks: n.blocks.filter(b => b.id !== blockId)
      };
    }
    return n;
  }));
};

const exportNote = (note, format) => {
  let content = '';
  let filename = '';

  if (format === 'md') {
    content = `# ${note.title}\n\n`;
    content += `*Created: ${new Date(note.createdAt).toLocaleDateString()}*\n`;
    content += `*Last updated: ${new Date(note.updatedAt).toLocaleDateString()}*\n\n`;

    note.blocks.forEach(block => {
      if (block.type === 'text') {
        content += block.content + '\n\n';
      } else if (block.type === 'heading') {
        content += `## ${block.content}\n\n`;
      } else if (block.type === 'code') {
        content += `\`\`\`${block.language || 'javascript'}\n${block.content}\n\`\`\`\n\n`;
      } else if (block.type === 'quote') {
        content += `> ${block.content}\n\n`;
      }
    });

    filename = `${note.title}.md`;
  } else if (format === 'html') {
    content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      border-left: 4px solid #3b82f6;
    }
    code { font-family: 'Courier New', monospace; }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 20px;
      margin-left: 0;
      color: #6b7280;
      font-style: italic;
    }
    .metadata {
      color: #9ca3af;
      font-size: 14px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="metadata">
    Created: ${new Date(note.createdAt).toLocaleDateString()} | 
    Last updated: ${new Date(note.updatedAt).toLocaleDateString()}
  </div>
  `;

    note.blocks.forEach(block => {
      if (block.type === 'text') {
        content += `<p>${block.content.replace(/\n/g, '<br>')}</p>\n`;
      } else if (block.type === 'heading') {
        content += `<h2>${block.content}</h2>\n`;
      } else if (block.type === 'code') {
        content += `<pre><code class="language-${block.language}">${escapeHtml(block.content)}</code></pre>\n`;
      } else if (block.type === 'quote') {
        content += `<blockquote>${block.content}</blockquote>\n`;
      }
    });

    content += `</body>\n</html>`;
    filename = `${note.title}.html`;
  } else if (format === 'json') {
    const exportData = {
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      blocks: note.blocks
    };
    content = JSON.stringify(exportData, null, 2);
    filename = `${note.title}.json`;
  }

  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

export default AINotebook;