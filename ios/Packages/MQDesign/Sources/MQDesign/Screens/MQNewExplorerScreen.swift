import SwiftUI
import MQContent

/// The sheet the entrance's `+` token opens.
///
/// # Why this screen exists at all
///
/// It did not, and the `+` did nothing. `QEntranceView.token` was
/// `Button { guard let profile else { return } ... }`, so the empty slot's
/// action returned immediately, and nothing anywhere in the app called
/// `addProfile`. **A parent on a fresh install landed on an entrance with one
/// dead `+` and could not start.** Every driven run and every harness in the
/// project injected profiles into the store directly, which is exactly why
/// nobody had met it (Phase 1 dress rehearsal, leg 1).
///
/// # Why it is this small
///
/// Two questions and a plank. There is **no name field**, because a keyboard on
/// this screen is the one thing here that would need an adult: the store names a
/// new child "Explorer", keeps display names unique ("Explorer 2"), and
/// `ProgressStore.rename` already exists for the parent screen MQApp will draw.
/// A child can start playing in four taps.
///
/// PHASE1.md section 4 lists "profile creation (MQApp)" among the screens not
/// yet drawn. This is the minimum that makes the front door WORK on Kai, drawn
/// out of components that are already gated, and MQApp is free to replace it -
/// but it may not go back to a `+` that does nothing.
///
/// Composition is the entrance's, deliberately: the same world, the same beach
/// camp, the same carved discs. A child who taps `+` should not feel they have
/// left the island.
public struct MQNewExplorerScreen: View, MQTapAudited {
    let scene: MQNewExplorerScene
    let m: MQMetrics
    let p: MQPalette

    public init(scene: MQNewExplorerScene = .sample, metrics: MQMetrics,
                palette: MQPalette = .noon) {
        self.scene = scene; self.m = metrics; self.p = palette
    }

    private var g: Geo { Self.geometry(m) }
    private var type: MQType { m.type }

    // MARK: - Geometry

    public struct Geo: Sendable, Equatable {
        public var pad: CGFloat
        public var horizon: CGFloat
        /// The creature disc a child taps to choose their cast.
        public var castDisc: CGFloat
        /// One class-level plank.
        public var levelPlank: CGSize
        public var spacing: CGFloat
    }

