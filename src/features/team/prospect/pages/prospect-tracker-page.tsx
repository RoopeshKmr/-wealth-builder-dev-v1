import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Plan } from '@/core/types';
import {
  Block,
  Button,
  ConfirmationDialog,
  ErrorState,
  LoadingState,
  TrackerTable,
} from '@/shared/components';
import { useToastStore } from '@/store';
import {
  activateProspectWithAgencyCode,
  createProspect,
  deleteProspect,
  fetchProspects,
  type Prospect,
  saveProspectCallLog,
  updateProspectDetails,
} from '../services/prospect-service';
import { AddProspectModal } from '../components/add-prospect-modal';
import { AddAgencyCodeModal } from '../components/add-agency-code-modal';
import { AddProductionModal, type AddProductionFormData } from '../components/add-production-modal';
import { CallLogModal } from '../components/call-log-modal';
import { createProductionRecord } from '@/features/team/production-tracker/services/production-tracker-service';
import { buildProspectColumns } from '../prospect-columns';
import type { AddAgentFormData, AddProspectFormData } from '../types';
import {
  createTrackerNote,
  fetchTrackerNotesForUser,
  type TrackerNote,
} from '@/features/team/services/tracker-notes-service';
import { TrackerNotesModal } from '@/features/team/components/tracker-notes-modal';

type SortDirection = 'asc' | 'desc';

function toProspectSort(sort: { key: string; direction: SortDirection } | null): string {
  if (!sort) return '-created_at';
  const keyMap: Record<string, string> = {
    full_name: 'name',
    recruited_by_name: 'recruiter_name',
    leader_name: 'leader_name',
  };
  const mappedKey = keyMap[sort.key] || sort.key;
  return sort.direction === 'desc' ? `-${mappedKey}` : mappedKey;
}

