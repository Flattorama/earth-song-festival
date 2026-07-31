/*
  # Record how a signed waiver was collected

  Staff at the gate collect paper waivers from people who never completed the
  emailed Smartwaiver. The admin dashboard needs to mark those attendees signed
  by hand, and later tell "signed on Smartwaiver" apart from "signed on paper,
  there is a physical document to file".

  `waiver_signed_method` is written only by the dashboard's manual action:
    'paper'  - staff recorded a paper waiver
    NULL     - everything else (digital signatures are identified by
               smartwaiver_id, so no backfill is needed)

  Additive only: no data is modified.
*/

ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS waiver_signed_method TEXT;
