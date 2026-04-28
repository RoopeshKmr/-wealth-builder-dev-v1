const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface OnboardingTrackerData {
  userId: number;
  userName: string;
  userEmail: string;
  // Module completion flags (mapped from AssociateTracker)
  introWatched: boolean;       // m0 — m_videos_watched
  multiHanded: boolean;        // m1 — milestone_multi_handed
  tenThreeGoals: boolean;      // m2 — ten_thre_results_goals
  selfImprovement: boolean;    // m3 — self_improvement
  observe4Recruits: boolean;   // m4 — milestone_observe_4_recruits
  observe4Clients: boolean;    // m5 — milestone_observe_4_clients
  getLicense: boolean;         // m6 — get_license
  registrationConvention: boolean; // m7 — registration_convention
  // Rolling 3 months numeric fields
  recruitTtl: number;          // m8 — recruit_ttl (need >= 9)
  personalPoints: number;      // m9 — personal_points (need >= 45000)
  licensesInTtl: number;       // m10 — licenses_in_ttl (need >= 3)
  registrationsBase: number;   // m11 — no backend field (always 0)
}

interface RawAssociateRecord {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  m_videos_watched?: boolean;
  milestone_multi_handed?: boolean;
  ten_thre_results_goals?: boolean;
  self_improvement?: boolean;
  milestone_observe_4_recruits?: boolean;
  milestone_observe_4_clients?: boolean;
  get_license?: boolean;
  registration_convention?: boolean;
  recruit_ttl?: number;
  personal_points?: number;
  licenses_in_ttl?: number;
}

function mapRecord(r: RawAssociateRecord): OnboardingTrackerData {
  return {
    userId: r.user_id,
    userName: r.user_name ?? '',
    userEmail: r.user_email ?? '',
    introWatched: r.m_videos_watched ?? false,
    multiHanded: r.milestone_multi_handed ?? false,
    tenThreeGoals: r.ten_thre_results_goals ?? false,
    selfImprovement: r.self_improvement ?? false,
    observe4Recruits: r.milestone_observe_4_recruits ?? false,
    observe4Clients: r.milestone_observe_4_clients ?? false,
    getLicense: r.get_license ?? false,
    registrationConvention: r.registration_convention ?? false,
    recruitTtl: r.recruit_ttl ?? 0,
    personalPoints: r.personal_points ?? 0,
    licensesInTtl: r.licenses_in_ttl ?? 0,
    registrationsBase: 0,
  };
}

/**
 * Fetch the associate tracker for a specific user by user_id.
 * Backend detail endpoint creates tracker if missing.
 */
export async function fetchOnboardingData(userId: number): Promise<OnboardingTrackerData> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch associate tracker: ${res.statusText}`);
  const record = (await res.json()) as RawAssociateRecord;
  return mapRecord(record);
}

/**
 * Mark the intro video as watched for a user.
 * PATCH /api/tracker/trackers/associate/{userId}/
 */
export async function markIntroWatched(userId: number): Promise<void> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/tracker/trackers/associate/${userId}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ m_videos_watched: true }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to mark intro watched: ${msg}`);
  }
}
