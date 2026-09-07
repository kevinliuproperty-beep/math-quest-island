import Testing
import SwiftUI
@testable import MQDesign

/// Tokens are VALUES in this system, which is the only reason they can be
/// tested at all. These are the invariants a re-tune must not break -- not
/// "did somebody change a number", which would make the suite a diff, but "is
/// the number still the kind of number it has to be".
@Suite("Tokens resolve")
struct TokenTests {

    @Test("The type scale climbs, at both sizes")
    func typeScaleIsMonotonic() {
        for t in [MQType.compact, MQType.regular] {
            #expect(t.micro < t.label)
            #expect(t.label < t.body)
            #expect(t.body < t.tile)
            #expect(t.question < t.display)
            #expect(t.micro >= 11, "no legible face for a seven-year-old below 11 pt")
        }
    }

    @Test("iPad type gives the MATHS the extra room, not the chrome")
    func questionGrowsFasterThanChrome() {
        let chromeGrowth = MQType.regular.label / MQType.compact.label
        let mathsGrowth = MQType.regular.question / MQType.compact.question
        #expect(mathsGrowth > chromeGrowth,
                "the question must grow faster than the labels from phone to iPad")
    }

    @Test("Space and motion are ordered and positive")
    func spaceAndMotion() {
        let s = MQSpace()
        #expect(s.xs < s.s && s.s < s.m && s.m < s.l && s.l < s.xl && s.xl < s.xxl)
        let mo = MQMotion()
        #expect(mo.press > 0 && mo.press < mo.base)
        #expect(mo.base < mo.bar, "a health bar must be slow enough to SEE the hit land")
        #expect(mo.bar < mo.celebrate)
    }

    @Test("The tap floor is Apple's")
    func tapFloor() { #expect(MQTap.min == 44) }

    @Test("Every palette keeps its roles apart", arguments: [MQPalette.noon,
                                                             MQPalette.dusk,
                                                             MQPalette.enrage])
    func paletteRoles(_ p: MQPalette) {
        // gold = what you collect, leaf = your progress, coral = the monster,
        // frost = freeze. If two of these ever resolve to the same colour the
        // system stops being readable at a glance, which is its whole claim.
        let roles = [p.gold, p.leaf, p.coral, p.frost]
        for i in roles.indices {
            for j in roles.indices where j > i {
                #expect(roles[i] != roles[j], "two roles share a colour")
            }
        }
        #expect(p.ink != p.parchment)
        #expect(p.vignette >= 0 && p.vignette <= 1)
    }

    @Test("Dusk and enrage are night; noon is not")
    func timesOfDay() {
        #expect(MQPalette.noon.isDusk == false)
        #expect(MQPalette.dusk.isDusk)
        #expect(MQPalette.enrage.isDusk)
        #expect(MQPalette.enrage.vignette >= MQPalette.dusk.vignette,
                "the storm is darker at the edges than a calm dusk")
    }

    @Test("A theme reports its own compactness")
    func themeCompactness() {
        #expect(MQTheme(type: .compact).isCompact)
        #expect(MQTheme(type: .regular).isCompact == false)
        #expect(MQTheme().palette(.dusk).palette == MQPalette.dusk)
    }
}

/// `MQMetrics` is where a device size becomes a layout decision, so it is the
/// one place a new device can be mis-classified. Every size in the matrix is
/// asserted here as well as rendered by the snapshot tool, because the tool is
/// not part of `test.command` and this is.
@Suite("Metrics classify every device in the matrix")
struct MetricsTests {

