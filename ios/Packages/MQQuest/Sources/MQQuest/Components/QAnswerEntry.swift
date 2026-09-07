import SwiftUI
import MQDesign

// =============================================================================
// THE TYPED-ANSWER SURFACE
//
// Three objects, one decision. See `Quest Lane - 2026-09-07` in the vault for the
// argument in full; the short version is in QKeypad's doc comment.
//
// Material rule, inherited rather than invented: in this world a thing you press
// is DRIFTWOOD (that is what `MQAnswerTile` is) and a thing that names something
// is a CARVED TAG ON A ROPE (that is what `MQTag` is). So the keys are small
// driftwood tiles and the units are tags. Nothing here is a rounded rectangle
// with a grey shadow.
// =============================================================================

/// The answer slot: what the child has entered, written on the board.
///
/// It is drawn as ink on the signboard's own parchment rather than as a text
/// field, because that is where the question is and a floating input box would
/// be the one piece of iOS chrome on an island. The unit, when a chip is chosen,
/// is set slightly lighter and a hair smaller - it is a *label on* the number,
/// not part of it, and the child chose them separately.
public struct QAnswerSlot: View {
    let p: MQPalette
    let entry: QTypedEntry
    let fontSize: CGFloat
    /// Drawn only while the child may still type. After an answer lands the slot
    /// is a record, and a blinking caret on a record is a lie.
    let active: Bool

    public init(_ p: MQPalette = .noon, entry: QTypedEntry,
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
public struct QUnitChipRow: View {
    let p: MQPalette
    let chips: [String]
    let selected: String?
    let compact: Bool
    let tap: (String) -> Void

    public init(_ p: MQPalette = .noon, chips: [String], selected: String?,
                compact: Bool = false, tap: @escaping (String) -> Void) {
        self.p = p; self.chips = chips; self.selected = selected
        self.compact = compact; self.tap = tap
    }

    /// The chip's own box. Returned from the screen's `tapTargets`, so a chip can
    /// never be shrunk under the 44 pt floor with the gate still green.
    nonisolated public static func chipSize(compact: Bool) -> CGSize {
        CGSize(width: compact ? 74 : 92, height: MQTap.min + (compact ? 2 : 8))
    }

    public var body: some View {
        HStack(spacing: compact ? 8 : 12) {
            Text(QStrings.unitRowPrompt)
                .font(.mq(compact ? 12 : 15, .medium))
                .foregroundStyle(p.inkSoft)
            ForEach(chips, id: \.self) { chip in
                Button { tap(chip) } label: { tag(chip) }
                    .buttonStyle(.plain)
            }
            Text(QStrings.unitOptional)
                .font(.mq(compact ? 11 : 14, .regular))
                .foregroundStyle(p.inkSoft.opacity(0.85))
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
/// TOPIC needs them (`QKeypadPolicy`, measured off all 250 generator refs) - and
/// `QUnitChipRow` beside it. The child taps a number, then taps a unit or leaves
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
public struct QKeypad: View {
    let p: MQPalette
    let entry: QTypedEntry
    let policy: QKeypadPolicy
    let metrics: QKeypad.Geo
    let press: (QTypedEntry.Key) -> Void
    let submit: () -> Void

    public init(_ p: MQPalette = .noon, entry: QTypedEntry, policy: QKeypadPolicy,
                geometry: QKeypad.Geo, press: @escaping (QTypedEntry.Key) -> Void,
                submit: @escaping () -> Void) {
        self.p = p; self.entry = entry; self.policy = policy
        self.metrics = geometry; self.press = press; self.submit = submit
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
    nonisolated public static func bottomKeys(_ policy: QKeypadPolicy) -> (QTypedEntry.Key?, QTypedEntry.Key?) {
        let left: QTypedEntry.Key? = policy.decimal ? .decimalPoint
            : (policy.minus ? .minus : nil)
        let right: QTypedEntry.Key? = policy.fraction ? .slash
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
                action(QStrings.backspace, primary: false) { press(.backspace) }
                    .frame(height: metrics.key.height)
                    .disabled(!entry.isEnabled(.backspace, policy: policy))
                    .opacity(entry.isEnabled(.backspace, policy: policy) ? 1 : 0.4)
                action(QStrings.submit, primary: true, action: submit)
                    .frame(maxHeight: .infinity)
                    .disabled(entry.isEmpty)
                    .opacity(entry.isEmpty ? 0.45 : 1)
            }
            .frame(width: metrics.actionWidth)
        }
        .frame(width: metrics.width, height: metrics.height)
    }

    @ViewBuilder private func slot(_ k: QTypedEntry.Key?) -> some View {
        if let k {
            key(k, label: Self.glyph(k))
        } else {
            // Kept as space, not collapsed: the zero stays under the 8 whatever
            // the topic's policy is, so a child moving between islands does not
            // find the digits have shuffled.
            Color.clear.frame(width: metrics.key.width, height: metrics.key.height)
        }
    }

    nonisolated public static func glyph(_ k: QTypedEntry.Key) -> String {
        switch k {
        case .digit(let d): return "\(d)"
        case .decimalPoint: return "."
        case .slash: return "/"
        case .minus: return "-"
        case .backspace: return QStrings.backspace
        case .clear: return "C"
        }
    }

    private func key(_ k: QTypedEntry.Key, label: String) -> some View {
        let enabled = entry.isEnabled(k, policy: policy)
        return Button { press(k) } label: {
            // The answer tile's own material at keypad size, and NO tilt: the
            // hand-placed wobble is the answer tile's signature, and a wobbling
            // digit key reads as a loose button rather than as driftwood.
            //
            // The point and the slash are set LARGER than the digits. At the
            // digit size a full stop is four pixels of ink on a 68 pt plank and
            // reads as a blank key - which is what the first driven PNG showed.
            MQAnswerTile(p, label, tilt: 0,
                         fontSize: label.count == 1 && !label.first!.isNumber
                             ? metrics.glyph * 1.45 : metrics.glyph)
                .frame(width: metrics.key.width, height: metrics.key.height)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.42)
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