    /// Everything interactive on this screen is sized here and drawn from here,
    /// so `tapTargets` and `body` cannot drift - the rule PHASE1.md sets for any
    /// new interactive element.
    nonisolated public static func geometry(_ m: MQMetrics) -> Geo {
        let pad: CGFloat = m.isRegular ? 34 : 18
        let contentW = m.size.width - pad * 2
        let spacing: CGFloat = m.isRegular ? 26 : 14
        // Three creatures across, always: three is a row at every width in the
        // matrix, and a 2 + 1 wrap would make the third creature look like an
        // afterthought rather than an equal choice.
        let disc = min(m.isRegular ? 150 : 96,
                       (contentW - spacing * 2) / 3)
        // Four class levels across - the authored count, and the count the tap
        // audit measures. A build whose catalogue offers three re-divides the
        // same row and every plank gets WIDER, so the audited width is the
        // narrowest a plank can ever be. On the narrowest screen in the matrix
        // (iPhone SE, 375 pt) it is 4 x 76 pt, well over the 44 pt floor.
        let planks = max(MQNewExplorerScene.authoredLevelCount, 1)
        let plankW = max((contentW - spacing * CGFloat(planks - 1)) / CGFloat(planks),
                         MQTap.min)
        return Geo(pad: pad,
                   horizon: m.isWide ? 0.40 : (m.isRegular ? 0.38 : 0.34),
                   castDisc: disc,
                   levelPlank: CGSize(width: plankW, height: m.isRegular ? 62 : 50),
                   spacing: spacing)
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let g = geometry(m)
        return (0..<MQNewExplorerScene.casts.count).map {
            MQTapTarget("creature \($0 + 1)", square: g.castDisc)
        }
            + (0..<MQNewExplorerScene.authoredLevelCount).map {
                MQTapTarget("level \($0 + 1)", g.levelPlank)
            }
            + [MQTapTarget("start", CGSize(width: 132, height: MQTap.min)),
               MQTapTarget("back", CGSize(width: 108, height: MQTap.min))]
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: g.horizon)
            MQBeachCamp(p, horizon: g.horizon, compact: !m.isRegular)
            VStack(spacing: m.isRegular ? 18 : 10) {
                title
                Spacer(minLength: 0)
                prompt(scene.castPrompt)
                castRow
                Spacer(minLength: 0)
                prompt(scene.levelPrompt)
                levelRow
                Spacer(minLength: 0)
                buttons
            }
            .padding(.horizontal, g.pad)
            .padding(.top, m.insets.top + g.pad * 0.6)
            .padding(.bottom, m.insets.bottom + g.pad * 0.6)
        }
    }

    private var title: some View {
        Text(scene.title)
            .font(.mq(type.title, .extrabold))
            .foregroundStyle(p.carved)
            .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 3)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }

    private func prompt(_ text: String) -> some View {
        Text(text)
            .font(.mq(m.isRegular ? 19 : 14, .bold))
            .foregroundStyle(p.carved.opacity(0.94))
            .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 2)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    private var castRow: some View {
        HStack(spacing: g.spacing) {
            ForEach(Array(MQNewExplorerScene.casts.enumerated()), id: \.offset) { i, cast in
                Self.castDisc(p, cast: cast, chosen: cast == scene.cast,
                              diameter: g.castDisc)
                    .overlay { MQProbe.screenTint(i) }
            }
        }
    }

    /// A carved disc with the creature on it. The chosen one is ringed in gold -
    /// the same gold the crystals use, which is this island's only "yes".
    ///
    /// Static and public because `MQQuest.QNewExplorerView` puts a Button round
    /// this exact drawing: one drawing, used by the storybook screen the matrix
    /// gate measures AND by the interactive screen a child taps, so the gate can
    /// never be measuring something the child does not get.
    public static func castDisc(_ p: MQPalette, cast: MQCast, chosen: Bool,
                                diameter: CGFloat) -> some View {
        ZStack {
            Canvas { ctx, size in
                let c = CGPoint(x: size.width / 2, y: size.height / 2)
                let r = min(size.width, size.height) / 2
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r + 5,
                                                width: r * 2, height: r * 2)),
                         with: .color(p.woodDeep.opacity(0.45)))
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r,
                                                width: r * 2, height: r * 2)),
                         with: .linearGradient(
                            Gradient(colors: [p.woodLight, p.wood, p.woodDark]),
                            startPoint: CGPoint(x: c.x - r, y: c.y - r),
                            endPoint: CGPoint(x: c.x + r * 0.4, y: c.y + r)))
                ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r + 2, y: c.y - r + 2,
                                                  width: r * 2 - 4, height: r * 2 - 4)),
                           with: .color(chosen ? p.gold : p.woodDeep.opacity(0.8)),
                           lineWidth: chosen ? 5.5 : 3.4)
            }
            MQCreature(cast, p)
                .frame(width: diameter * 0.78, height: diameter * 0.78)
        }
        .frame(width: diameter, height: diameter)
    }

    private var levelRow: some View {
        HStack(spacing: g.spacing) {
            ForEach(Array(scene.levels.enumerated()), id: \.offset) { i, level in
                Self.levelPlank(p, level: level, chosen: level == scene.level,
                                size: g.levelPlank, compact: !m.isRegular)
                    .overlay { MQProbe.screenTint(i + 3) }
            }
        }
    }

    /// One class-level plank. Static for the same reason as `castDisc`.
    public static func levelPlank(_ p: MQPalette, level: String, chosen: Bool,
                                  size: CGSize, compact: Bool) -> some View {
        Text(level)
            .font(.mq(compact ? 19 : 26, chosen ? .extrabold : .bold))
            .foregroundStyle(chosen ? p.underLight(Color(hex: 0x40270A)) : p.carved)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(width: size.width, height: size.height)
            .background {
                Canvas { ctx, size in
                    let r = CGRect(x: 0, y: 0, width: size.width, height: size.height - 5)
                    ctx.fill(Path(roundedRect: CGRect(x: 0, y: 3, width: size.width,
                                                      height: size.height - 3),
                                  cornerRadius: 13),
                             with: .color(chosen ? p.goldDeep : p.woodDeep))
                    ctx.fill(Path(roundedRect: r, cornerRadius: 13),
                             with: .linearGradient(
                                Gradient(colors: chosen
                                         ? [p.gold.lit(0.25), p.gold, p.goldDeep]
                                         : [p.wood, p.woodDark]),
                                startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                    ctx.stroke(Path(roundedRect: r.insetBy(dx: 1.2, dy: 1.2), cornerRadius: 13),
                               with: .color(chosen ? p.goldDeep : p.woodDeep.opacity(0.85)),
                               lineWidth: 2)
                }
            }
    }

    private var buttons: some View {
        HStack(spacing: m.isRegular ? 20 : 12) {
            MQPlankButton(p, scene.backLabel, fontSize: m.isRegular ? 20 : 16)
                .overlay { MQProbe.screenTint(8) }
            MQPlankButton(p, scene.startLabel, primary: true,
                          fontSize: m.isRegular ? 24 : 18)
                .overlay { MQProbe.screenTint(9) }
        }
    }
}

/// Everything `MQNewExplorerScreen` renders. A value, so the gate and the driver
/// can put the screen in any state without walking the UI.
public struct MQNewExplorerScene: Sendable, Equatable {
    public var title: String
    public var castPrompt: String
    public var levelPrompt: String
    public var startLabel: String
    public var backLabel: String
    public var cast: MQCast
    public var level: String
    /// The class levels on offer. Read off the engine's catalogue by the model,
    /// never hard-coded here - a level with no live node must not be offered.
    public var levels: [String]

    public init(title: String, castPrompt: String, levelPrompt: String,
                startLabel: String, backLabel: String,
                cast: MQCast, level: String, levels: [String]) {
        self.title = title; self.castPrompt = castPrompt
        self.levelPrompt = levelPrompt; self.startLabel = startLabel
        self.backLabel = backLabel
        self.cast = cast; self.level = level; self.levels = levels
    }

    /// The three a child may be. `crab` is the monster and is never offered -
    /// `MQCast.allCases` includes it, which is why this list is written out.
    public static let casts: [MQCast] = [.unicorn, .turtle, .octopus]

    /// P3, P4, P5, P6 - what the engine's catalogue carries today, and the count
    /// the geometry is authored against. The MODEL supplies the real list off the
    /// catalogue; this is the number the tap audit measures the narrowest plank
    /// with. See `MQNewExplorerScreen.geometry`.
    public static let authoredLevelCount = 4

    public static let sample = MQNewExplorerScene(
        title: "Who is playing?",
        castPrompt: "Pick your creature.",
        levelPrompt: "Pick your class.",
        startLabel: "Start", backLabel: "Back",
        cast: .unicorn, level: "P4",
        levels: ["P3", "P4", "P5", "P6"])
}
