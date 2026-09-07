/* Rangliste der Online-Konten: Stufe, dann besiegte Monster, dann Gold, dann Name */
export function rankAccounts(list) {
  return [...(list || [])].sort((a, b) => (b.level || 0) - (a.level || 0) || (b.kills || 0) - (a.kills || 0) || (b.gold || 0) - (a.gold || 0) || String(a.name).localeCompare(String(b.name)));
}
