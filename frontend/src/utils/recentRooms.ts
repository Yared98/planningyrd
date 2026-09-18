export interface RecentRoom {
  id: string;
  name: string;
  facilitatorToken?: string | null;
  role: 'facilitator' | 'estimator' | 'spectator';
  updatedAt: number;
}

const STORAGE_KEY = 'planningyrd_recent_rooms';

export function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: RecentRoom[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveRecentRoom(room: {
  id: string;
  name?: string;
  facilitatorToken?: string | null;
  role?: 'facilitator' | 'estimator' | 'spectator';
}): void {
  try {
    if (!room.id) return;
    const all = getRecentRooms();
    const current = all.filter((r) => r.id !== room.id);
    const existing = all.find((r) => r.id === room.id);

    const facilitatorToken = room.facilitatorToken || existing?.facilitatorToken || localStorage.getItem(`facilitator_${room.id}`) || null;
    const role = room.role || (facilitatorToken ? 'facilitator' : (existing?.role || 'estimator'));
    const name = (room.name && room.name !== room.id) ? room.name : (existing?.name || room.name || room.id);

    const updated: RecentRoom[] = [
      {
        id: room.id,
        name,
        facilitatorToken,
        role,
        updatedAt: Date.now(),
      },
      ...current,
    ].slice(0, 15);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar sala recente:', err);
  }
}

export function removeRecentRoom(id: string): RecentRoom[] {
  try {
    const updated = getRecentRooms().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
