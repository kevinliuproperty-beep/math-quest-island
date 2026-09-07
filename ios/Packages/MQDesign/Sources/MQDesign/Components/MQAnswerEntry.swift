import SwiftUI
import MQContent

// =============================================================================
// THE TYPED-ANSWER SURFACE
//
// Three objects, one decision. See `Quest Lane - 2026-09-07` in the vault for the
// argument in full; the short version is in MQKeypad's doc comment.
//
// Material rule, inherited rather than invented: in this world a thing you press
// is DRIFTWOOD (that is what `MQAnswerTile` is) and a thing that names something
// is a CARVED TAG ON A ROPE (that is what `MQTag` is). So the keys are small
// driftwood tiles and the units are tags. Nothing here is a rounded rectangle
// with a grey shadow.
//
// # Why this lives in MQDesign
//
// It was `MQQuest.QAnswerEntry` until the rehearsal fix pass of 2026-09-07. The
// Phase 1 dress rehearsal drove one real 150-item Patchwerk run and measured
// **50 typed items arriving at a screen with no keypad, no answer slot and no
// unit chip** - four blank planks, every one scored wrong, every one resetting
// the stack multiplier, best stacks 4 of a cap of 10. The whole surface lived
// inside `MQQuest`, and a mode may not depend on a mode.
//
// This mirrors the web rather than re-deciding it: `js/modes/patchwerk.js` never
// renders a question at all, it calls `ctx.nextQuestion()`, and `js/app.js`'s
// `nextQuestion()` is the ONE question surface in the whole app - `Q.typed` gets
// the typed input, everything else gets choice buttons, and `figHtml(Q)` draws
// the figure for every mode alike. **The rejected alternative was filtering the
// Patchwerk feed to choice items**: the web does not filter, the feed's topic
// rotation across every live class-level topic is the mode's entire variety
// mechanism (measured repeat rate 0.021 against the main mode's 0.376), and a
// filter would silently narrow the pool a child sees without saying so anywhere.
//
// `MQQuest/Components/QAnswerEntry.swift` keeps `QAnswerSlot`, `QUnitChipRow` and
// `QKeypad` as thin wrappers with their original initialisers, so `QBattleView`,
// `QDriver` and their suites compile and read exactly as they did.
// =============================================================================

/// How a driver or a gate gets its hands on one of these controls.
///
/// `MQQuest` records every interactive element's DRAWN frame together with the
/// very closure its `Button` fires (`QHitMap`, `.qHit`), because "the driver does
/// not drive the views" was a kill in the Quest refutation. That recorder is a
/// driver instrument and lives in `MQQuest`; this package must not know about it.
///
/// So the recorder arrives as a decorator. `nil` - the app's own case, and
/// Patchwerk's - wraps nothing and costs nothing.
public typealias MQHitTag = @MainActor (AnyView, String,
                                        Bool,
                                        @escaping @MainActor @Sendable () async -> Void) -> AnyView

/// The hit-map names the typed surface publishes.
///
/// The strings are the ones `QBattleView.Hit` already spelled, because the driver,
/// the transcripts and four suites tap by them. They are declared here, beside the
/// controls that answer to them, so the name and the control cannot drift apart.
public enum MQTypedHit {
    public static func key(_ k: MQTypedEntry.Key) -> String { "key-\(MQKeypad.glyph(k))" }
    public static func chip(_ unit: String) -> String { "chip-\(unit)" }
    public static let undo = "undo"
    public static let check = "check"
}

@MainActor
private func tagged<V: View>(_ hit: MQHitTag?, _ view: V, _ name: String,
                             _ enabled: Bool,
                             _ fire: @escaping @MainActor @Sendable () async -> Void) -> AnyView {
    guard let hit else { return AnyView(view) }
    return hit(AnyView(view), name, enabled, fire)
}

/// The answer slot: what the child has entered, written on the board.
///
/// It is drawn as ink on the signboard's own parchment rather than as a text
/// field, because that is where the question is and a floating input box would
/// be the one piece of iOS chrome on an island. The unit, when a chip is chosen,
/// is set slightly lighter and a hair smaller - it is a *label on* the number,
/// not part of it, and the child chose them separately.
public struct MQAnswerSlot: View {
    let p: MQPalette
    let entry: MQTypedEntry
    let fontSize: CGFloat
    /// Drawn only while the child may still type. After an answer lands the slot
    /// is a record, and a blinking caret on a record is a lie.
    let active: Bool

