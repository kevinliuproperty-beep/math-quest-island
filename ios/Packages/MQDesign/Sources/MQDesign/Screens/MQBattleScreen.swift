import SwiftUI

/// Quest battle, mid-question.
///
///     wide (iPad landscape)
///     +----------------------------------------------------------------+
///     | [name tag]      ~~ crystals on a spar ~~     (lantern) (pause)  |
///     |                                                                |
///     |   [gauge]        +----------------------+       [name][gauge]  |
///     |  (unicorn)       | question | figure    |         (crab)       |
///     |    .....         +--- posts in sand ----+          .....       |
///     |  [  tile  ]   [  tile  ]   [  tile  ]   [  tile  ]             |
///     +----------------------------------------------------------------+
///
/// **The mass fix.** The first storybook pass put a full-width board in the
/// middle of the frame with the question centred over a fixed 168pt figure slot.
/// That board was 418pt of an 834pt screen -- the largest, brightest and
/// flattest object in the picture -- and it pushed the two creatures out to the
/// margins as decoration while the composition claimed they were the battle.
///
/// Two changes, both compositional rather than decorative:
///
///  1. **The board is capped and sized to content.** It is at most 620pt wide
///     (was full width), the question and the figure sit SIDE BY SIDE rather
///     than stacked, and the figure slot is the size of the figure. Height
///     418 -> 218pt: the board went from ~26% of the frame's area to ~11%.
///  2. **The cast moved into the scene.** The creatures went 232 -> 300pt (~29%
///     larger), they stand on the dry sand nearer the child while the board's
///     posts are further up the beach, and they overlap the board's outer edges
///     -- drawn after it, so they are IN FRONT. Overlap is what turns two rails
///     and a card into one place. The board's 40pt inner margin is what keeps
///     that overlap off the words.
public struct MQBattleScreen: View {
    let scene: MQBattleScene
    let layout: MQLayout
    let insets: MQInsets
    let p: MQPalette

    public init(scene: MQBattleScene = .sample, layout: MQLayout,
                insets: MQInsets = .none, palette: MQPalette = .noon) {
        self.scene = scene; self.layout = layout
        self.insets = insets; self.p = palette
    }

