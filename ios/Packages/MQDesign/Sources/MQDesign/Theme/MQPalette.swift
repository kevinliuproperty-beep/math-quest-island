import SwiftUI

/// MQDesign's ONE palette: Shape Shore, lit.
///
/// This is not "six brand colours". It is a light study of one place, and every
/// value is named for the thing it is made of, because that is how an
/// illustrated world stays coherent when it is extended later -- a new prop asks
/// "what is it made of", not "which token do I use".
///
/// There are three times of day, not a light mode and a dark mode:
///
///   `.noon`   -- late afternoon, the default. Warm haze at the horizon.
///   `.dusk`   -- the same island after the sun has dropped. Lantern-lit, never
///                bleached, so bedtime play is not a flashbang.
///   `.enrage` -- dusk with a storm in it. Patchwerk's last twenty seconds.
///                The world itself is the enrage cue; no red border is needed.
///
/// Every value is a plain `Color`, never a dynamic system colour. Two reasons:
/// it renders deterministically under `ImageRenderer` on a headless box, and a
/// palette that is data can be diffed and snapshot-tested.
public struct MQPalette: Sendable, Equatable {

    // MARK: Air and light
    public var skyHigh: Color
    public var skyMid: Color
    public var skyLow: Color
    public var sunCore: Color
    public var sunHalo: Color
    public var cloud: Color
    public var cloudShade: Color

    // MARK: Distance
    // Each layer is pulled further toward `skyLow`, which is what aerial
    // perspective actually is.
    public var islandFar: Color
    public var islandMid: Color

    // MARK: Water
    public var seaDeep: Color
    public var seaMid: Color
    public var seaShallow: Color
    public var foam: Color

    // MARK: Ground
    public var sandFar: Color
    public var sandNear: Color
    public var sandShade: Color

    // MARK: Foreground silhouettes
    public var foliageNear: Color
    public var foliageMid: Color

    // MARK: Made things
    public var wood: Color
    public var woodLight: Color
    public var woodDark: Color
    public var woodDeep: Color
    public var rope: Color
    public var iron: Color
    public var parchment: Color
    public var parchmentEdge: Color

    /// Text burnt into wood, and the colour of every drawn edge. A warm brown --
    /// never black, never the violet of the rejected sample.
    public var ink: Color
    public var inkSoft: Color
    /// Text carved into a dark plank (readouts, answer tiles).
    public var carved: Color

    // MARK: Roles that must never drift
    /// Crystals, streak, the thing you collect. Also the only light source
    /// after dark, which is why it brightens at dusk instead of dimming.
    public var gold: Color
    public var goldDeep: Color
    /// Your health, your progress, correct. Only ever yours.
    public var leaf: Color
    public var leafDeep: Color
    /// The monster. Nothing else, ever.
    public var coral: Color
    public var coralDeep: Color
    /// Freeze credit. Cold, and the only cold colour in the system.
    public var frost: Color
    public var frostDeep: Color

    // MARK: Light behaviour
    /// How hard the scene is pulled down at the edges. Dusk needs more.
    public var vignette: Double
    /// True after sundown: the world draws stars, the lanterns actually throw
    /// light, and creature rim lights come from the lantern rather than the sun.
    public var isDusk: Bool

    public init(
        skyHigh: Color, skyMid: Color, skyLow: Color,
        sunCore: Color, sunHalo: Color, cloud: Color, cloudShade: Color,
        islandFar: Color, islandMid: Color,
        seaDeep: Color, seaMid: Color, seaShallow: Color, foam: Color,
        sandFar: Color, sandNear: Color, sandShade: Color,
        foliageNear: Color, foliageMid: Color,
        wood: Color, woodLight: Color, woodDark: Color, woodDeep: Color,
        rope: Color, iron: Color, parchment: Color, parchmentEdge: Color,
        ink: Color, inkSoft: Color, carved: Color,
        gold: Color, goldDeep: Color, leaf: Color, leafDeep: Color,
        coral: Color, coralDeep: Color, frost: Color, frostDeep: Color,
        vignette: Double, isDusk: Bool
    ) {
        self.skyHigh = skyHigh; self.skyMid = skyMid; self.skyLow = skyLow
        self.sunCore = sunCore; self.sunHalo = sunHalo
        self.cloud = cloud; self.cloudShade = cloudShade
        self.islandFar = islandFar; self.islandMid = islandMid
        self.seaDeep = seaDeep; self.seaMid = seaMid
        self.seaShallow = seaShallow; self.foam = foam
        self.sandFar = sandFar; self.sandNear = sandNear; self.sandShade = sandShade
        self.foliageNear = foliageNear; self.foliageMid = foliageMid
        self.wood = wood; self.woodLight = woodLight
        self.woodDark = woodDark; self.woodDeep = woodDeep
        self.rope = rope; self.iron = iron
        self.parchment = parchment; self.parchmentEdge = parchmentEdge
        self.ink = ink; self.inkSoft = inkSoft; self.carved = carved
        self.gold = gold; self.goldDeep = goldDeep
        self.leaf = leaf; self.leafDeep = leafDeep
        self.coral = coral; self.coralDeep = coralDeep
        self.frost = frost; self.frostDeep = frostDeep
        self.vignette = vignette; self.isDusk = isDusk
    }
}

