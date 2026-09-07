#if os(macOS)
import Testing
import SwiftUI
import AppKit
@testable import MQDesign

/// **A contrast floor of 4.5:1 on every caption and subtitle in the system.**
///
/// Item 9 of the Phase 1 dress rehearsal's parent's-eye list, from
/// `rehearsal-p1-patchwerk/pw-05-result.png`:
///
/// > **White captions on pale sand.** On the Patchwerk result screen *"Best Trash
/// > Pull run at P4 on this iPad."* - the celebration line of the whole run - is
/// > very nearly invisible, and so are `best stacks / hits / misses / accuracy /
/// > freezes used`. Same on the Quest result screen's stat captions and subtitle.
///
/// Measured, before the fix:
///
/// | line | colour | ground | ratio |
/// |---|---|---|---|
/// | Patchwerk rank line | `carved` | `sandFar` | **1.30:1** |
/// | Patchwerk rank line | `carved` | `parchment` | **1.05:1** |
/// | Patchwerk result subtitle | `carved` 88% | `skyLow` | **1.19:1** |
/// | Patchwerk stat captions | `carved` 82% | tag | **1.49:1** |
/// | Patchwerk HUD `freeze`, `damage` | `carved` 82% | `woodDark` | **4.19:1** |
/// | Patchwerk HUD tier line | `carved` | `skyLow` | **1.22:1** |
/// | Quest result stat caption | `#8A6A45` | tag (noon) | **2.81:1** |
/// | Quest result stat caption | `#8A6A45` | tag (dusk) | **1.67:1** |
/// | Quest result subtitle | `carved` | `sandFar` | **1.30:1** |
///
/// Every one of those was cream text on a pale ground carrying a hard drop
/// shadow, and a drop shadow does not enter a contrast ratio. The fix is two
/// roles, not nine tint edits: `MQPalette.captionOnDark` (cream, at FULL
/// strength - the 82% was the whole difference between 4.19 and 5.34 on a rail)
/// and `MQPalette.captionOnLight` (`#442618`, the lightest brown that clears
/// 4.5:1 on every pale ground in the system). A caption that could not be given a
/// legible ground was moved onto one - `MQRail`, whose own doc comment is the
/// doctrine: *"a dark plank fixes that at BOTH times of day with one object
/// rather than two colour sets."*
///
/// **What this suite proves and what it does not.** It proves that each role
/// clears 4.5:1 against every ground that role is drawn on, in all three times of
/// day, with alpha composited the way the renderer composites it. It cannot prove
/// that a screen reached for the right role - that is a reading of the call site,
/// and the call sites are named in each row below so the reading is one grep.
@Suite("Captions and subtitles clear WCAG AA (4.5:1)")
struct CaptionContrastTests {

    // MARK: WCAG 2.1, verbatim

