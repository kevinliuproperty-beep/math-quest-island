import SwiftUI

/// Direction A -- STORYBOOK ISLAND.
///
/// The brief's reference class is what is already on the parent's iPad: Alto's
/// Odyssey, Monument Valley, a good picture book. What those share is not a
/// style, it is LIGHT: one warm source, aerial perspective pushing distance
/// toward the sky colour, and objects that sit in the world rather than on it.
///
/// So the palette is not "six brand colours". It is a late-afternoon light
/// study of one place -- Shape Shore at about five o'clock -- and every colour
/// is named for the thing it is, because that is how you keep an illustrated
/// scene coherent when you extend it later (a new prop asks "what is it made
/// of", not "which token do I use").
///
/// Deliberately NOT here: the turquoise-to-cyan wash of the rejected sample.
/// A flat saturated cyan is the single most template-looking backdrop in kid
/// software, and it also flattens everything drawn on top of it.
public struct StorybookPalette: Sendable, Equatable {

    // Air and light
    public var skyHigh   = Color(hex: 0x6FB4CF)   // cool zenith
    public var skyMid    = Color(hex: 0xA9D3D6)
    public var skyLow    = Color(hex: 0xF6DCAE)   // warm haze at the horizon
    public var sunCore   = Color(hex: 0xFFF0C8)
    public var sunHalo   = Color(hex: 0xFFD68E)
    public var cloud     = Color(hex: 0xFFF3E2)
    public var cloudShade = Color(hex: 0xE7D2C0)

    // Distance -- each layer is pulled further toward skyLow, which is what
    // aerial perspective actually is.
    public var islandFar = Color(hex: 0x9DB9BF)
    public var islandMid = Color(hex: 0x76A192)

    // Water
    public var seaDeep   = Color(hex: 0x3C7E96)
    public var seaMid    = Color(hex: 0x4E9AA9)
    public var seaShallow = Color(hex: 0x86C6C1)
    public var foam      = Color(hex: 0xF2F7EC)

    // Ground
    public var sandFar   = Color(hex: 0xF0D5A6)
    public var sandNear  = Color(hex: 0xE6C090)
    public var sandShade = Color(hex: 0xCBA470)
    public var sandInk   = Color(hex: 0x8A6A45)

    // Foreground silhouettes
    public var foliageNear = Color(hex: 0x22463A)
    public var foliageMid  = Color(hex: 0x36624C)

    // Made things
    public var wood      = Color(hex: 0xB77E4A)
    public var woodLight = Color(hex: 0xD3A06B)
    public var woodDark  = Color(hex: 0x8B5A32)
    public var woodDeep  = Color(hex: 0x60381B)
    public var rope      = Color(hex: 0xC9A76F)
    public var iron      = Color(hex: 0x5C5346)
    public var parchment = Color(hex: 0xFBEFD5)
    public var parchmentEdge = Color(hex: 0xE9D5AE)

    // Ink -- warm brown, never black, never the violet of the old sample.
    public var ink       = Color(hex: 0x3E2A1A)
    public var inkSoft   = Color(hex: 0x8A6A4E)

    // Roles that must never drift
    public var gold      = Color(hex: 0xEFA22C)   // crystals, streak, the collected thing
    public var goldDeep  = Color(hex: 0xC77A18)
    public var leaf      = Color(hex: 0x5AA55B)   // your health, only ever yours
    public var leafDeep  = Color(hex: 0x3B7A45)
    public var coral     = Color(hex: 0xD9583C)   // the monster, nothing else
    public var coralDeep = Color(hex: 0xA83B27)

    public init() {}

    public static let noon = StorybookPalette()
}