public extension MQPalette {

    /// Shape Shore at about five o'clock.
    static let noon = MQPalette(
        skyHigh: Color(hex: 0x6FB4CF), skyMid: Color(hex: 0xA9D3D6), skyLow: Color(hex: 0xF6DCAE),
        sunCore: Color(hex: 0xFFF0C8), sunHalo: Color(hex: 0xFFD68E),
        cloud: Color(hex: 0xFFF3E2), cloudShade: Color(hex: 0xE7D2C0),
        islandFar: Color(hex: 0x9DB9BF), islandMid: Color(hex: 0x76A192),
        seaDeep: Color(hex: 0x3C7E96), seaMid: Color(hex: 0x4E9AA9),
        seaShallow: Color(hex: 0x86C6C1), foam: Color(hex: 0xF2F7EC),
        sandFar: Color(hex: 0xF0D5A6), sandNear: Color(hex: 0xE6C090), sandShade: Color(hex: 0xCBA470),
        foliageNear: Color(hex: 0x22463A), foliageMid: Color(hex: 0x36624C),
        wood: Color(hex: 0xB77E4A), woodLight: Color(hex: 0xD3A06B),
        woodDark: Color(hex: 0x8B5A32), woodDeep: Color(hex: 0x60381B),
        rope: Color(hex: 0xC9A76F), iron: Color(hex: 0x5C5346),
        parchment: Color(hex: 0xFBEFD5), parchmentEdge: Color(hex: 0xE9D5AE),
        ink: Color(hex: 0x3E2A1A), inkSoft: Color(hex: 0x8A6A4E), carved: Color(hex: 0xFFF4DF),
        gold: Color(hex: 0xEFA22C), goldDeep: Color(hex: 0xC77A18),
        leaf: Color(hex: 0x5AA55B), leafDeep: Color(hex: 0x3B7A45),
        coral: Color(hex: 0xD9583C), coralDeep: Color(hex: 0xA83B27),
        frost: Color(hex: 0x74D6E8), frostDeep: Color(hex: 0x2F8CA6),
        vignette: 0.20, isDusk: false
    )

    /// The same island an hour later. Not an inversion of noon: the sun has
    /// gone down behind the headland, the sea has lost its light, and the
    /// lanterns are now the only warm source. The parchment stays a light
    /// plane, because a maths question a child cannot read is not a mode.
    static let dusk = MQPalette(
        skyHigh: Color(hex: 0x232152), skyMid: Color(hex: 0x5B3F72), skyLow: Color(hex: 0xD9834E),
        sunCore: Color(hex: 0xFFD59B), sunHalo: Color(hex: 0xE8874A),
        cloud: Color(hex: 0x8B6F84), cloudShade: Color(hex: 0x5C4666),
        islandFar: Color(hex: 0x4E4A6E), islandMid: Color(hex: 0x33405A),
        seaDeep: Color(hex: 0x172A48), seaMid: Color(hex: 0x244767),
        seaShallow: Color(hex: 0x3C6E86), foam: Color(hex: 0xC3D4DA),
        sandFar: Color(hex: 0xC7A67B), sandNear: Color(hex: 0xAB8760), sandShade: Color(hex: 0x7C5D40),
        foliageNear: Color(hex: 0x10201F), foliageMid: Color(hex: 0x1D3330),
        wood: Color(hex: 0x8E6039), woodLight: Color(hex: 0xAF7F52),
        woodDark: Color(hex: 0x654224), woodDeep: Color(hex: 0x3A2412),
        rope: Color(hex: 0x9E845A), iron: Color(hex: 0x453F36),
        parchment: Color(hex: 0xF4E3BE), parchmentEdge: Color(hex: 0xDBC299),
        ink: Color(hex: 0x38240F), inkSoft: Color(hex: 0x7C5C3E), carved: Color(hex: 0xFFEFD2),
        gold: Color(hex: 0xFFB63F), goldDeep: Color(hex: 0xD07F14),
        leaf: Color(hex: 0x5FB268), leafDeep: Color(hex: 0x38784A),
        coral: Color(hex: 0xE8624A), coralDeep: Color(hex: 0xA8382A),
        frost: Color(hex: 0x8AE4F5), frostDeep: Color(hex: 0x2E7F9B),
        vignette: 0.36, isDusk: true
    )

