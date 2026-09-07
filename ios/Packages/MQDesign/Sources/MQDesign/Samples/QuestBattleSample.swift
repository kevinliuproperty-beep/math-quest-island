import SwiftUI

/// The sample screen for the taste gate: Quest mode, mid-question.
///
/// Composition, wide (landscape iPad) -- the BATTLE LINE:
///
///     +-------------------------------------------------------+
///     | (o) Charlotte  [ crystals ]      (7)fire   [ || ]      |
///     +-------------------------------------------------------+
///     |  (hero)    +-----------------------+     (monster)     |
///     |   name     |  the problem, on sand |      name         |
///     |  [==hp==]  |  [ figure slot      ] |     [==hp==]      |
///     +-------------------------------------------------------+
///     |  [ 46 cm ]  [ 23 cm ]  [ 126 cm ]  [ 32 cm ]           |
///     +-------------------------------------------------------+
///
/// You on the left, the monster on the right, the problem between you, and the
/// four answers along the bottom under both thumbs. The answer IS the attack,
/// so it sits where a weapon would.
///
/// Tall (iPad portrait, iPhone) collapses the two rails into one facing band
/// and the answers into a 2x2 grid. Nothing scrolls. A battle screen that
/// scrolls is a worksheet.
public struct QuestBattleSample: View {
    public enum Layout { case wide, tall }

    @Environment(\.mqTheme) private var theme

    private let layout: Layout
    private let safeTop: CGFloat
    private let safeBottom: CGFloat

    public init(layout: Layout, safeTop: CGFloat = 0, safeBottom: CGFloat = 0) {
        self.layout = layout
        self.safeTop = safeTop
        self.safeBottom = safeBottom
    }

    // The scene. Real P4 content: a perimeter question whose wrong options are
    // the mistakes a child actually makes (area, half-perimeter, three sides).
    private let question = "The rectangle below is 14 cm long and 9 cm wide. What is its perimeter?"
    private let answers = ["46 cm", "23 cm", "126 cm", "32 cm"]

    private var outerPad: CGFloat { theme.isCompact ? theme.space.m : theme.space.xl }
    private var gap: CGFloat { theme.isCompact ? theme.space.m : theme.space.l }

    public var body: some View {
        ZStack {
            MQSky()
            content
        }
    }

    private var content: some View {
        VStack(spacing: gap) {
            MQTopBar(
                heroSprite: "🦄", heroName: "Charlotte", level: "P4",
                questName: "Shape Shore", crystals: 3, crystalsTotal: 6, streak: 7
            )

            switch layout {
            case .wide: wideBody
            case .tall: tallBody
            }
        }
        .padding(.horizontal, outerPad)
        .padding(.top, safeTop + outerPad)
        .padding(.bottom, safeBottom + outerPad)
    }

    // MARK: Wide

    private var wideBody: some View {
        VStack(spacing: gap) {
            Spacer(minLength: 0)

            HStack(alignment: .top, spacing: gap) {
                // No name on your own rail: it is already on the top bar, and a
                // child does not need telling who they are.
                rail(sprite: "🦄", name: nil, value: 0.76,
                     readout: "76", role: .hero, segments: 8)

                MQQuestionCard(question: question, figureMinHeight: 170)

                rail(sprite: "🕷️", name: "Skitters", value: 0.55,
                     readout: "44", role: .monster, segments: 6)
            }

            Spacer(minLength: 0)

            HStack(spacing: gap) {
                ForEach(answers, id: \.self) { a in
                    MQAnswerButton(a)
                }
            }
            .frame(height: 108)
        }
    }

    private func rail(sprite: String, name: String?, value: Double,
                      readout: String, role: MQBar.Role, segments: Int) -> some View {
        VStack(spacing: theme.space.m) {
            MQAvatar(sprite: sprite, size: 128,
                     ring: role.isMonster ? theme.palette.coral.opacity(0.30)
                                          : theme.palette.lagoon.opacity(0.30))
            MQVitals(name: name, value: value, readout: readout,
                     role: role, segments: segments, barHeight: 22)
        }
        .frame(width: 176)
    }

    // MARK: Tall

    private var tallBody: some View {
        VStack(spacing: gap) {
            facingBand

            MQQuestionCard(question: question,
                           figureMinHeight: theme.isCompact ? 96 : 170,
                           figureGrows: true)

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: gap),
                          GridItem(.flexible(), spacing: gap)],
                spacing: gap
            ) {
                ForEach(answers, id: \.self) { a in
                    MQAnswerButton(a).frame(height: theme.isCompact ? 92 : 112)
                }
            }
        }
    }

    private var facingBand: some View {
        HStack(alignment: .center, spacing: theme.space.m) {
            HStack(spacing: theme.space.s) {
                MQAvatar(sprite: "🦄", size: theme.isCompact ? 54 : 76,
                         ring: theme.palette.lagoon.opacity(0.30))
                MQVitals(name: nil, value: 0.76, readout: "76",
                         role: .hero, segments: 8,
                         barHeight: theme.isCompact ? 16 : 20)
            }

            HStack(spacing: theme.space.s) {
                MQVitals(name: "Skitters", value: 0.55, readout: "44",
                         role: .monster, segments: 6,
                         barHeight: theme.isCompact ? 16 : 20)
                MQAvatar(sprite: "🕷️", size: theme.isCompact ? 54 : 76,
                         ring: theme.palette.coral.opacity(0.30))
            }
        }
    }
}

private extension MQBar.Role {
    var isMonster: Bool {
        if case .monster = self { return true }
        return false
    }
}
