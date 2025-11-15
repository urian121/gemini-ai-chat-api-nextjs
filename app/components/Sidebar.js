'use client';

import { useEffect, useState } from 'react';
import { Plus, MessagesSquare } from 'lucide-react';

export default function Sidebar({ isOpen, onToggle, onSelectConversation, onNewChat, selectedId }) {
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

  const formatDate = (value) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const hh = String(hours).padStart(2, '0');
      return `${day}/${month}/${year} ${hh}:${minutes} ${ampm}`;
    } catch {
      return String(value);
    }
  };

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
                    className={`${selectedId === item.id ? 'bg-gray-300 ring-2 ring-gray-400' : ''} w-full text-left text-sm px-2 py-2 rounded hover:bg-gray-200 hover:cursor-pointer`}
                    aria-current={selectedId === item.id ? 'true' : undefined}
                    onClick={() => onSelectConversation(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-10">
                        {item.title ? item.title : item.id}
                      </span>
                      <span className="text-[11px] text-gray-600">{formatDate(item.created_at)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">{item.message_count} mensajes</div>
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