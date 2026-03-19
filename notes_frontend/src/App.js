import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const NOTES_STORAGE_KEY = 'notes_app_v1';

/**
 * Creates a stable unique identifier for a new note.
 * @returns {string} Unique note ID.
 */
const createNoteId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Creates a note object with default values.
 * @returns {{id: string, title: string, body: string, createdAt: string, updatedAt: string}}
 */
const createEmptyNote = () => {
  const now = new Date().toISOString();
  return {
    id: createNoteId(),
    title: 'Untitled note',
    body: '',
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Validates and normalizes raw note data from storage.
 * @param {unknown[]} rawNotes - Raw notes from localStorage.
 * @returns {Array<{id: string, title: string, body: string, createdAt: string, updatedAt: string}>}
 */
const normalizeNotes = (rawNotes) => {
  if (!Array.isArray(rawNotes)) {
    return [];
  }

  return rawNotes
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const createdAt =
        typeof note.createdAt === 'string' ? note.createdAt : new Date().toISOString();
      const updatedAt =
        typeof note.updatedAt === 'string' ? note.updatedAt : createdAt;

      return {
        id: typeof note.id === 'string' ? note.id : createNoteId(),
        title: typeof note.title === 'string' ? note.title : 'Untitled note',
        body: typeof note.body === 'string' ? note.body : '',
        createdAt,
        updatedAt
      };
    });
};

/**
 * Formats an ISO timestamp into a readable local datetime string.
 * @param {string} timestamp - ISO timestamp.
 * @returns {string} Human-readable datetime.
 */
const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return timestamp;
  }
};

// PUBLIC_INTERFACE
function App() {
  /**
   * NotesFlow contract:
   * Inputs: user actions (create/select/update/delete), localStorage persisted payload.
   * Outputs: consistent notes state, selected note ID, filtered notes list.
   * Errors: parse/storage failures are handled gracefully with console context logging.
   * Side effects: reads/writes browser localStorage.
   */
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load notes once from localStorage.
  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(NOTES_STORAGE_KEY);
      if (!storedValue) {
        return;
      }

      const parsed = JSON.parse(storedValue);
      const normalized = normalizeNotes(parsed).sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      setNotes(normalized);
      if (normalized.length > 0) {
        setSelectedNoteId(normalized[0].id);
      }
    } catch (error) {
      console.error('[NotesFlow] Failed to load notes from localStorage', error);
    }
  }, []);

  // Persist notes whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('[NotesFlow] Failed to save notes to localStorage', error);
    }
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notes
      .filter((note) => {
        if (!query) {
          return true;
        }
        return (
          note.title.toLowerCase().includes(query) ||
          note.body.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [notes, searchQuery]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) {
      return filteredNotes[0] || null;
    }

    return notes.find((note) => note.id === selectedNoteId) || filteredNotes[0] || null;
  }, [filteredNotes, notes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
      return;
    }

    if (selectedNote && selectedNote.id !== selectedNoteId) {
      setSelectedNoteId(selectedNote.id);
    }
  }, [notes, selectedNote, selectedNoteId]);

  const handleCreateNote = () => {
    const newNote = createEmptyNote();
    setNotes((prevNotes) => [newNote, ...prevNotes]);
    setSelectedNoteId(newNote.id);
  };

  const handleSelectNote = (noteId) => {
    setSelectedNoteId(noteId);
  };

  const handleDeleteNote = (noteId) => {
    setNotes((prevNotes) => {
      const remainingNotes = prevNotes.filter((note) => note.id !== noteId);

      if (remainingNotes.length === 0) {
        setSelectedNoteId(null);
      } else if (noteId === selectedNoteId) {
        setSelectedNoteId(remainingNotes[0].id);
      }

      return remainingNotes;
    });
  };

  const handleUpdateSelectedNote = (field, value) => {
    if (!selectedNote) {
      return;
    }

    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              [field]: value,
              updatedAt: new Date().toISOString()
            }
          : note
      )
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-group">
          <h1>Notes</h1>
          <p>Organize your ideas with fast local notes.</p>
        </div>

        <label className="search-label" htmlFor="note-search">
          <span className="sr-only">Search notes</span>
          <input
            id="note-search"
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Your Notes</h2>
            <button type="button" className="btn btn-primary" onClick={handleCreateNote}>
              + New
            </button>
          </div>

          <div className="notes-list" role="list" aria-label="Notes list">
            {filteredNotes.length === 0 ? (
              <div className="empty-list">
                {notes.length === 0
                  ? 'No notes yet. Create your first note.'
                  : 'No notes match your search.'}
              </div>
            ) : (
              filteredNotes.map((note) => (
                <article
                  key={note.id}
                  role="listitem"
                  className={`note-card ${
                    selectedNote && note.id === selectedNote.id ? 'active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="note-select"
                    onClick={() => handleSelectNote(note.id)}
                    aria-label={`Open note ${note.title}`}
                  >
                    <h3>{note.title || 'Untitled note'}</h3>
                    <p>{note.body.trim() || 'No content yet...'}</p>
                    <small>Updated {formatTimestamp(note.updatedAt)}</small>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteNote(note.id)}
                    aria-label={`Delete note ${note.title}`}
                  >
                    Delete
                  </button>
                </article>
              ))
            )}
          </div>
        </aside>

        <section className="editor" aria-label="Note editor">
          {!selectedNote ? (
            <div className="editor-empty">
              <h2>No note selected</h2>
              <p>Create a new note to get started.</p>
              <button type="button" className="btn btn-primary" onClick={handleCreateNote}>
                Create Note
              </button>
            </div>
          ) : (
            <div className="editor-content">
              <div className="meta-row">
                <span>Created: {formatTimestamp(selectedNote.createdAt)}</span>
                <span>Updated: {formatTimestamp(selectedNote.updatedAt)}</span>
              </div>

              <label htmlFor="note-title" className="editor-label">
                Title
              </label>
              <input
                id="note-title"
                className="editor-title"
                value={selectedNote.title}
                onChange={(event) => handleUpdateSelectedNote('title', event.target.value)}
                placeholder="Note title"
              />

              <label htmlFor="note-body" className="editor-label">
                Body
              </label>
              <textarea
                id="note-body"
                className="editor-body"
                value={selectedNote.body}
                onChange={(event) => handleUpdateSelectedNote('body', event.target.value)}
                placeholder="Write your note here..."
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
