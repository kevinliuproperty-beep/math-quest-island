import SwiftUI

/// The problem itself, set on parchment.
///
/// There is exactly ONE of these in the system, and every screen that shows a
/// question goes through it -- Quest battle (both layouts), Patchwerk (both
/// layouts) and the end-of-set review rows. That is the whole reason it exists:
/// the typesetting rules for maths prose are not per-screen taste, and a rule
/// applied in three places out of four is a rule that fails on the fourth.
///
/// What it enforces:
///
///  * **A number never leaves its unit on the next line.** `MQTypeset.bindUnits`
///    binds "14 cm" with U+00A0 before the text ever reaches the line breaker.
///    See that file for why the unit vocabulary is explicit.
///  * **Ink on parchment, one weight, negative leading.** Baloo 2 has a very
///    tall x-height, so the default line gap opens a question into a paragraph.
///  * **It never grows greedily in height.** `fixedSize(horizontal:vertical:)`
///    with the vertical axis free is what lets the signboard be sized to its
///    content rather than to the biggest question the engine might ever emit.
///
/// Deliberately NOT here: `minimumScaleFactor`. Shrinking the question to fit is
/// the failure the unconstrained fit gate exists to catch; if a question does
/// not fit, the composition is wrong and the build should go red rather than
/// quietly setting a P5 word problem at 19 pt.
public struct MQQuestionText: View {
    let p: MQPalette
    let text: String
    let size: CGFloat
    let alignment: TextAlignment

    public init(_ p: MQPalette = .noon, _ text: String,
                size: CGFloat, alignment: TextAlignment = .leading) {
        self.p = p; self.text = text; self.size = size; self.alignment = alignment
    }

    public var body: some View {
        Text(MQTypeset.bindUnits(text))
            .font(.mq(size, .semibold))
            .foregroundStyle(p.ink)
            .multilineTextAlignment(alignment)
            .lineSpacing(-1)
            .fixedSize(horizontal: false, vertical: true)
    }
}