    /// Relative luminance, WCAG 2.1 formula, on sRGB components.
    static func luminance(_ c: Color) -> Double {
        let k = c.rgbaComponents
        func lin(_ v: Double) -> Double {
            v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * lin(k.r) + 0.7152 * lin(k.g) + 0.0722 * lin(k.b)
    }

    /// `(L_lighter + 0.05) / (L_darker + 0.05)`.
    static func ratio(_ a: Color, on b: Color) -> Double {
        let la = luminance(a), lb = luminance(b)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    /// What the eye actually sees when text is drawn at less than full alpha:
    /// the foreground composited ONTO its own ground. `Text(...).opacity(0.82)`
    /// is not a colour, it is a blend, and a contrast check that ignores it
    /// reports a number nobody can see.
    static func composited(_ fg: Color, alpha: Double, over bg: Color) -> Color {
        let f = fg.rgbaComponents, b = bg.rgbaComponents
        return Color(.sRGB,
                     red:   b.r + (f.r - b.r) * alpha,
                     green: b.g + (f.g - b.g) * alpha,
                     blue:  b.b + (f.b - b.b) * alpha,
                     opacity: 1)
    }

    /// AA for text below 18 pt / 14 pt bold. Every caption and subtitle in this
    /// system is under that, so the floor is 4.5 and not 3.
    static let floor = 4.5

    // MARK: The grounds a caption is drawn on

    /// `MQRail`'s plank: a vertical gradient from `woodDark` to `woodDeep`. Both
    /// stops, because a caption sits somewhere on it and the light end is the one
    /// that fails.
    static func railGrounds(_ p: MQPalette) -> [(String, Color)] {
        [("rail woodDark", p.woodDark), ("rail woodDeep", p.woodDeep)]
    }

    /// `MQTag`'s plate and `MQSign`/`MQScroll`'s parchment - every PALE MADE THING
    /// a caption is set on. The tag's two stops are the literals `MQTag` fills
    /// with, under this palette's light.
    ///
    /// **Open sand is deliberately not here**, and `sandIsNotACaptionGround`
    /// below says why: no role clears the floor on it at all three times of day,
    /// which is precisely why a caption that has no plate under it is given a
    /// plank instead of a tint.
    static func paleGrounds(_ p: MQPalette) -> [(String, Color)] {
        [("tag light stop", p.underLight(Color(hex: 0xF6DCA9))),
         ("tag dark stop", p.underLight(Color(hex: 0xE0BE86))),
         ("parchment", p.parchment),
         ("parchment edge", p.parchmentEdge)]
    }

    struct Time: CustomTestStringConvertible {
        let name: String
        let p: MQPalette
        var testDescription: String { name }
    }

    static let times: [Time] = [
        Time(name: "noon", p: .noon),
        Time(name: "dusk", p: .dusk),
        Time(name: "enrage", p: .enrage)
    ]

    // MARK: - The roles

    /// Every caption and subtitle drawn on a PLANK.
    ///
    /// Call sites: `PatchwerkResultView.headline` (subtitle),
    /// `PatchwerkResultView.stats` (the five values and their captions),
    /// `PatchwerkResultView.rankLine`, `MQResultScreen.titleBlock` (the message),
    /// `MQPatchwerkScreen.freezeBlock`, `MQPatchwerkScreen.bossLine`.
    @Test("captionOnDark clears 4.5:1 on the rail, at every time of day",
          arguments: times)
    func onDark(_ t: Time) {
        for (name, ground) in Self.railGrounds(t.p) {
            let r = Self.ratio(t.p.captionOnDark, on: ground)
            print(String(format: "  captionOnDark on %@ (%@): %.2f:1", name, t.name, r))
            #expect(r >= Self.floor, """
                \(t.name): captionOnDark measures \(String(format: "%.2f", r)):1 on \(name), \
                under the 4.5:1 floor
                """)
        }
    }

    /// Every caption drawn on a TAG or on parchment.
    ///
    /// Call sites: `MQResultScreen.stat` (the four stat captions),
    /// `MQPatchwerkScreen.slotAndChips` (the unit row's "Unit" and "or leave it
    /// blank", via `MQUnitChipRow.promptTint`).
    @Test("captionOnLight clears 4.5:1 on every pale ground, at every time of day",
          arguments: times)
    func onLight(_ t: Time) {
        for (name, ground) in Self.paleGrounds(t.p) {
            let r = Self.ratio(t.p.captionOnLight, on: ground)
            print(String(format: "  captionOnLight on %@ (%@): %.2f:1", name, t.name, r))
            #expect(r >= Self.floor, """
                \(t.name): captionOnLight measures \(String(format: "%.2f", r)):1 on \(name), \
                under the 4.5:1 floor
                """)
        }
    }

    /// **Why the rail exists**, stated as an assertion rather than as taste.
    ///
    /// Neither text role clears 4.5:1 on the open ground at all three times of
    /// day: the sand goes from `#F0D5A6` at noon to `#A0704F` in the enrage, so a
    /// cream that reads at dusk vanishes at noon and a brown that reads at noon
    /// vanishes in the storm. That is the whole argument for `MQRail`, in its own
    /// words - *"a dark plank fixes that at BOTH times of day with one object
    /// rather than two colour sets"* - and it is why the Patchwerk rank line, the
    /// result subtitles and the HUD's tier line were moved onto planks on this
    /// pass rather than re-tinted.
    @Test("No caption tint survives open sand at all three times of day")
    func sandIsNotACaptionGround() {
        for role in ["captionOnDark", "captionOnLight"] {
            let worst = Self.times.flatMap { t -> [Double] in
                let fg = role == "captionOnDark" ? t.p.captionOnDark : t.p.captionOnLight
                return [t.p.sandFar, t.p.sandNear].map { Self.ratio(fg, on: $0) }
            }.min() ?? 0
            print(String(format: "  %@ on open sand, worst across the day: %.2f:1", role, worst))
            #expect(worst < Self.floor, """
                \(role) now clears the floor on open sand at every time of day - if that is \
                real, a caption may be set on the world directly and the planks added on the \
                2026-09-07 rehearsal fix pass can come off
                """)
        }
    }

    // MARK: - The regressions, named

    /// The exact colours the two result screens and the HUD used before this
    /// pass, asserted to FAIL. A floor test that would also have passed on the
    /// broken build is not a gate, and every one of these is a real string a
    /// child looked at.
    @Test("The rehearsal's own captions are measured, and they fail")
    func theRegressionsFail() {
        let noon = MQPalette.noon
        let rows: [(String, Color, Color)] = [
            ("Patchwerk rank line: carved on sandFar",
             noon.carved, noon.sandFar),
            ("Patchwerk result subtitle: carved 88% on skyLow",
             Self.composited(noon.carved, alpha: 0.88, over: noon.skyLow), noon.skyLow),
            ("Patchwerk stat caption: carved 82% on the tag",
             Self.composited(noon.carved, alpha: 0.82,
                             over: noon.underLight(Color(hex: 0xE0BE86))),
             noon.underLight(Color(hex: 0xE0BE86))),
            ("Patchwerk HUD tier line: carved on skyLow",
             noon.carved, noon.skyLow),
            ("Quest result stat caption: #8A6A45 on the tag",
             Color(hex: 0x8A6A45), noon.underLight(Color(hex: 0xE0BE86))),
            ("Quest result subtitle: carved on sandFar",
             noon.carved, noon.sandFar)
        ]
        for (label, fg, bg) in rows {
            let r = Self.ratio(fg, on: bg)
            print(String(format: "  BEFORE %@: %.2f:1", label, r))
            #expect(r < Self.floor, """
                \(label) measures \(String(format: "%.2f", r)):1 - if this now PASSES the \
                floor, the palette moved under this test and the row is stale
                """)
        }
    }

    /// The last call site, and the smallest fix in the pass.
    ///
    /// `MQCarvedNumber` (MQParts.swift) set its caption in
    /// `p.carved.opacity(0.82)`, and on `MQRail`'s light stop at noon that is
    /// **4.19:1** - a miss of 0.31 whose entire cause is the 18%. The same cream
    /// at full strength is **5.34:1**. It draws the HUD's `damage` caption, one
    /// of the strings behind the parent's "white captions on pale sand".
    ///
    /// The call site now reads `p.captionOnDark`. Both numbers are kept here
    /// rather than deleted with the defect, because "we lowered the alpha" is not
    /// a finding and "18% of alpha was 0.31 of contrast" is.
    @Test("the alpha was the whole defect: 82% misses the floor, full strength clears it")
    func theCarvedCaptionAlphaWasTheWholeDefect() {
        let p = MQPalette.noon
        let at82 = Self.ratio(Self.composited(p.carved, alpha: 0.82, over: p.woodDark),
                              on: p.woodDark)
        let full = Self.ratio(p.captionOnDark, on: p.woodDark)
        print(String(format: "  MQCarvedNumber caption on woodDark: 82%% = %.2f:1, full = %.2f:1",
                     at82, full))
        #expect(at82 < Self.floor, "the defect no longer reproduces; the probe has drifted")
        #expect(full >= Self.floor,
                "dropping the 82% is the whole fix and it does not clear the floor")
    }
}
#endif
