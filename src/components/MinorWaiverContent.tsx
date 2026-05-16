const MinorWaiverContent = () => {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-foreground/80">
      <div className="space-y-1 text-center">
        <h3 className="font-serif text-xl font-semibold text-primary">
          Minor Attendee Waiver, Indemnity, and Consent Addendum
        </h3>
        <p className="font-serif text-base font-medium text-foreground">
          Earth Song Festival Retreat
        </p>
        <p className="text-xs text-muted-foreground">
          August 7–9, 2026 — Still Life Retreat, West Grey, Ontario
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold uppercase leading-snug text-amber-900">
          THIS IS A BINDING LEGAL AGREEMENT. PLEASE READ CAREFULLY.
        </p>
      </div>

      <p>
        This Minor Attendee Waiver, Indemnity, and Consent Addendum (the
        "Addendum") is supplemental to the Release of Liability, Waiver of
        Claims, Assumption of Risk & Indemnity Agreement (the "Primary
        Agreement").
      </p>

      <p>
        In consideration of the Minor(s) named in this checkout being permitted
        to attend the Earth Song Festival Retreat, the undersigned Parent/Legal
        Guardian acknowledges and agrees to the following on their own behalf,
        and on behalf of the Minor(s):
      </p>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          1. Authority and Capacity
        </h4>
        <p>
          The undersigned represents and warrants that they are the legal parent
          or guardian of the Minor(s) listed below, and possess the requisite
          legal authority to make decisions concerning the Minor(s)'s care,
          welfare, and legal rights.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          2. Acknowledgement and Assumption of Risk
        </h4>
        <p>
          The Parent/Legal Guardian has read the Primary Agreement and
          understands the inherent and obvious and non-obvious risks associated
          with the Property, including but not limited to open water hazards,
          uneven terrain, wildlife, and festival activities. The Parent/Legal
          Guardian agrees that these risks apply fully to the Minor(s). The
          Parent/Legal Guardian voluntarily assumes all risks of injury, illness,
          or death to the Minor(s) arising from their presence on the Property or
          participation in the retreat.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          3. Mandatory Supervision
        </h4>
        <p>
          The Parent/Legal Guardian acknowledges that the Releasees (as defined
          in the Primary Agreement, including Still Life Retreat, 2676951 Ontario
          Inc., and Shannon Leroux) do not provide childcare, lifeguards, or
          dedicated supervision. The Parent/Legal Guardian assumes sole,
          continuous, and absolute responsibility for the supervision, safety,
          and well-being of the Minor(s) at all times while on the Property.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          4. Parental Indemnity Agreement
        </h4>
        <p>
          To the maximum extent permitted by law, the Parent/Legal Guardian
          agrees to INDEMNIFY, DEFEND, AND HOLD HARMLESS the Releasees from and
          against any and all claims, actions, lawsuits, damages, or liabilities
          (including legal fees on a substantial indemnity basis) brought by, or
          on behalf of, the Minor(s) for any personal injury, illness, property
          damage, or death arising out of the Minor(s)'s presence or
          participation at the Earth Song Festival Retreat.
        </p>
        <p>
          This indemnity applies regardless of whether the claim arises from the
          negligence, breach of contract, or breach of statutory duty (including
          under the Occupiers' Liability Act) on the part of the Releasees.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          5. Medical Consent
        </h4>
        <p>
          The Parent/Legal Guardian assumes full responsibility for the
          Minor(s)'s medical needs. In the event of an emergency where the
          Parent/Legal Guardian cannot be immediately located, the Parent/Legal
          Guardian authorizes the Releasees to secure emergency medical treatment
          and transportation for the Minor(s), and agrees to assume all
          associated financial costs.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          Parent / Legal Guardian Signature
        </p>
        <p className="mt-2">
          I acknowledge that I have read this Addendum, understand its terms, and
          agree to be bound by it. I understand that by signing this document, I
          am accepting significant financial risk and legal obligations on behalf
          of myself and the Minor(s).
        </p>
      </div>
    </div>
  );
};

export default MinorWaiverContent;