    /// Patchwerk's last twenty seconds. Dusk with a storm coming in off the
    /// water: the haze goes red, the sea goes black, the crab is lit from
    /// below. The scene IS the enrage warning -- there is no red frame, no
    /// pulsing border and no shouting glyph anywhere in this state.
    static let enrage: MQPalette = {
        var p = MQPalette.dusk
        p.skyHigh = Color(hex: 0x2B1636)
        p.skyMid = Color(hex: 0x7A2E48)
        p.skyLow = Color(hex: 0xE8563A)
        p.sunCore = Color(hex: 0xFFC98A)
        p.sunHalo = Color(hex: 0xE04A2C)
        p.cloud = Color(hex: 0x8E4256)
        p.cloudShade = Color(hex: 0x53243B)
        p.islandFar = Color(hex: 0x59304F)
        p.islandMid = Color(hex: 0x3A2440)
        p.seaDeep = Color(hex: 0x150E28)
        p.seaMid = Color(hex: 0x2A1B3C)
        p.seaShallow = Color(hex: 0x5A3350)
        p.foam = Color(hex: 0xD3AEA8)
        p.sandFar = Color(hex: 0xBF9070)
        p.sandNear = Color(hex: 0xA0704F)
        p.sandShade = Color(hex: 0x6E4432)
        p.vignette = 0.44
        return p
    }()
}

// MARK: - Text roles, with a measured contrast floor

public extension MQPalette {

    /// **A caption or subtitle drawn on a DARK ground** - a rail, a plank, the
    /// oiled driftwood the HUD hangs from. Cream, at full strength.
    ///
    /// The strength is the role. `p.carved.opacity(0.82)` measures **4.19:1** on
    /// `woodDark` at noon and is what the HUD's own captions were set in; the
    /// same cream at full opacity measures 5.34:1. WCAG AA for body text is
    /// 4.5:1, so the 18% was the whole difference between passing and failing.
    var captionOnDark: Color { carved }

    /// **A caption or subtitle drawn on a PALE ground** - a tag, parchment, a
    /// scroll, open sand.
    ///
    /// The Phase 1 dress rehearsal's parent's-eye list, item 9: on the Patchwerk
    /// result screen *"Best Trash Pull run at P4 on this iPad."* - the
    /// celebration line of the whole run - and `best stacks / hits / misses /
    /// accuracy / freezes used` were **cream on pale sand at 1.22:1 to 1.62:1**,
    /// which is invisible, and the Quest result screen's stat captions were
    /// `#8A6A45` on the tag at **2.81:1** at noon and **1.67:1** at dusk.
    ///
    /// `#442618` is the LIGHTEST brown that clears 4.5:1 against every pale
    /// ground this system draws - measured, not chosen: the binding one is the
    /// `MQTag` gradient's lower stop under dusk light (`#AA9278`), where it
    /// measures 4.60:1. It is deliberately not `ink`: a caption should still read
    /// as lighter than the value above it, and `ink` is the question's own
    /// weight.
    ///
    /// Not put under `underLight`: dusk pulls a colour toward `#2C2A57`, which
    /// makes this DARKER and the tag under it darker too - the pair stays above
    /// the floor either way, and a fixed value is the one a test can assert.
    var captionOnLight: Color { Color(hex: 0x442618) }
}

public extension MQPalette {
    /// Put a locally-authored colour under this scene's light.
    ///
    /// A creature's coat, a claw, a shell freckle: those are the character's own
    /// colours and they are authored once, at noon. At dusk everything in the
    /// world is pulled toward the same cool ambient before the lanterns add
    /// their warmth back -- which is how a night scene stays ONE scene instead
    /// of a daytime cutout pasted onto a purple sky.
    func underLight(_ c: Color) -> Color {
        guard isDusk else { return c }
        return c.mixed(with: Color(hex: 0x2C2A57), by: 0.30)
    }
}

// MARK: - Hex

public extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