    private var compact: Bool { layout == .tall }
    private var pad: CGFloat { compact ? 16 : 30 }
    private var type: MQType { compact ? .compact : .regular }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: compact ? 0.28 : 0.30)
            switch layout {
            case .wide: wide
            case .tall: tall
            }
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 16) {
            topRail
            ZStack(alignment: .bottom) {
                // Drawn FIRST, so the cast is in front of it. The board also
                // sits further UP the beach -- its posts are in the wet sand,
                // the creatures are on the dry sand nearer the child -- which is
                // what lets them overlap its outer edges without ever crossing
                // the parchment the question is written on.
                sign
                    .frame(maxWidth: 620)
                    .padding(.bottom, 84)
                HStack(alignment: .bottom, spacing: 0) {
                    heroColumn(width: 300)
                    Spacer(minLength: 0)
                    monsterColumn(width: 300)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            answerRow
        }
        .padding(.horizontal, pad)
        .padding(.top, insets.top + pad * 0.7)
        .padding(.bottom, insets.bottom + pad * 0.7)
    }

    private var topRail: some View {
        HStack(alignment: .center, spacing: 18) {
            MQNameTag(p, name: scene.heroName, level: scene.level, quest: scene.questName)
            Spacer(minLength: 12)
            MQCrystalRope(p, filled: scene.crystals, total: scene.crystalsTotal, shell: 32)
                .frame(width: 270, height: 52)
            Spacer(minLength: 12)
            MQLantern(p, streak: scene.streak, size: 58)
            MQKnob(p, .pause, size: 54)
        }
        .frame(height: 62)
    }

    /// Each fighter's gauge is pushed to the OUTSIDE of its own column. Centred,
    /// it drifted inward over the signboard's frame and read as debris lying on
    /// the paper; against the frame edge it reads as that fighter's own kit.
    private func heroColumn(width: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            MQGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                    side: .hero, height: 28)
                .frame(width: width * 0.80)
            MQCreature(scene.heroCast, p)
                .frame(width: width, height: width * MQCreature.box(scene.heroCast).height
                                                  / MQCreature.box(scene.heroCast).width)
        }
        .frame(width: width, alignment: .leading)
    }

    private func monsterColumn(width: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 6) {
            MQMonsterName(p, name: scene.monsterName, size: 21)
            MQGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                    side: .monster, height: 28)
                .frame(width: width * 0.80)
            MQCreature(.crab, p)
                .frame(width: width, height: width * MQCrab.box.height / MQCrab.box.width)
        }
        .frame(width: width, alignment: .trailing)
    }

    /// Question left, figure right. Stacking them is what made the parchment
    /// tall; side by side, the sheet is only as deep as the diagram.
    private var sign: some View {
        // A generous horizontal margin is load-bearing, not decoration: it is
        // the reason a creature can stand in front of the board's outer edge
        // without ever landing on the words.
        MQSign(p, postHeight: 46, padH: 40, padV: 18) {
            HStack(alignment: .center, spacing: 22) {
                Text(scene.question)
                    .font(.mq(type.question, .semibold))
                    .foregroundStyle(p.ink)
                    .multilineTextAlignment(.leading)
                    .lineSpacing(-1)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if scene.figure != .none {
                    MQFigureView(p, scene.figure)
                        .frame(width: 190, height: 130)
                }
            }
        }
    }

    private var answerRow: some View {
        HStack(spacing: 18) {
            ForEach(Array(scene.answers.enumerated()), id: \.offset) { i, a in
                MQAnswerTile(p, a, tilt: MQAnswerTile.tilts[i % 4], fontSize: type.tile)
            }
        }
        .frame(height: 104)
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: 8) {
            compactRail
            MQSign(p, postHeight: 20, padH: 22, padV: 9) {
                VStack(spacing: 6) {
                    Text(scene.question)
                        .font(.mq(type.question, .semibold))
                        .foregroundStyle(p.ink)
                        .multilineTextAlignment(.center)
                        .lineSpacing(-1)
                        .fixedSize(horizontal: false, vertical: true)
                    if scene.figure != .none {
                        MQFigureView(p, scene.figure)
                            .frame(width: 190, height: 86)
                    }
                }
            }
            Spacer(minLength: 0)
            facingBand
            Spacer(minLength: 0)
            answerGrid
        }
        .padding(.horizontal, pad)
        .padding(.top, insets.top + pad * 0.5)
        .padding(.bottom, insets.bottom + pad * 0.5)
    }

    private var compactRail: some View {
        VStack(spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                MQNameTag(p, name: scene.heroName, level: scene.level,
                          quest: scene.questName, compact: true)
                Spacer(minLength: 6)
                MQLantern(p, streak: scene.streak, size: 38)
                MQKnob(p, .pause, size: 44)
            }
            MQCrystalRope(p, filled: scene.crystals, total: scene.crystalsTotal, shell: 19)
                .frame(height: 27)
        }
    }

    private var facingBand: some View {
        HStack(alignment: .bottom, spacing: 4) {
            VStack(spacing: 6) {
                MQGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                        side: .hero, height: 20)
                    .frame(width: 140)
                MQCreature(scene.heroCast, p)
                    .frame(width: 148, height: 148 * MQCreature.box(scene.heroCast).height
                                                   / MQCreature.box(scene.heroCast).width)
            }
            Spacer(minLength: 0)
            VStack(spacing: 4) {
                MQMonsterName(p, name: scene.monsterName, size: 15)
                MQGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                        side: .monster, height: 20)
                    .frame(width: 140)
                MQCreature(.crab, p)
                    .frame(width: 162, height: 162 * MQCrab.box.height / MQCrab.box.width)
            }
        }
    }

    private var answerGrid: some View {
        VStack(spacing: 12) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(0..<2, id: \.self) { col in
                        let i = row * 2 + col
                        MQAnswerTile(p, scene.answers[i], tilt: MQAnswerTile.tilts[i],
                                     fontSize: type.tile)
                            .frame(height: 72)
                    }
                }
            }
        }
    }
}
