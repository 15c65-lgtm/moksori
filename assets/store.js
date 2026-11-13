// 보관함: 브라우저 IndexedDB에 폴더와 연습 기록(소리 포함)을 저장
window.Store = (() => {
  const DB = 'moksori', VER = 1;
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no-idb'));
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('folders')) d.createObjectStore('folders', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', { keyPath: 'id' }).createIndex('folder', 'folderId');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    });
    return dbp;
  }
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out; const q = fn(s); if (q) q.onsuccess = () => { out = q.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Float32 ↔ Int16 (용량 절반)
  const toI16 = x => { const o = new Int16Array(x.length); for (let i = 0; i < x.length; i++) o[i] = Math.max(-1, Math.min(1, x[i])) * 32767; return o; };
  const toF32 = a => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] / 32767; return o; };

  const api = {
    uid, toI16, toF32,
    folders: () => tx('folders', 'readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => x.created - y.created)),
    saveFolder: f => tx('folders', 'readwrite', s => s.put(f)),
    async deleteFolder(id) { // 폴더 안 기록은 '미분류'로
      const items = await api.items();
      for (const it of items) if (it.folderId === id) { it.folderId = ''; await api.saveItem(it); }
      return tx('folders', 'readwrite', s => s.delete(id));
    },
    items: () => tx('items', 'readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => y.created - x.created)),
    getItem: id => tx('items', 'readonly', s => s.get(id)),
    saveItem: it => tx('items', 'readwrite', s => s.put(it)),
    deleteItem: id => tx('items', 'readwrite', s => s.delete(id)),
    async persist() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (_) {} },

    // 백업 파일 (JSON, 소리는 base64)
    async exportData(folderId) {
      const folders = await api.folders(), items = await api.items();
      const pick = folderId == null ? items : items.filter(i => i.folderId === folderId);
      const b64 = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
      return {
        app: 'moksori', kind: 'mimic-backup', version: 1, exported: Date.now(),
        folders: folderId == null ? folders : folders.filter(f => f.id === folderId),
        items: pick.map(it => ({ ...it, ref: { ...it.ref, pcm: b64(it.ref.pcm) }, imi: { ...it.imi, pcm: b64(it.imi.pcm) } })),
      };
    },
    async importData(data) {
      if (!data || data.app !== 'moksori' || !Array.isArray(data.items)) throw new Error('format');
      const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Int16Array(u.buffer); };
      const have = new Map((await api.folders()).map(f => [f.name, f.id])), map = {};
      for (const f of data.folders || []) {
        if (have.has(f.name)) map[f.id] = have.get(f.name);
        else { const id = uid(); map[f.id] = id; await api.saveFolder({ id, name: f.name, created: f.created || Date.now() }); have.set(f.name, id); }
      }
      const existing = new Set((await api.items()).map(i => i.id));
      let n = 0;
      for (const it of data.items) {
        if (existing.has(it.id)) continue;
        await api.saveItem({ ...it, folderId: map[it.folderId] || '', ref: { ...it.ref, pcm: unb64(it.ref.pcm) }, imi: { ...it.imi, pcm: unb64(it.imi.pcm) } });
        n++;
      }
      return n;
    },
  };
  return api;
})();
