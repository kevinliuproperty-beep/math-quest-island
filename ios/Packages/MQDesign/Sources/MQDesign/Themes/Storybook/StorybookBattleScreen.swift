import SwiftUI

/// DIRECTION A -- Quest battle, storybook island.
///
///     wide (iPad landscape)
///     +--------------------------------------------------------------+
///     | [name tag]        ~~ shells on a rope ~~      (lantern) (knob)|
///     |                                                              |
///     |  [gauge]              [ the SIGN ]              [name][gauge] |
///     |                    question + figure                          |
///     |  (unicorn) ......... posts in sand ......... (crab)           |
///     |  [ tile ]   [ tile ]   [ tile ]   [ tile ]                    |
///     +--------------------------------------------------------------+
///
/// The creatures stand ON the beach -- their feet are below the wet-sand line,
/// they cast shadows onto it, and the sign's posts are buried in it. That is
/// the whole difference between an illustrated world and an illustration used
/// as wallpaper behind a form.
public struct StorybookBattleScreen: View {
    let scene: MQScene
    let layout: MQLayout
    let insets: MQInsets
    let p = StorybookPalette.noon

    public init(scene: MQScene = .sample, layout: MQLayout, insets: MQInsets = .none) {
        self.scene = scene; self.layout = layout; self.insets = insets
    }

    private var compact: Bool { layout == .tall }
    private var pad: CGFloat { compact ? 16 : 30 }

    public var body: some View {
        ZStack {
            StorybookWorld(p, horizon: compact ? 0.30 : 0.46)
            switch layout {
            case .wide: wide
            case .tall: tall
            }
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 18) {
            topRail
            HStack(alignment: .bottom, spacing: 20) {
                heroColumn(width: 232)
                sign
                monsterColumn(width: 232)
            }
            .frame(maxHeight: .infinity)
            answerRow
        }
        .padding(.horizontal, pad)
        .padding(.top, insets.top + pad * 0.7)
        .padding(.bottom, insets.bottom + pad * 0.7)
    }

    private var topRail: some View {
        HStack(alignment: .center, spacing: 18) {
            StorybookNameTag(p, name: scene.heroName, level: scene.level,
                             quest: scene.questName)
            Spacer(minLength: 12)
            StorybookShellRope(p, filled: scene.crystals, total: scene.crystalsTotal, shell: 32)
                .frame(width: 270, height: 52)
            Spacer(minLength: 12)
            StorybookLantern(p, streak: scene.streak, size: 58)
            StorybookPauseKnob(p, size: 54)
        }
        .frame(height: 62)
    }

    private func heroColumn(width: CGFloat) -> some View {
        VStack(spacing: 10) {
            StorybookGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                           side: .hero, height: 28)
            Spacer(minLength: 0)
            StorybookUnicorn(p).frame(width: width, height: width * 250 / 240)
        }
        .frame(width: width)
    }

    private func monsterColumn(width: CGFloat) -> some View {
        VStack(spacing: 8) {
            StorybookMonsterName(p, name: scene.monsterName, size: 21)
            StorybookGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                           side: .monster, height: 28)
            Spacer(minLength: 0)
            StorybookCrab(p).frame(width: width, height: width * 190 / 220)
        }
        .frame(width: width)
    }

    private var sign: some View {
        StorybookSign(p, postHeight: 48, padH: 30, padV: 22) {
            VStack(spacing: 14) {
                Text(scene.question)
                    .font(.custom(MQFonts.Baloo.semibold, size: 40))
                    .foregroundStyle(p.ink)
                    .multilineTextAlignment(.center)
                    .lineSpacing(-1)
                    .fixedSize(horizontal: false, vertical: true)
                StorybookRectFigure(p, long: "14 cm", wide: "9 cm")
                    .frame(height: 168)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var answerRow: some View {
        HStack(spacing: 18) {
            ForEach(Array(scene.answers.enumerated()), id: \.offset) { i, a in
                StorybookAnswerTile(p, a, tilt: Self.tilts[i % 4], fontSize: 36)
            }
        }
        .frame(height: 112)
    }

    /// Hand-placed, not machine-placed. Kept under 1.5 degrees so nothing can
    /// clip its neighbour or the safe area.
    static let tilts: [Double] = [-1.1, 0.7, -0.5, 1.2]

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: compact ? 12 : 20) {
            compactRail
            StorybookSign(p, postHeight: compact ? 22 : 44,
                          padH: compact ? 30 : 30, padV: compact ? 12 : 24) {
                VStack(spacing: compact ? 8 : 16) {
                    Text(scene.question)
                        .font(.custom(MQFonts.Baloo.semibold, size: compact ? 22 : 34))
                        .foregroundStyle(p.ink)
                        .multilineTextAlignment(.center)
                        .lineSpacing(-1)
                        .fixedSize(horizontal: false, vertical: true)
                    StorybookRectFigure(p, long: "14 cm", wide: "9 cm")
                        .frame(height: compact ? 92 : 136)
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
        VStack(spacing: compact ? 8 : 12) {
            HStack(alignment: .center, spacing: 10) {
                StorybookNameTag(p, name: scene.heroName, level: scene.level,
                                 quest: scene.questName, compact: compact)
                Spacer(minLength: 6)
                StorybookLantern(p, streak: scene.streak, size: compact ? 38 : 46)
                StorybookPauseKnob(p, size: compact ? 44 : 50)
            }
            StorybookShellRope(p, filled: scene.crystals, total: scene.crystalsTotal,
                               shell: compact ? 19 : 28)
                .frame(height: compact ? 27 : 44)
        }
    }

    private var facingBand: some View {
        HStack(alignment: .bottom, spacing: compact ? 6 : 16) {
            VStack(spacing: 6) {
                StorybookGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                               side: .hero, height: compact ? 20 : 26)
                StorybookUnicorn(p)
                    .frame(width: compact ? 108 : 190, height: (compact ? 108 : 190) * 250 / 240)
            }
            Spacer(minLength: 0)
            VStack(spacing: 4) {
                StorybookMonsterName(p, name: scene.monsterName, size: compact ? 15 : 19)
                StorybookGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                               side: .monster, height: compact ? 20 : 26)
                StorybookCrab(p)
                    .frame(width: compact ? 112 : 196, height: (compact ? 112 : 196) * 190 / 220)
            }
        }
    }

    private var answerGrid: some View {
        let gap: CGFloat = compact ? 12 : 18
        return VStack(spacing: gap) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: gap) {
                    ForEach(0..<2, id: \.self) { col in
                        let i = row * 2 + col
                        StorybookAnswerTile(p, scene.answers[i],
                                            tilt: Self.tilts[i],
                                            fontSize: compact ? 27 : 34)
                            .frame(height: compact ? 72 : 104)
                    }
                }
            }
        }
    }
}
