-- Penalty shootout lifecycle events and bracket audit markers.

alter table public.match_live_events
  drop constraint if exists match_live_events_event_type_check;

alter table public.match_live_events
  add constraint match_live_events_event_type_check
  check (
    event_type in (
      'match_started',
      'first_half_finished',
      'second_half_started',
      'match_finished',
      'result_submitted',
      'penalties_started',
      'penalties_finished',
      'bracket_updated',
      'goal',
      'own_goal',
      'penalty_goal',
      'penalty_missed',
      'yellow_card',
      'red_card',
      'foul',
      'injury',
      'observation',
      'penalty_scored',
      'penalty_missed_tiebreak'
    )
  );

create index if not exists match_live_events_penalty_order_idx
  on public.match_live_events (match_id, penalty_order)
  where event_type in ('penalty_scored', 'penalty_missed_tiebreak')
    and corrected_at is null;
