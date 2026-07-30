export function userRoom(userId: number | string): string {
  return `user:${userId}`;
}

export function orgRoom(organisationId: number | string): string {
  return `org:${organisationId}`;
}

export function parseUserRoom(room: string): number | null {
  const m = /^user:(\d+)$/.exec(room);
  return m ? Number(m[1]) : null;
}

export function parseOrgRoom(room: string): number | null {
  const m = /^org:(\d+)$/.exec(room);
  return m ? Number(m[1]) : null;
}
