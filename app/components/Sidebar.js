'use client';

import { useEffect, useState } from 'react';
import { Plus, MessagesSquare } from 'lucide-react';

export default function Sidebar({ isOpen, onToggle, onSelectConversation, onNewChat }) {
  // items === null indica "cargando" sin setState síncrono en efectos
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    let cancelled = false;

    fetch('/api/chat/list', { signal: ac.signal })
      .then(r => r.json())
      .then(d => { if (!cancelled) setItems(d.conversations || []); })
      .catch(err => { if (!cancelled && err?.name !== 'AbortError') setItems([]); });

    return () => { cancelled = true; ac.abort(); };
  }, [isOpen]);

  const isLoading = isOpen && items === null;

  return (
    <aside className={`fixed left-0 top-0 h-screen z-40 ${isOpen ? 'w-64' : 'w-10'} transition-all duration-200 bg-[#e4e4e4] flex flex-col`}>
      <div className="flex flex-col items-center gap-3 py-3">
        {/* Botón Nuevo chat */}
        <button
          aria-label="Nuevo chat"
          title="Nuevo chat"
          onClick={onNewChat}
          className="h-8 w-8 rounded-full bg-gray-600 text-white flex items-center justify-center hover:bg-gray-700 hover:cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Botón Historial de chats */}
        <button
          aria-label="Historial de chats"
          title="Historial de chats"
          onClick={onToggle}
          className="h-8 w-8 rounded-md bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 hover:cursor-pointer"
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="px-3 py-2 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-700 mb-2">Historial</h2>
          {isLoading && <p className="text-xs text-gray-500">Cargando...</p>}
          {!isLoading && Array.isArray(items) && items.length === 0 && (
            <p className="text-xs text-gray-500">Sin conversaciones</p>
          )}
          {!isLoading && Array.isArray(items) && items.length > 0 && (
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    className="w-full text-left text-sm px-2 py-2 rounded hover:bg-gray-200 hover:cursor-pointer"
                    onClick={() => onSelectConversation(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-10">
                        {item.title ? item.title : item.id}
                      </span>
                      <span className="text-[11px] text-gray-500">{item.message_count} msgs</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {(() => {
                        try {
                          const d = new Date(item.created_at);
                          return d.toLocaleString('es-ES', { hour12: false });
                        } catch {
                          return String(item.created_at);
                        }
                      })()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}