export default function ProspectTrackerPage() {
  const pageHeading = 'Prospect Tracker';
  const pageDescription = 'Track and manage your prospects';

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCallLogProspect, setActiveCallLogProspect] = useState<Prospect | null>(null);
  const [addAgencyCodeFor, setAddAgencyCodeFor] = useState<Prospect | null>(null);
  const [addProductionFor, setAddProductionFor] = useState<Prospect | null>(null);
  const [savingProduction, setSavingProduction] = useState(false);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [savingCallLog, setSavingCallLog] = useState(false);
  const [savingMetaProspectIdSet, setSavingMetaProspectIdSet] = useState<Set<number>>(new Set());
  const [savingNoteProspectIdSet, setSavingNoteProspectIdSet] = useState<Set<number>>(new Set());
  const [loadingNoteProspectIdSet, setLoadingNoteProspectIdSet] = useState<Set<number>>(new Set());
  const [notesByProspectId, setNotesByProspectId] = useState<Record<number, TrackerNote[]>>({});
  const [noteDraftByProspectId, setNoteDraftByProspectId] = useState<Record<number, string>>({});
  const [focusedNoteInputId, setFocusedNoteInputId] = useState<number | null>(null);
  const [notesOpenFor, setNotesOpenFor] = useState<Prospect | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState('');
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [pendingDeleteProspect, setPendingDeleteProspect] = useState<Prospect | null>(null);
  const [pageSize] = useState(10);
  const [nextPageNum, setNextPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>({
    key: 'created_at',
    direction: 'desc',
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const addToast = useToastStore((state) => state.addToast);

  const resolvedPlan = useMemo(() => {
    const planFromStorage =
      localStorage.getItem('wb.plan') ||
      localStorage.getItem('wb.accountType') ||
      (() => {
        try {
          const raw = localStorage.getItem('authUser');
          if (!raw) return null;
          return JSON.parse(raw)?.accountType || null;
        } catch {
          return null;
        }
      })();

    return planFromStorage || Plan.NewAgent;
  }, []);

  const isNewAgent = resolvedPlan === Plan.NewAgent;
  const isAgent = resolvedPlan === Plan.Agent;

  const updateProspectInState = (updated: Prospect) => {
    setProspects((prev) =>
      prev.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
    );
  };

  const ensureNotesLoaded = useCallback(async (userId: number) => {
    if (notesByProspectId[userId]) return;
    setLoadingNoteProspectIdSet((prev) => new Set(prev).add(userId));
    try {
      const loaded = await fetchTrackerNotesForUser(userId);
      setNotesByProspectId((prev) => ({ ...prev, [userId]: loaded }));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load notes.',
      });
    } finally {
      setLoadingNoteProspectIdSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [addToast, notesByProspectId]);

  const handleEditProspect = (row: Prospect) => {
    setEditingProspect(row);
  };

  const loadProspects = async (
    pageNum: number = 1,
    isInitial: boolean = true,
    nextSort: { key: string; direction: SortDirection } | null = sortState,
    nextFilters: Record<string, string> = filters
  ) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const data = await fetchProspects({
        page: pageNum,
        pageSize: pageSize,
        sort: toProspectSort(nextSort),
        fullName: nextFilters.full_name,
        recruiterName: nextFilters.recruited_by_name,
        leaderName: nextFilters.leader_name,
        search: nextFilters.search || nextFilters.notes,
      });

      if (isInitial) {
        setProspects(data.results);
      } else {
        setProspects((prev) => [...prev, ...data.results]);
      }

      setTotalCount(data.count || 0);
      setHasMore(Boolean(data.next));
      setNextPageNum(pageNum + 1);
    } catch (err) {
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load prospects');
      }
      addToast({ type: 'error', message: 'Failed to load prospects.' });
      console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleNoteDraftChange = useCallback((prospectId: number, value: string) => {
    setNoteDraftByProspectId((prev) => ({ ...prev, [prospectId]: value }));
  }, []);

  const handleAddInlineNote = useCallback(async (row: Prospect) => {
    const draft = (noteDraftByProspectId[row.id] || '').trim();
    if (!draft) return;

    setSavingNoteProspectIdSet((prev) => new Set(prev).add(row.id));
    try {
      const created = await createTrackerNote(row.id, draft, 'prospect');
      setNotesByProspectId((prev) => {
        const current = prev[row.id] || [];
        return { ...prev, [row.id]: [...current, created] };
      });
      setNoteDraftByProspectId((prev) => ({ ...prev, [row.id]: '' }));
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save note.',
      });
    } finally {
      setSavingNoteProspectIdSet((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }, [addToast, noteDraftByProspectId]);

  const handleAddModalNote = useCallback(async () => {
    if (!notesOpenFor) return;
    const text = modalNoteDraft.trim();
    if (!text) return;

    setSavingNoteProspectIdSet((prev) => new Set(prev).add(notesOpenFor.id));
    try {
      const created = await createTrackerNote(notesOpenFor.id, text, 'prospect');
      setNotesByProspectId((prev) => {
        const current = prev[notesOpenFor.id] || [];
        return { ...prev, [notesOpenFor.id]: [...current, created] };
      });
      setModalNoteDraft('');
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save note.',
      });
    } finally {
      setSavingNoteProspectIdSet((prev) => {
        const next = new Set(prev);
        next.delete(notesOpenFor.id);
        return next;
      });
    }
  }, [addToast, modalNoteDraft, notesOpenFor]);

  const mapProspectToForm = (prospect: Prospect): AddProspectFormData => ({
    firstName: prospect.first_name || '',
    lastName: prospect.last_name || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    recruiter: prospect.recruited_by_name || '',
    recruiterId: prospect.recruited_by ?? null,
    leader: prospect.leader_name || '',
    leaderId: prospect.leader ?? null,
    gender: prospect.profile?.gender || '',
    state: prospect.profile?.state || '',
    birthday: prospect.profile?.birthday || '',
    howKnown: prospect.profile?.how_known || '',
    relationship:
      prospect.profile?.relationship !== undefined && prospect.profile?.relationship !== null
        ? String(prospect.profile.relationship)
        : '',
    occupation: prospect.profile?.occupation || '',
    whatTold: prospect.profile?.what_told || '',
    age25Plus: Boolean(prospect.profile?.flags?.age25Plus),
    homeowner: Boolean(prospect.profile?.flags?.homeowner),
    solidCareer: Boolean(prospect.profile?.flags?.solidCareer),
    income75kPlus: Boolean(prospect.profile?.flags?.income75kPlus),
    dissatisfied: Boolean(prospect.profile?.flags?.dissatisfied),
    entrepreneurial: Boolean(prospect.profile?.flags?.entrepreneurial),
    spanishPreferred: Boolean(prospect.profile?.flags?.spanishPreferred),
    married: Boolean(prospect.profile?.flags?.married),
    dependentKids: Boolean(prospect.profile?.flags?.dependentKids),
  });

  const handleUpdateProspect = async (formData: AddProspectFormData) => {
    if (!editingProspect) return;

    try {
      setSavingCallLog(true);

      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim();

      const duplicate = prospects.find((item) => {
        if (item.id === editingProspect.id) return false;
        const sameEmail = normalizedEmail && item.email?.trim().toLowerCase() === normalizedEmail;
        const samePhone = normalizedPhone && item.phone?.trim() === normalizedPhone;
        return sameEmail || samePhone;
      });

      if (duplicate) {
        addToast({
          type: 'warning',
          message: `A prospect with this ${normalizedEmail && duplicate.email?.trim().toLowerCase() === normalizedEmail ? 'email' : 'phone'} already exists.`,
        });
        return;
      }

      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
      const updated = await updateProspectDetails(editingProspect.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || undefined,
        email: formData.email,
        phone: formData.phone,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        profile: {
          state: formData.state || undefined,
          birthday: formData.birthday || undefined,
          gender: formData.gender || undefined,
          occupation: formData.occupation || undefined,
          how_known: formData.howKnown || undefined,
          what_told: formData.whatTold || undefined,
          relationship: formData.relationship ? Number(formData.relationship) : null,
          dependent_children: formData.dependentKids,
          flags: {
            age25Plus: formData.age25Plus,
            homeowner: formData.homeowner,
            solidCareer: formData.solidCareer,
            income75kPlus: formData.income75kPlus,
            dissatisfied: formData.dissatisfied,
            entrepreneurial: formData.entrepreneurial,
            spanishPreferred: formData.spanishPreferred,
            married: formData.married,
            dependentKids: formData.dependentKids,
          },
        },
      });

      // Apply an immediate local merge so UI updates even if the API returns a partial object.
      const optimisticMerged: Prospect = {
        ...editingProspect,
        ...updated,
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || updated.full_name || editingProspect.full_name,
        email: formData.email,
        phone: formData.phone,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        recruited_by_name: formData.recruiter || editingProspect.recruited_by_name,
        leader_name: formData.leader || editingProspect.leader_name,
        profile: {
          ...(editingProspect.profile || {}),
          ...(updated.profile || {}),
          city: updated.profile?.city || editingProspect.profile?.city || '',
          phone: formData.phone || updated.profile?.phone || editingProspect.profile?.phone || '',
          state: formData.state || '',
          birthday: formData.birthday || null,
          gender: formData.gender || '',
          occupation: formData.occupation || '',
          how_known: formData.howKnown || '',
          what_told: formData.whatTold || '',
          relationship: formData.relationship ? Number(formData.relationship) : null,
          dependent_children: formData.dependentKids,
          flags: {
            ...(editingProspect.profile?.flags || {}),
            ...(updated.profile?.flags || {}),
            age25Plus: formData.age25Plus,
            homeowner: formData.homeowner,
            solidCareer: formData.solidCareer,
            income75kPlus: formData.income75kPlus,
            dissatisfied: formData.dissatisfied,
            entrepreneurial: formData.entrepreneurial,
            spanishPreferred: formData.spanishPreferred,
            married: formData.married,
            dependentKids: formData.dependentKids,
          },
        },
      };

      updateProspectInState(optimisticMerged);
      setEditingProspect(null);
      addToast({ type: 'success', message: 'Prospect updated successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update prospect.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleOpenCallLog = (row: Prospect) => {
    setActiveCallLogProspect(row);
  };

  const handleInviteProspect = (row: Prospect) => {
    if (!row.email) {
      addToast({ type: 'warning', message: 'This prospect does not have an email address.' });
      return;
    }

    const subject = encodeURIComponent('Invitation from Wealth Builders');
    const body = encodeURIComponent(`Hi ${row.full_name || ''},\n\nI would like to invite you to connect.`);
    window.location.href = `mailto:${row.email}?subject=${subject}&body=${body}`;
  };

  const handleSaveCallLog = async (outcome: string, note: string) => {
    if (!activeCallLogProspect) return;
    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(activeCallLogProspect, outcome, note);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save call log.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleAddAgencyCode = async (row: Prospect) => {
    setAddAgencyCodeFor(row);
  };

  const handleSubmitAddAgencyCode = async (formData: AddAgentFormData) => {
    if (!addAgencyCodeFor) return;

    try {
      setSavingCallLog(true);
      const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();

      await updateProspectDetails(addAgencyCodeFor.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName || undefined,
        phone: formData.phone,
        email: formData.email,
        ama_date: formData.amaDate,
        polo_size: formData.poloSize,
        spouse_name: formData.spouseName,
        spouse_phone: formData.spousePhone,
        spouse_polo_size: formData.spousePoloSize,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
      });

      const updated = await activateProspectWithAgencyCode(addAgencyCodeFor.id, formData.agencyCode.trim());
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
      setAddAgencyCodeFor(null);
      addToast({ type: 'success', message: 'Agency code added successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to add agency code.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleAddProductionSave = async (data: AddProductionFormData) => {
    if (!addProductionFor) return;
    try {
      setSavingProduction(true);
      const [pA, pB] = data.split.split('/').map((v) => parseFloat(v) || 0);
      const base = parseFloat(data.targetPoints) || 0;

      const getMultiplier = (): number => {
        const MULTIPLIER_TABLE: Record<string, number> = {
          'TRANSAMERICA|FFIUL II': 1.25,
          'TRANSAMERICA|TERM LB - 10 YEARS': 1.10,
          'TRANSAMERICA|TERM LB - 15 YEARS': 1.16,
          'TRANSAMERICA|TERM LB - 20/25/30 YEARS': 1.26,
          'TRANSAMERICA|FINAL EXPENSE': 1.10,
          'NATIONWIDE|NEW HEIGHTS IUL ACCUMULATOR 2020': 1.09,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 0-70': 0.062888,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 71-75': 0.053496,
          'NORTH AMERICAN|SECURE HORIZON - CLIENT AGE 76+': 0.040919,
          'EVEREST|EVEREST': 1.0,
        };
        if (data.company === 'OTHER' || data.product === 'OTHER') {
          const pct = parseFloat(data.multiplierPercent);
          return isNaN(pct) ? 1 : pct;
        }
        return MULTIPLIER_TABLE[`${data.company}|${data.product}`] ?? 1;
      };

      const totalPoints = Math.round(base * getMultiplier() * 100) / 100;

      await createProductionRecord({
        prospect: addProductionFor.id,
        client_name: data.client,
        date_written: data.dateWritten || null,
        closure_date: data.closureDate || null,
        delivery: data.delivery,
        status: data.status,
        notes: data.notes,
        trial_app: data.trialApp,
        policy_company: data.company,
        policy_number: data.policyNumber,
        policy_product: data.product,
        policy_other_product: data.otherProduct,
        points_target: totalPoints,
        agent_1: data.agent1Id,
        agent_1_name: data.agent1Name,
        agent_1_pct: pA,
        agent_2: data.agentMode === 'split' ? data.agent2Id : null,
        agent_2_name: data.agentMode === 'split' ? data.agent2Name : '',
        agent_2_pct: pB,
        split_mode: data.agentMode === 'split' ? 'split' : 'solo',
      });

      setAddProductionFor(null);
      addToast({ type: 'success', message: 'Added to Production Tracker.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save production record.',
      });
    } finally {
      setSavingProduction(false);
    }
  };

  const handleQuickActionLog = async (row: Prospect, actionLabel: string) => {
    try {
      setSavingCallLog(true);
      const updated = await saveProspectCallLog(row, 'Connected', actionLabel);
      updateProspectInState(updated);
      setActiveCallLogProspect(updated);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : `Failed to ${actionLabel.toLowerCase()}.`,
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleDeleteProspect = (row: Prospect) => {
    setPendingDeleteProspect(row);
  };

  const handleToggleProspectMeta = useCallback(
    async (row: Prospect, field: 'top25' | 'hot', value: boolean) => {
      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));

      const previous = row.prospect_meta;
      const nextMeta = {
        notes: previous?.notes || '',
        hot: field === 'hot' ? value : Boolean(previous?.hot),
        top25: field === 'top25' ? value : Boolean(previous?.top25),
        outcome: previous?.outcome || '',
        mark: previous?.mark || 'default',
        files: previous?.files || [],
        source_date: previous?.source_date ?? null,
      };

      // Optimistic UI update while saving.
      setProspects((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                prospect_meta: {
                  ...(item.prospect_meta || {}),
                  ...nextMeta,
                },
              }
            : item
        )
      );

      try {
        const updated = await updateProspectDetails(row.id, {
          prospect_meta: nextMeta,
        });
        updateProspectInState(updated);
      } catch (err) {
        // Roll back optimistic change on failure.
        setProspects((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  prospect_meta: previous ?? null,
                }
              : item
          )
        );
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update prospect flags.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast]
  );

  const handleChangeProspectOutcome = useCallback(
    async (row: Prospect, outcome: 'Client' | 'Recruit' | 'Both') => {
      setSavingMetaProspectIdSet((prev) => new Set(prev).add(row.id));

      const previous = row.prospect_meta;
      const nextMeta = {
        notes: previous?.notes || '',
        hot: Boolean(previous?.hot),
        top25: Boolean(previous?.top25),
        outcome,
        mark: previous?.mark || 'default',
        files: previous?.files || [],
        source_date: previous?.source_date ?? null,
      };

      setProspects((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                prospect_meta: {
                  ...(item.prospect_meta || {}),
                  ...nextMeta,
                },
              }
            : item
        )
      );

      try {
        const updated = await updateProspectDetails(row.id, {
          prospect_meta: nextMeta,
        });
        updateProspectInState(updated);
      } catch (err) {
        setProspects((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  prospect_meta: previous ?? null,
                }
              : item
          )
        );
        addToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update outcome.',
        });
      } finally {
        setSavingMetaProspectIdSet((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [addToast]
  );

  const confirmDeleteProspect = async () => {
    if (!pendingDeleteProspect) return;

    const previousProspects = prospects;
    setProspects((prev) =>
      prev.filter((prospect) => String(prospect.id) !== String(pendingDeleteProspect.id))
    );

    try {
      setSavingCallLog(true);
      await deleteProspect(pendingDeleteProspect.id);
      setPendingDeleteProspect(null);
      addToast({ type: 'success', message: 'Prospect deleted successfully.' });

      if (prospects.length === 0) {
        await loadProspects(1, true);
      }
    } catch (err) {
      // Roll back list state if API delete fails.
      setProspects(previousProspects);
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete prospect.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const handleCreateProspect = async (formData: AddProspectFormData) => {
    try {
      setSavingCallLog(true);

      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim();
      const duplicate = prospects.find((item) => {
        const sameEmail = normalizedEmail && item.email?.trim().toLowerCase() === normalizedEmail;
        const samePhone = normalizedPhone && item.phone?.trim() === normalizedPhone;
        return sameEmail || samePhone;
      });

      if (duplicate) {
        addToast({
          type: 'warning',
          message: `A prospect with this ${normalizedEmail && duplicate.email?.trim().toLowerCase() === normalizedEmail ? 'email' : 'phone'} already exists.`,
        });
        return;
      }

      const created = await createProspect({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        recruited_by: formData.recruiterId,
        leader: formData.leaderId,
        profile: {
          state: formData.state || undefined,
          birthday: formData.birthday || undefined,
          gender: formData.gender || undefined,
          occupation: formData.occupation || undefined,
          how_known: formData.howKnown || undefined,
          what_told: formData.whatTold || undefined,
          relationship: formData.relationship ? Number(formData.relationship) : null,
          dependent_children: formData.dependentKids,
          flags: {
            age25Plus: formData.age25Plus,
            homeowner: formData.homeowner,
            solidCareer: formData.solidCareer,
            income75kPlus: formData.income75kPlus,
            dissatisfied: formData.dissatisfied,
            entrepreneurial: formData.entrepreneurial,
            spanishPreferred: formData.spanishPreferred,
            married: formData.married,
            dependentKids: formData.dependentKids,
          },
        },
        prospect_meta: {
          outcome: 'Both',
          mark: 'default',
          hot: false,
          top25: false,
        },
      });

      setProspects((prev) => [created, ...prev]);
      setAddProspectOpen(false);
      addToast({ type: 'success', message: 'Prospect added successfully.' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to add prospect.',
      });
    } finally {
      setSavingCallLog(false);
    }
  };

  const columns = useMemo(
    () =>
      buildProspectColumns(handleEditProspect, handleOpenCallLog, handleDeleteProspect, {
        notesByProspectId,
        noteDraftByProspectId,
        focusedNoteInputId,
        savingNoteProspectIdSet,
        savingMetaProspectIdSet,
        onNoteDraftChange: handleNoteDraftChange,
        onNoteFocus: setFocusedNoteInputId,
        onNoteBlur: () => setFocusedNoteInputId(null),
        onAddInlineNote: handleAddInlineNote,
        onOpenAllNotes: (row) => {
          void ensureNotesLoaded(row.id);
          setNotesOpenFor(row);
          setModalNoteDraft('');
        },
        onToggleProspectMeta: handleToggleProspectMeta,
        onChangeProspectOutcome: handleChangeProspectOutcome,
      }),
    [
      focusedNoteInputId,
      handleAddInlineNote,
      handleDeleteProspect,
      notesByProspectId,
      noteDraftByProspectId,
      savingNoteProspectIdSet,
      savingMetaProspectIdSet,
      handleNoteDraftChange,
      ensureNotesLoaded,
      handleToggleProspectMeta,
      handleChangeProspectOutcome,
    ]
  );

  const notesForOpenProspect = useMemo(() => {
    if (!notesOpenFor) return [];
    const notes = notesByProspectId[notesOpenFor.id] || [];
    return [...notes].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return at - bt;
    });
  }, [notesByProspectId, notesOpenFor]);

  useEffect(() => {
    void loadProspects(1, true, sortState, filters);
  }, [sortState, filters]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && prospects.length > 0) {
          await loadProspects(nextPageNum, false, sortState, filters);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextPageNum, prospects.length, sortState, filters]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Loading prospects"
          description="Fetching your latest prospect data..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          pageHeading={pageHeading}
          pageDescription={pageDescription}
          title="Error Loading Prospects"
          description={error}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-6">
      <Block
        title={pageHeading}
        description={`${pageDescription} • ${totalCount} total`}
        className="mb-6 flex-shrink-0"
        actions={
          <Button type="button" onClick={() => setAddProspectOpen(true)}>
            + New Prospect
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden">
        <TrackerTable
          columns={columns}
          rows={prospects}
          rowKey={(row) => String(row.id)}
          stickyFirstNColumns={3}
          resizable
          tableId="prospect-tracker"
          emptyMessage="No prospects found. Add your first prospect to get started!"
          className="h-full"
          serverSort={sortState}
          onServerSortChange={setSortState}
          serverFilters={filters}
          onServerFilterChange={setFilters}
        />
      </div>

      <div ref={sentinelRef} className="mt-4 flex-shrink-0">
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">Loading more prospects...</div>
          </div>
        )}
        {/* {!hasMore && prospects.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-white/60">No more prospects to load</div>
          </div>
        )} */}
      </div>

      <CallLogModal
        prospect={activeCallLogProspect}
        saving={savingCallLog}
        hideRestrictedActions={isNewAgent}
        hideAddAgencyCode={isAgent}
        onClose={() => setActiveCallLogProspect(null)}
        onSave={handleSaveCallLog}
        onInvite={handleInviteProspect}
        onAddAgencyCode={handleAddAgencyCode}
        onRequestTrainer={(prospect) => handleQuickActionLog(prospect, 'Requested trainer')}
        onAddAppointment={(prospect) => handleQuickActionLog(prospect, 'Added appointment')}
        onAddProduction={async (prospect) => { setAddProductionFor(prospect); }}
      />

      <AddAgencyCodeModal
        prospect={addAgencyCodeFor}
        saving={savingCallLog}
        onClose={() => setAddAgencyCodeFor(null)}
        onSubmit={handleSubmitAddAgencyCode}
      />

      <AddProductionModal
        open={Boolean(addProductionFor)}
        saving={savingProduction}
        prospect={addProductionFor}
        onClose={() => setAddProductionFor(null)}
        onSubmit={handleAddProductionSave}
      />

      <AddProspectModal
        open={addProspectOpen}
        saving={savingCallLog}
        onClose={() => setAddProspectOpen(false)}
        onSubmit={handleCreateProspect}
      />

      <AddProspectModal
        open={Boolean(editingProspect)}
        title="Edit Prospect"
        submitLabel="Update Prospect"
        initialForm={editingProspect ? mapProspectToForm(editingProspect) : null}
        saving={savingCallLog}
        onClose={() => setEditingProspect(null)}
        onSubmit={handleUpdateProspect}
      />

      <ConfirmationDialog
        open={Boolean(pendingDeleteProspect)}
        title="Delete Prospect"
        message={`Remove ${pendingDeleteProspect?.full_name || pendingDeleteProspect?.email || ''} from this list?`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={savingCallLog}
        onClose={() => setPendingDeleteProspect(null)}
        onConfirm={confirmDeleteProspect}
      />

      <TrackerNotesModal
        open={Boolean(notesOpenFor)}
        title={`Notes - ${notesOpenFor?.full_name || notesOpenFor?.email || ''}`}
        notes={notesForOpenProspect}
        draft={modalNoteDraft}
        saving={Boolean(
          notesOpenFor &&
            (savingNoteProspectIdSet.has(notesOpenFor.id) || loadingNoteProspectIdSet.has(notesOpenFor.id))
        )}
        onClose={() => setNotesOpenFor(null)}
        onDraftChange={setModalNoteDraft}
        onAddNote={handleAddModalNote}
      />
    </div>
  );
}