    static let sizes: [(String, CGSize, MQLayout, Bool)] = [
        ("iPad 9.7 landscape", CGSize(width: 1024, height: 768), .wide, true),
        ("iPad 9.7 portrait",  CGSize(width: 768, height: 1024), .tall, true),
        ("iPad 11 landscape",  CGSize(width: 1194, height: 834), .wide, true),
        ("iPad 11 portrait",   CGSize(width: 834, height: 1194), .tall, true),
        ("iPad 13 landscape",  CGSize(width: 1366, height: 1024), .wide, true),
        ("iPad 13 portrait",   CGSize(width: 1024, height: 1366), .tall, true),
        ("iPad mini landscape", CGSize(width: 1133, height: 744), .wide, true),
        ("iPad mini portrait", CGSize(width: 744, height: 1133), .tall, true),
        ("Split View half",    CGSize(width: 507, height: 834), .tall, false),
        ("iPhone SE",          CGSize(width: 375, height: 667), .tall, false),
        ("iPhone 15",          CGSize(width: 393, height: 852), .tall, false),
        ("iPhone 15 Pro Max",  CGSize(width: 430, height: 932), .tall, false)
    ]

    @Test("Layout follows the aspect, type follows the short edge",
          arguments: MetricsTests.sizes)
    func classification(_ c: (name: String, size: CGSize,
                             layout: MQLayout, regular: Bool)) {
        let m = MQMetrics.device(c.size)
        #expect(m.layout == c.layout, "\(c.name): wrong layout")
        #expect(m.isRegular == c.regular, "\(c.name): wrong type scale")
    }

    @Test("Half an iPad is a phone-shaped column and gets phone type")
    func splitViewIsCompact() {
        #expect(MQMetrics.device(CGSize(width: 507, height: 834)).isCompact)
        #expect(MQMetrics.device(CGSize(width: 744, height: 1133)).isRegular)
    }
}

/// The typesetting rule. It runs on every question the child ever sees, so its
/// vocabulary and its edge cases are worth pinning.
@Suite("A number never leaves its unit on the next line")
struct TypesetTests {

    @Test("Engine questions bind their units")
    func bindsRealQuestions() {
        let out = MQTypeset.bindUnits(
            "The rectangle is 14 cm long and 9 cm wide. What is its perimeter?")
        #expect(out.contains("14\u{00A0}cm"))
        #expect(out.contains("9\u{00A0}cm"))
        // "14 cm long" -- only the unit binds, not the adjective after it.
        #expect(out.contains("cm long"))
        #expect(out.filter { $0 == MQTypeset.nbsp }.count == 2)
    }

    @Test("Trailing punctuation belongs to the sentence, not the unit")
    func punctuation() {
        #expect(MQTypeset.bindUnits("It is 9 cm.").contains("9\u{00A0}cm."))
        #expect(MQTypeset.bindUnits("Is it 2.4 m?").contains("2.4\u{00A0}m?"))
        #expect(MQTypeset.bindUnits("cut into 8 equal pieces") ==
                "cut into 8 equal pieces", "an adjective is not a unit")
    }

    @Test("Spelled units bind too, whatever the case")
    func spelledUnits() {
        #expect(MQTypeset.bindUnits("wait 15 minutes").contains("15\u{00A0}minutes"))
        #expect(MQTypeset.bindUnits("turn 90 Degrees").contains("90\u{00A0}Degrees"))
    }

    @Test("Symbols bind and non-units do not")
    func symbolsAndNonUnits() {
        #expect(MQTypeset.bindUnits("80 % of it").contains("80\u{00A0}%"))
        #expect(MQTypeset.bindUnits("Ben has 5 marbles") == "Ben has 5 marbles")
        #expect(MQTypeset.bindUnits("Meet at 3 Oaks") == "Meet at 3 Oaks",
                "a capitalised word that is not a unit stays breakable")
    }

    @Test("It never changes the length or the visible characters")
    func lengthPreserved() {
        let inputs = [
            "The rectangle is 14 cm long and 9 cm wide. What is its perimeter?",
            "A ribbon 2.4 m long is cut into 8 equal pieces. How long is each piece?",
            "What is 3.6 x 100?",
            "", "cm", "9"
        ]
        for s in inputs {
            let out = MQTypeset.bindUnits(s)
            #expect(out.count == s.count)
            #expect(out.replacingOccurrences(of: "\u{00A0}", with: " ") == s)
        }
    }

    @Test("The String sugar is the same rule")
    func sugar() {
        #expect("46 cm".mqUnitBound == MQTypeset.bindUnits("46 cm"))
    }
}