    public init(_ p: MQPalette = .noon, entry: MQTypedEntry,
                fontSize: CGFloat = 34, active: Bool = true) {
        self.p = p; self.entry = entry; self.fontSize = fontSize; self.active = active
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: fontSize * 0.22) {
            Text(entry.digits.isEmpty ? " " : entry.digits)
                .font(.mq(fontSize, .extrabold))
                .monospacedDigit()
                .foregroundStyle(p.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            if active {
                // One deliberate piece of motion in the whole screen: the nib
                // resting where the next digit goes.
                Rectangle()
                    .fill(p.ink.opacity(0.55))
                    .frame(width: max(2, fontSize * 0.06), height: fontSize * 0.92)
            }
            if let unit = entry.unit, !unit.isEmpty {
                Text(MQTypeset.bindUnits(unit))
                    .font(.mq(fontSize * 0.72, .semibold))
                    .foregroundStyle(p.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, fontSize * 0.42)
        .frame(height: fontSize * 1.5)
        .background {
            Canvas { ctx, size in
                // A ruled writing line, not a box. The board is already the box.
                let y = size.height - 3
                ctx.stroke(Path.smoothOpen([
                    CGPoint(x: 2, y: y),
                    CGPoint(x: size.width * 0.5, y: y - 1.4),
                    CGPoint(x: size.width - 2, y: y + 0.8)
                ]), with: .color(p.ink.opacity(0.34)),
                           style: StrokeStyle(lineWidth: 2.4, lineCap: .round))
            }
        }
    }
}

/// The unit chips: the declared unit and two plausible distractors, as carved
/// tags the child can turn over.
///
/// The row appears only when the question declares a unit. A blank choice is the
/// default and is stated in words beside the row - there is deliberately no
/// fourth "none" chip, because a none-chip makes blank look like a fourth answer
/// rather than like the ordinary case it is.
public struct MQUnitChipRow: View {
    let p: MQPalette
    let chips: [String]
    let selected: String?
    let compact: Bool
    let prompt: String
    let optionalNote: String
    /// The words either side of the chips, tinted for the ground THIS row was
    /// placed on. `nil` keeps `inkSoft`, which is what the Quest board's
    /// signboard parchment wants; Patchwerk's arena hands in `captionOnLight`.
    let promptTint: Color?
    let hit: MQHitTag?
    let tap: @MainActor @Sendable (String) -> Void

    public init(_ p: MQPalette = .noon, chips: [String], selected: String?,
                compact: Bool = false,
                prompt: String = "Unit", optionalNote: String = "or leave it blank",
                promptTint: Color? = nil,
                hit: MQHitTag? = nil,
                tap: @escaping @MainActor @Sendable (String) -> Void) {
        self.p = p; self.chips = chips; self.selected = selected
        self.compact = compact; self.prompt = prompt
        self.optionalNote = optionalNote; self.promptTint = promptTint
        self.hit = hit; self.tap = tap
    }

    /// The chip's own box. Returned from the screen's `tapTargets`, so a chip can
    /// never be shrunk under the 44 pt floor with the gate still green.
    nonisolated public static func chipSize(compact: Bool) -> CGSize {
        CGSize(width: compact ? 74 : 92, height: MQTap.min + (compact ? 2 : 8))
    }

    public var body: some View {
        HStack(spacing: compact ? 8 : 12) {
            Text(prompt)
                .font(.mq(compact ? 12 : 15, .medium))
                .foregroundStyle(promptTint ?? p.inkSoft)
            ForEach(chips, id: \.self) { chip in
                // ONE chip is ONE unit string. It comes out of
                // `Question.acceptedUnits`, which the engine API publishes as an
                // array, so there is no comma-joined `"cm³,ml"` for a tap to
                // submit any more (Quest Refutation K7).
                tagged(hit,
                       Button { tap(chip) } label: { tag(chip) }.buttonStyle(.plain),
                       MQTypedHit.chip(chip), true, { tap(chip) })
            }
            Text(optionalNote)
                .font(.mq(compact ? 11 : 14, .regular))
                .foregroundStyle((promptTint ?? p.inkSoft).opacity(promptTint == nil ? 0.85 : 1))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
        }
    }

    private func tag(_ chip: String) -> some View {
        let on = (selected == chip)
        let box = Self.chipSize(compact: compact)
        return MQTag(p) {
            Text(MQTypeset.bindUnits(chip))
                .font(.mq(compact ? 17 : 21, on ? .extrabold : .bold))
                .foregroundStyle(p.underLight(Color(hex: on ? 0x3A2109 : 0x7A5A33)))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(width: box.width - 14, height: box.height - 10)
        }
        // Selected reads as "turned face up and lit": the gold is the world's own
        // collected/yours colour, and it is the only thing that changes. No
        // scale, no shadow, no ring.
        .overlay {
            if on {
                RoundedRectangle(cornerRadius: 9)
                    .strokeBorder(p.gold, lineWidth: 3)
            }
        }
        .frame(width: box.width, height: box.height)
        .contentShape(Rectangle())
    }
}

/// The keypad.
///
/// # The decision, and the alternative it was taken over
///
/// **Alternative: the system keyboard on a text field.** It is one line of code
/// and it is what the web does (`inputmode="decimal"`). It fails for two separate
/// reasons, and the second is the one that matters:
///
///  1. On an iPad's decimal pad there are no letters and no superscripts, so
///     `cm`, `cm²`, `ml`, `pupils` are all untypeable. The engine's whole
///     declared-unit contract - and the unit lesson the sweep lane just built -
///     is unreachable by touch. That is recorded verbatim as open item 4 of
///     *Unit Sweep Lane - 2026-09-07*.
///  2. Switching to a FULL keyboard makes them typeable and makes the question
///     worse: a nine-year-old gets a QWERTY over half the screen, hunts for a
///     superscript 2 that is not there, and discovers that `cm2` grades and
///     `sq cm` does not. That is a spelling test wearing a maths question's
///     clothes, and it is exactly the class of failure the sweep's own "still
///     rejected" list is full of (`n dollars`, `sq cm`, `cm^2`, `per cent`).
///
/// **What ships instead:** this keypad - digits, plus `.` `/` `-` only where the
/// TOPIC needs them (`MQKeypadPolicy`, measured off all 250 generator refs) - and
/// `MQUnitChipRow` beside it. The child taps a number, then taps a unit or leaves
/// it blank. Both paths go to `MQEngineJS.grade` unchanged: with a chip the
/// submission is `"<number> <unit>"`, which is the parity corpus's own
/// `with-unit` spelling; blank submits the bare number, which has always been
/// accepted and still is.
///
/// The cost, stated plainly: the child can no longer type a unit the app did not
/// offer. On a keypad they could not type one at all, so this is strictly more
/// reachable than the surface it replaces - but a spelling like `cm3` for `cm³`
/// now never reaches the grader, and the alias table that handles it is
/// consequently unexercised from iOS. That is a deliberate narrowing, not an
/// oversight.
public struct MQKeypad: View {
    let p: MQPalette
    let entry: MQTypedEntry
    let policy: MQKeypadPolicy
    let metrics: MQKeypad.Geo
    let undoTitle: String
    let submitTitle: String
    let hit: MQHitTag?
    let press: @MainActor @Sendable (MQTypedEntry.Key) -> Void
    let submit: @MainActor @Sendable () async -> Void

    public init(_ p: MQPalette = .noon, entry: MQTypedEntry, policy: MQKeypadPolicy,
                geometry: MQKeypad.Geo,
                undoTitle: String = "Undo", submitTitle: String = "Check",
                hit: MQHitTag? = nil,
                press: @escaping @MainActor @Sendable (MQTypedEntry.Key) -> Void,
                submit: @escaping @MainActor @Sendable () async -> Void) {
        self.p = p; self.entry = entry; self.policy = policy
        self.metrics = geometry
        self.undoTitle = undoTitle; self.submitTitle = submitTitle
        self.hit = hit
        self.press = press; self.submit = submit
    }

    // MARK: Geometry
    //
    // ONE place, per PHASE1's rule for anyone adding an interactive element: the
    // body draws from it and the screen's `tapTargets` audits it.

    public struct Geo: Sendable, Equatable {
        public var key: CGSize
        public var gap: CGFloat
        public var actionWidth: CGFloat
        public var glyph: CGFloat

        public init(key: CGSize, gap: CGFloat, actionWidth: CGFloat, glyph: CGFloat) {
            self.key = key; self.gap = gap
            self.actionWidth = actionWidth; self.glyph = glyph
        }

        public var width: CGFloat { key.width * 3 + gap * 3 + actionWidth }
        public var height: CGFloat { key.height * 4 + gap * 3 }
    }

    /// Sized to the frame, floored at the tap minimum with a margin. The floor is
    /// not 44: a digit key a child hits ten times a question wants more than the
    /// legal minimum, so the floor here is 52 and the audit checks 44.
    nonisolated public static func geometry(_ m: MQMetrics) -> Geo {
        let compact = !m.isRegular
        let key = CGFloat(compact ? 54 : 68)
        // The action column is sized to the WORD, not to taste: `MQPlankButton`
        // pads a primary title by 30 pt each side and does not scale its text
        // down, so an action column narrower than the word plus 60 truncates
        // "Check" to "Ch..." - which it did, and which the first driven PNG
        // showed in the first minute.
        return Geo(key: CGSize(width: key, height: compact ? 48 : 58),
                   gap: compact ? 7 : 10,
                   actionWidth: compact ? 108 : 150,
                   glyph: compact ? 24 : 30)
    }

    /// The bottom-row keys this policy shows, left and right of the zero.
    nonisolated public static func bottomKeys(_ policy: MQKeypadPolicy) -> (MQTypedEntry.Key?, MQTypedEntry.Key?) {
        let left: MQTypedEntry.Key? = policy.decimal ? .decimalPoint
            : (policy.minus ? .minus : nil)
        let right: MQTypedEntry.Key? = policy.fraction ? .slash
            : (policy.decimal && policy.minus ? .minus : nil)
        return (left, right)
    }

    public var body: some View {
        HStack(alignment: .top, spacing: metrics.gap) {
            VStack(spacing: metrics.gap) {
                ForEach(0..<3, id: \.self) { row in
                    HStack(spacing: metrics.gap) {
                        ForEach(0..<3, id: \.self) { col in
                            key(.digit(row * 3 + col + 1), label: "\(row * 3 + col + 1)")
                        }
                    }
                }
                HStack(spacing: metrics.gap) {
                    slot(Self.bottomKeys(policy).0)
                    key(.digit(0), label: "0")
                    slot(Self.bottomKeys(policy).1)
                }
            }
            VStack(spacing: metrics.gap) {
                let canUndo = entry.isEnabled(.backspace, policy: policy)
                tagged(hit,
                       action(undoTitle, primary: false) { press(.backspace) }
                           .frame(height: metrics.key.height)
                           .disabled(!canUndo)
                           .opacity(canUndo ? 1 : 0.4),
                       MQTypedHit.undo, canUndo, { press(.backspace) })
                tagged(hit,
                       Button { Task { await submit() } } label: {
                           MQPlankButton(p, submitTitle, primary: true,
                                         fontSize: metrics.glyph * 0.62)
                               .frame(maxWidth: .infinity, maxHeight: .infinity)
                       }
                       .buttonStyle(.plain)
                       .frame(maxHeight: .infinity)
                       .disabled(!entry.isSubmittable)
                       .opacity(entry.isSubmittable ? 1 : 0.45),
                       MQTypedHit.check, entry.isSubmittable, submit)
            }
            .frame(width: metrics.actionWidth)
        }
        .frame(width: metrics.width, height: metrics.height)
    }

    @ViewBuilder private func slot(_ k: MQTypedEntry.Key?) -> some View {
        if let k {
            key(k, label: Self.glyph(k))
        } else {
            // Kept as space, not collapsed: the zero stays under the 8 whatever
            // the topic's policy is, so a child moving between islands does not
            // find the digits have shuffled.
            Color.clear.frame(width: metrics.key.width, height: metrics.key.height)
        }
    }

    nonisolated public static func glyph(_ k: MQTypedEntry.Key) -> String {
        switch k {
        case .digit(let d): return "\(d)"
        case .decimalPoint: return "."
        case .slash: return "/"
        case .minus: return "-"
        case .backspace: return "Undo"
        case .clear: return "C"
        }
    }

    private func key(_ k: MQTypedEntry.Key, label: String) -> some View {
        let enabled = entry.isEnabled(k, policy: policy)
        return tagged(hit,
                      Button { press(k) } label: {
                          // The answer tile's own material at keypad size, and NO
                          // tilt: the hand-placed wobble is the answer tile's
                          // signature, and a wobbling digit key reads as a loose
                          // button rather than as driftwood.
                          //
                          // The point and the slash are set LARGER than the
                          // digits. At the digit size a full stop is four pixels
                          // of ink on a 68 pt plank and reads as a blank key -
                          // which is what the first driven PNG showed.
                          MQAnswerTile(p, label, tilt: 0,
                                       fontSize: label.count == 1 && !label.first!.isNumber
                                           ? metrics.glyph * 1.45 : metrics.glyph)
                              .frame(width: metrics.key.width, height: metrics.key.height)
                      }
                      .buttonStyle(.plain)
                      .disabled(!enabled)
                      .opacity(enabled ? 1 : 0.42),
                      MQTypedHit.key(k), enabled, { press(k) })
    }

    private func action(_ title: String, primary: Bool,
                        action: @escaping () -> Void) -> some View {
        Button(action: action) {
            MQPlankButton(p, title, primary: primary,
                          fontSize: primary ? metrics.glyph * 0.62 : metrics.glyph * 0.56)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.plain)
    }
}
