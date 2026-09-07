import SwiftUI

/// Direction B -- ARCADE.
///
/// The reference here is not a picture book, it is the cabinet: Prodigy's
/// battle HUD, a Duolingo streak screen, the moment a boss bar flashes. What
/// those share is that the LIGHT COMES FROM THE OBJECTS. The ground is dark so
/// that a health bar, a horn and a gold pip can be the brightest things on the
/// screen, and the child's eye is pulled to the three things that matter --
/// the question, their bar, and the monster's bar -- by luminance alone.
///
/// The discipline that keeps this from being a neon soup: exactly three hues
/// carry meaning (mint = you, rose = the monster, gold = what you collect),
/// violet is structure and never means anything, and nothing else glows.
public struct ArcadePalette: Sendable, Equatable {

    // Ground
    public var voidTop    = Color(hex: 0x070819)
    public var voidBottom = Color(hex: 0x140C38)
    public var arenaGlow  = Color(hex: 0x4A21A8)
    public var floorNear  = Color(hex: 0x1A1147)
    public var floorFar   = Color(hex: 0x2B1C6E)
    public var grid       = Color(hex: 0x6B4CD8)
    public var horizon    = Color(hex: 0x8E6BFF)

    // Structure (never carries meaning)
    public var slabFace   = Color(hex: 0x241A63)
    public var slabDeep   = Color(hex: 0x150E42)
    public var slabEdge   = Color(hex: 0x6C46F2)
    public var slabHi     = Color(hex: 0xA78BFF)
    public var panel      = Color(hex: 0x120C36)
    public var hairline   = Color(hex: 0x3C2C8E)

    // Meaning
    public var mint       = Color(hex: 0x2FE6BE)   // you
    public var mintDeep   = Color(hex: 0x0E9C86)
    public var rose       = Color(hex: 0xFF4C6A)   // the monster
    public var roseDeep   = Color(hex: 0xB01838)
    public var gold       = Color(hex: 0xFFCB33)   // what you collect
    public var goldDeep   = Color(hex: 0xD08A00)

    // Type
    public var text       = Color(hex: 0xF3F0FF)
    public var textSoft   = Color(hex: 0xA79CD8)
    public var textOnGold = Color(hex: 0x3A2400)

    public init() {}
    public static let standard = ArcadePalette()
}
