(() => {
  'use strict';

  const FLAG = 'data-dayframe-diary-delete-fix';
  const HUB_STORE_KEY = 'dayframe_personal_hub_v1';
  const TOMBSTONE_KEY = 'dayframe_diary_deleted_ids_v1';
  const MAX_TOMBSTONES = 500;

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function currentUserId() {
    try {
      const session = JSON.parse(localStorage.getItem('dayframe_session') || '{}');
      return session?.user?.id || session?.email || 'guest';
    } catch {
      return 'guest';
    }
  }

  function userKey(key) {
    if (typeof window.dfKey === 'function') return window.dfKey(key);
    return 'df_' + currentUserId() + '_' + key;
  }

  function sameId(a, b) {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an === bn;
    return String(a) === String(b);
  }

  function readLocalDeletedIds() {
    try {
      const value = JSON.parse(localStorage.getItem(userKey(TOMBSTONE_KEY)) || '[]');
      return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function writeLocalDeletedIds(ids) {
    const clean = [...new Set((ids || []).map(String).filter(Boolean))].slice(-MAX_TOMBSTONES);
    try {
      localStorage.setItem(userKey(TOMBSTONE_KEY), JSON.stringify(clean));
    } catch {}
    return clean;
  }

  function deletedSet(data) {
    return new Set([
      ...readLocalDeletedIds(),
      ...(Array.isArray(data?.diaryDeletedIds) ? data.diaryDeletedIds : []),
    ].map(String).filter(Boolean));
  }

  function normalizeHubData(data) {
    if (!data || typeof data !== 'object') return data;
    const deleted = deletedSet(data);
    const before = Array.isArray(data.diary) ? data.diary.length : 0;
    if (Array.isArray(data.diary) && deleted.size) {
      data.diary = data.diary.filter((entry) => ![...deleted].some((id) => sameId(entry?.id, id)));
    }
    if (deleted.size) {
      data.diaryDeletedIds = writeLocalDeletedIds([...deleted]);
    }
    data.__diaryDeleteFixChanged = before !== (Array.isArray(data.diary) ? data.diary.length : 0);
    return data;
  }

  function readStoredHubData() {
    try {
      return JSON.parse(localStorage.getItem(userKey(HUB_STORE_KEY)) || '{}');
    } catch {
      return {};
    }
  }

  function writeStoredHubData(data) {
    try {
      localStorage.setItem(userKey(HUB_STORE_KEY), JSON.stringify(data));
    } catch {}
  }

  function cleanForSave(data) {
    const normalized = normalizeHubData(data);
    if (normalized && typeof normalized === 'object') delete normalized.__diaryDeleteFixChanged;
    return normalized;
  }

  function repairCurrentStore(syncAfterRepair = false) {
    const data = normalizeHubData(readStoredHubData());
    if (data?.__diaryDeleteFixChanged) {
      delete data.__diaryDeleteFixChanged;
      writeStoredHubData(data);
      if (syncAfterRepair && typeof originalHubSaveImmediate === 'function') {
        setTimeout(() => originalHubSaveImmediate(data), 0);
      }
      return true;
    }
    if (data && typeof data === 'object') delete data.__diaryDeleteFixChanged;
    return false;
  }

  function retryImmediateSave(data) {
    if (typeof window.hubSaveImmediate !== 'function') return;
    setTimeout(() => window.hubSaveImmediate(data), 5000);
    window.addEventListener('online', () => window.hubSaveImmediate(data), { once: true });
  }

  const originalHubLoad = window.hubLoad;
  const originalHubSave = window.hubSave;
  const originalHubSaveImmediate = window.hubSaveImmediate;
  const originalLoadHubFromSupabase = window.loadHubFromSupabase;

  if (typeof originalHubLoad === 'function') {
    window.hubLoad = function patchedHubLoad(...args) {
      return cleanForSave(originalHubLoad.apply(this, args));
    };
  }

  if (typeof originalHubSave === 'function') {
    window.hubSave = function patchedHubSave(data) {
      return originalHubSave.call(this, cleanForSave(data));
    };
  }

  if (typeof originalHubSaveImmediate === 'function') {
    window.hubSaveImmediate = function patchedHubSaveImmediate(data) {
      return originalHubSaveImmediate.call(this, cleanForSave(data));
    };
  }

  if (typeof originalLoadHubFromSupabase === 'function') {
    window.loadHubFromSupabase = async function patchedLoadHubFromSupabase(...args) {
      const beforeDeleted = readLocalDeletedIds();
      const result = await originalLoadHubFromSupabase.apply(this, args);
      const data = readStoredHubData();
      const existingDeleted = Array.isArray(data.diaryDeletedIds) ? data.diaryDeletedIds : [];
      data.diaryDeletedIds = [...new Set([...existingDeleted, ...beforeDeleted].map(String))];
      normalizeHubData(data);
      delete data.__diaryDeleteFixChanged;
      writeStoredHubData(data);
      if (data.diaryDeletedIds?.length && typeof originalHubSaveImmediate === 'function') {
        setTimeout(() => originalHubSaveImmediate(data), 0);
      }
      return result;
    };
  }

  window.diaryDelete = async function diaryDeleteFixed(id) {
    if (!confirm('Delete this diary entry?')) return;
    const data = typeof originalHubLoad === 'function' ? originalHubLoad() : readStoredHubData();
    const deleted = deletedSet(data);
    deleted.add(String(id));
    data.diaryDeletedIds = writeLocalDeletedIds([...deleted]);
    data.diary = Array.isArray(data.diary) ? data.diary.filter((entry) => !sameId(entry?.id, id)) : [];
    writeStoredHubData(data);
    if (typeof window.diaryDismissReflection === 'function') window.diaryDismissReflection();
    if (typeof window.renderDiary === 'function') window.renderDiary();
    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.hubToast === 'function') window.hubToast('Entry deleted');
    const saved = typeof window.hubSaveImmediate === 'function' ? await window.hubSaveImmediate(data) : false;
    if (!saved && typeof window.hubToast === 'function') {
      window.hubToast('Entry deleted here - sync will retry when online');
      retryImmediateSave(data);
    }
  };

  repairCurrentStore(true);
})();
