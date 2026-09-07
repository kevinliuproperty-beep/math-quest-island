import SwiftUI

/// DIRECTION B -- Quest battle, arcade.
///
///     wide (iPad landscape)
///     +--------------------------------------------------------------+
///     | CHARLOTTE 76 [||||====]   > > > > > >   [====||||] 44 SKITTERS|
///     |                          (flame 7) (||)                       |
///     |                                                               |
///     |   (unicorn)      [ ==== THE BANNER ==== ]      (crab, flashing)|
///     |                     question + wireframe                      |
///     |   [  slab  ]   [  slab  ]   [  slab  ]   [  slab  ]           |
///     +--------------------------------------------------------------+
///
/// The two health bars are pinned to the outer corners and grow inward from
/// their own fighter, which is the convention every fighting game uses and the
/// reason a child never has to ask which bar is theirs.
public struct ArcadeBattleScreen: View {
    let scene: MQScene
    let layout: MQLayout
    let insets: MQInsets
    let p = ArcadePalette.standard

    public init(scene: MQScene = .sample, layout: MQLayout, insets: MQInsets = .none) {
        self.scene = scene; self.layout = layout; self.insets = insets
    }

    private var compact: Bool { layout == .tall }
    private var pad: CGFloat { compact ? 16 : 28 }

    public var body: some View {
        ZStack {
            ArcadeWorld(p, horizonAt: compact ? 0.42 : 0.52)
            switch layout {
            case .wide: wide
            case .tall: tall
            }
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 16) {
            hud
            arena
            answerRow
        }
        .padding(.horizontal, pad)
        .padding(.top, insets.top + pad * 0.6)
        .padding(.bottom, insets.bottom + pad * 0.6)
    }

    private var hud: some View {
        HStack(alignment: .top, spacing: 22) {
            ArcadeHealthBar(p, name: scene.heroName, value: scene.heroHP,
                            readout: scene.heroHPReadout, side: .hero)
                .frame(width: 330)
            Spacer(minLength: 0)
            VStack(spacing: 10) {
                ArcadeProgressPips(p, filled: scene.crystals, total: scene.crystalsTotal, size: 24)
                HStack(spacing: 12) {
                    ArcadeStreakChip(p, streak: scene.streak, size: 40)
                    ArcadePauseKey(p, size: 46)
                }
            }
            Spacer(minLength: 0)
            ArcadeHealthBar(p, name: scene.monsterName, value: scene.monsterHP,
                            ghost: scene.monsterHPGhost, readout: scene.monsterHPReadout,
                            side: .monster, flashing: true)
                .frame(width: 330)
        }
        .frame(height: 96)
    }

    private var arena: some View {
        HStack(spacing: 22) {
            ArcadeUnicorn(p)
                .frame(width: 256, height: 256 * 250 / 250)
                .frame(maxHeight: .infinity, alignment: .bottom)
            banner
            ArcadeCrab(p, flash: 0.55)
                .frame(width: 258, height: 258 * 210 / 230)
                // Anchored to the shell, not to the arena: a damage number
                // that floats off into space explains nothing.
                .overlay(alignment: .top) {
                    ArcadeDamagePop(p, amount: scene.lastDamage, size: 46)
                        .offset(x: 52, y: -34)
                }
                .frame(maxHeight: .infinity, alignment: .bottom)
        }
        .frame(maxHeight: .infinity)
    }

    private var banner: some View {
        ArcadeBanner(p) {
            VStack(spacing: 18) {
                Text(scene.question)
                    .font(.custom(MQFonts.Fredoka.semibold, size: 39))
                    .foregroundStyle(p.text)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                ArcadeRectFigure(p, long: "14 cm", wide: "9 cm")
                    .frame(height: 168)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var answerRow: some View {
        HStack(spacing: 18) {
            ForEach(Array(scene.answers.enumerated()), id: \.offset) { _, a in
                ArcadeAnswerSlab(p, a, fontSize: 40)
            }
        }
        .frame(height: 118)
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: compact ? 12 : 20) {
            compactHUD
            ArcadeBanner(p) {
                VStack(spacing: compact ? 12 : 18) {
                    Text(scene.question)
                        .font(.custom(MQFonts.Fredoka.semibold, size: compact ? 25 : 35))
                        .foregroundStyle(p.text)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                    ArcadeRectFigure(p, long: "14 cm", wide: "9 cm")
                        .frame(height: compact ? 88 : 130)
                }
            }
            Spacer(minLength: 0)
            facingBand
            Spacer(minLength: 0)
            answerGrid
        }
        .padding(.horizontal, pad)
        .padding(.top, insets.top + pad * 0.4)
        .padding(.bottom, insets.bottom + pad * 0.4)
    }

    private var compactHUD: some View {
        VStack(spacing: compact ? 8 : 12) {
            HStack(alignment: .center, spacing: 10) {
                ArcadeNamePlate(p, name: scene.heroName, sub: scene.level,
                                tint: p.mint, compact: compact)
                Spacer(minLength: 4)
                ArcadeStreakChip(p, streak: scene.streak, size: compact ? 34 : 42)
                ArcadePauseKey(p, size: compact ? 38 : 46)
            }
            HStack(spacing: 12) {
                // "YOU", not the name again: the plate above already says who
                // you are, and a child reading their own name twice in 40pt of
                // chrome is reading nothing.
                ArcadeHealthBar(p, name: "You", value: scene.heroHP,
                                readout: scene.heroHPReadout, side: .hero, compact: compact)
                ArcadeHealthBar(p, name: scene.monsterName, value: scene.monsterHP,
                                ghost: scene.monsterHPGhost, readout: scene.monsterHPReadout,
                                side: .monster, flashing: true, compact: compact)
            }
            ArcadeProgressPips(p, filled: scene.crystals, total: scene.crystalsTotal,
                               size: compact ? 18 : 24)
        }
    }

    private var facingBand: some View {
        HStack(alignment: .bottom, spacing: 0) {
            ArcadeUnicorn(p)
                .frame(width: compact ? 150 : 220, height: (compact ? 150 : 220) * 250 / 250)
            Spacer(minLength: 0)
            ArcadeCrab(p, flash: 0.55)
                .frame(width: compact ? 160 : 235, height: (compact ? 160 : 235) * 210 / 230)
                .overlay(alignment: .top) {
                    ArcadeDamagePop(p, amount: scene.lastDamage, size: compact ? 30 : 42)
                        .offset(x: compact ? 36 : 48, y: compact ? -22 : -30)
                }
        }
    }

    private var answerGrid: some View {
        let gap: CGFloat = compact ? 12 : 18
        return VStack(spacing: gap) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: gap) {
                    ForEach(0..<2, id: \.self) { col in
                        ArcadeAnswerSlab(p, scene.answers[row * 2 + col],
                                         fontSize: compact ? 30 : 36)
                            .frame(height: compact ? 88 : 108)
                    }
                }
            }
        }
    }
}
