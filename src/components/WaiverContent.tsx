import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WaiverContentProps {
  section1Checked?: boolean;
  onSection1Change?: (checked: boolean) => void;
  section2Checked?: boolean;
  onSection2Change?: (checked: boolean) => void;
  showCheckboxes?: boolean;
}

const WaiverContent = ({
  section1Checked = false,
  onSection1Change,
  section2Checked = false,
  onSection2Change,
  showCheckboxes = false,
}: WaiverContentProps) => {
  return (
    <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
      <a
        href="/Earth_Song_Waiver_Printable.pdf"
        download
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center space-y-1 group cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          window.open("/Earth_Song_Waiver_Printable.pdf", "_blank");
        }}
      >
        <h3 className="font-serif text-xl font-semibold text-primary group-hover:text-primary/70 underline underline-offset-2 decoration-primary/40 group-hover:decoration-primary/70 transition-colors">
          Release of Liability, Waiver of Claims,
        </h3>
        <h3 className="font-serif text-xl font-semibold text-primary group-hover:text-primary/70 underline underline-offset-2 decoration-primary/40 group-hover:decoration-primary/70 transition-colors">
          Assumption of Risk & Indemnity Agreement
        </h3>
        <p className="font-serif text-base font-medium text-foreground mt-2">
          Earth Song Festival Retreat
        </p>
        <p className="text-muted-foreground text-xs">August 7–9, 2026</p>
        <p className="text-muted-foreground text-xs">
          Still Life Retreat – West Grey, Ontario
        </p>
      </a>

      <hr className="border-border" />

      {/* WARNING HEADER */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="font-bold text-amber-900 text-sm uppercase leading-snug">
          WARNING: BY SIGNING THIS DOCUMENT YOU WILL WAIVE CERTAIN LEGAL RIGHTS,
          INCLUDING THE RIGHT TO SUE OR CLAIM COMPENSATION FOLLOWING AN ACCIDENT.
          PLEASE READ CAREFULLY!
        </p>
      </div>

      <p>
        This Release of Liability, Waiver of Claims, Assumption of Risk and
        Indemnity Agreement ("Agreement") is entered into by the undersigned
        Attendee in consideration of being permitted to attend and participate in
        the Earth Song Festival Retreat.
      </p>

      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          Definition of Releasees
        </h4>
        <p>
          In this Agreement, the term "Releasees" shall include Still Life
          Retreat, 2676951 Ontario Inc., Shannon Leroux, and their respective
          owners, directors, officers, employees, contractors, volunteers,
          agents, affiliates, and representatives. By signing this Agreement, the
          Attendee acknowledges and agrees as follows:
        </p>
      </div>

      {/* SECTION 1 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          1. Acknowledgement and Assumption of Risk
        </h4>
        <p>
          The Attendee acknowledges that the Property contains natural and
          man-made features, including but not limited to: a private swimming
          pond, trails and wooded areas, uneven ground and natural terrain, barns
          and outbuildings, laneways and parking areas, and recreational areas
          and event spaces.
        </p>
        <p>
          Participation involves inherent and obvious and non-obvious risks,
          including but not limited to: slips, trips, and falls; water hazards
          and drowning risks; wildlife encounters; weather-related hazards;
          exposure to insects or environmental conditions; risks associated with
          barns, structures, trails, or uneven terrain; and injury arising from
          recreational, wellness, or festival activities.
        </p>
        <p>
          The Attendee acknowledges that Still Life Retreat does not provide
          lifeguards, medical personnel, guides, or supervision for use of the
          Property.
        </p>
        <p>
          The Attendee freely and voluntarily assumes all risks, both known and
          unknown, foreseeable or unforeseeable, associated with attendance and
          participation. The Attendee further acknowledges they are physically
          and mentally capable of participating and accept full responsibility
          for their own health and safety, and represents that they are at least
          18 years of age.
        </p>
      </div>

      {/* Section 1 Initials Checkbox */}
      {showCheckboxes && (
        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 border border-border">
          <Checkbox
            id="section1-initials"
            checked={section1Checked}
            onCheckedChange={(checked) => onSection1Change?.(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="section1-initials"
            className="text-sm leading-snug cursor-pointer text-foreground/80"
          >
            I acknowledge and accept the risks described in Section 1 above.
          </Label>
        </div>
      )}

      {/* SECTION 2 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          2. Release of Liability & Waiver of Claims
        </h4>
        <p>
          In consideration of being permitted to enter onto and use the
          Property, the Attendee hereby releases, waives, and forever discharges
          the Releasees from any and all liability, claims, demands, actions,
          damages, losses, costs or expenses of any kind whatsoever arising from
          personal injury, illness, property damage, economic loss, or death.
        </p>
        <p>
          This release applies to claims arising directly or indirectly from:
          attendance at the Earth Song Festival Retreat, participation in
          activities on the Property, use of facilities or amenities on the
          Property, or presence anywhere on the Property.
        </p>
        <p className="font-bold text-foreground">
          THIS WAIVER INCLUDES CLAIMS ARISING FROM THE NEGLIGENCE OF THE
          RELEASEES, BREACH OF CONTRACT, OR BREACH OF ANY STATUTORY OR OTHER
          DUTY OF CARE, INCLUDING ANY DUTY OF CARE OWED UNDER THE OCCUPIERS'
          LIABILITY ACT, R.S.O. 1990, c. O.2, ON THE PART OF THE RELEASEES.
        </p>
      </div>

      {/* Section 2 Initials Checkbox */}
      {showCheckboxes && (
        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 border border-border">
          <Checkbox
            id="section2-initials"
            checked={section2Checked}
            onCheckedChange={(checked) => onSection2Change?.(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="section2-initials"
            className="text-sm leading-snug cursor-pointer text-foreground/80"
          >
            I acknowledge and accept the release of liability and waiver of
            claims described in Section 2 above.
          </Label>
        </div>
      )}

      {/* SECTION 3 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          3. Indemnity
        </h4>
        <p>
          The Attendee agrees to indemnify, defend, and hold harmless the
          Releasees from and against any and all claims, actions, liabilities,
          damages, losses, costs, or expenses, including legal fees, arising
          from: the Attendee's presence on or use of the Property; any breach of
          this Agreement or the Property Rules attached as Schedule A; any claims
          brought by third parties arising from the Attendee's actions or
          omissions; and any injury or damage caused by the Attendee while on
          the Property.
        </p>
      </div>

      {/* SECTION 4 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          4. Medical Responsibility & Authorization
        </h4>
        <p>
          The Attendee understands that the Releasees do not provide medical
          services and that emergency response times in rural areas may vary.
          The Attendee assumes full responsibility for their own medical needs,
          carrying required medications, and determining their fitness to
          participate. In the event of an emergency, the Attendee authorizes the
          Releasees to secure medical treatment or transportation on their
          behalf, and the Attendee assumes all costs associated with such
          medical care.
        </p>
      </div>

      {/* SECTION 5 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          5. Media Release
        </h4>
        <p>
          The Attendee consents to the photography, audio, and video recording
          of their presence and participation at the Earth Song Festival
          Retreat, and grants the Releasees the right to use these materials for
          promotional, marketing, or other operational purposes without
          compensation.
        </p>
      </div>

      {/* SECTION 6 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          6. General Provisions
        </h4>
        <ul className="space-y-2 pl-4">
          <li>
            <span className="font-medium text-foreground">No Assignment:</span>{" "}
            Attendance rights may not be transferred or assigned without prior
            written approval from Still Life Retreat.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Governing Law & Jurisdiction:
            </span>{" "}
            This Agreement shall be governed by and interpreted in accordance
            with the laws of the Province of Ontario and the laws of Canada
            applicable therein. Any disputes arising under this Agreement shall
            be subject to the exclusive jurisdiction of the courts of the
            Province of Ontario.
          </li>
          <li>
            <span className="font-medium text-foreground">Severability:</span>{" "}
            If any provision of this Agreement is found to be invalid or
            unenforceable, the remaining provisions shall remain in full force
            and effect.
          </li>
        </ul>
      </div>

      {/* SECTION 7 */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          7. Full Understanding
        </h4>
        <p>
          The Attendee acknowledges that they have read this Agreement in full,
          understood its contents, voluntarily agreed to its terms, and
          understand that they are waiving certain legal rights, including the
          right to bring legal claims.
        </p>
      </div>

      {/* DATA PRIVACY */}
      <div className="space-y-2">
        <h4 className="font-serif text-base font-semibold text-primary">
          Data Privacy & Consent to Electronic Execution
        </h4>
        <p>
          By signing below or clicking "I Agree," I consent to the collection,
          use, and secure storage of my personal information by Still Life
          Retreat and its authorized administrators. I understand this
          information is collected strictly for the purposes of executing this
          legal agreement, managing safety and liability at the Earth Song
          Festival Retreat, and facilitating emergency medical response if
          required. I agree that an electronic signature or clickwrap execution
          of this document is legally binding and equivalent to my handwritten
          signature.
        </p>
      </div>

      {/* SCHEDULE A */}
      <div className="space-y-2">
        <h4 className="font-serif text-lg font-semibold text-primary border-t border-border pt-4">
          Schedule A: Property Rules
        </h4>
        <p>
          All Attendees agree to comply with the following Property rules. Any
          damages caused by the Attendee may result in financial liability.
        </p>
        <ul className="space-y-1.5 pl-4">
          <li>
            <span className="font-medium text-foreground">Parking:</span>{" "}
            Vehicles must be parked only in designated parking areas. Vehicles
            are not permitted on lawn areas without prior authorization.
          </li>
          <li>
            <span className="font-medium text-foreground">Fire Safety:</span>{" "}
            Open fires are prohibited unless expressly authorized by Still Life
            Retreat.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Barbecues / Grills:
            </span>{" "}
            Must be used outdoors only in designated areas.
          </li>
          <li>
            <span className="font-medium text-foreground">Candles:</span> All
            candles must be enclosed in glass containers with flames no higher
            than 2 inches below the container height.
          </li>
          <li>
            <span className="font-medium text-foreground">Smoking:</span>{" "}
            Smoking is permitted only in designated outdoor areas.
          </li>
          <li>
            <span className="font-medium text-foreground">Decorations:</span>{" "}
            Decorations may not be attached using nails, screws, tape, or
            adhesives that damage surfaces. Glitter, confetti, and sparklers are
            prohibited.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Property Condition:
            </span>{" "}
            Attendees must respect the Property and leave all areas in the same
            condition as found.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WaiverContent;
