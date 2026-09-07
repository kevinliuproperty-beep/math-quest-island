import Testing
import Foundation
import SwiftUI
import MQContent
import MQDesign
import MQEngineJS
import MQProgress
@testable import MQQuest
#if canImport(AppKit)
import AppKit
#endif

// =============================================================================
// THE WAY IN
//
// Three findings from the Phase 1 dress rehearsal are all the same shape: a
// control that is drawn and does nothing, or a mode with no control at all.
//
//  * the entrance's `+` token did nothing (leg 1);
//  * Patchwerk had no entry point anywhere in the app - the rehearsal reached
//    the arena only by constructing a `PatchwerkSession` by hand (leg 6);
//  * Charlotte's level badge was clipped to a green sliver in portrait, because
//    the name plaque demanded a width the 2x2 layout did not have (leg 1).
//
// None of the three was visible to any gate in the packet, because the entrance
// registered no hit targets at all and the map had nothing to register.
// =============================================================================

@Suite("Every way into the app is a control that does something")
struct QEntryPointGateTests {

    static let engine = try! JSQuestionEngine()

    /// The device matrix, as `mqdesign-snap` lists it.
    static let matrix: [(String, CGSize)] = [
        ("ipad97-landscape",   CGSize(width: 1024, height: 768)),
        ("ipad97-portrait",    CGSize(width: 768,  height: 1024)),
        ("ipad11-landscape",   CGSize(width: 1194, height: 834)),
        ("ipad11-portrait",    CGSize(width: 834,  height: 1194)),
        ("ipad13-landscape",   CGSize(width: 1366, height: 1024)),
        ("ipad13-portrait",    CGSize(width: 1024, height: 1366)),
        ("ipadmini-landscape", CGSize(width: 1133, height: 744)),
        ("ipadmini-portrait",  CGSize(width: 744,  height: 1133)),
        ("ipad11-split-half",  CGSize(width: 507,  height: 1194)),
        ("iphone-se",          CGSize(width: 375,  height: 667)),
        ("iphone15",           CGSize(width: 393,  height: 852)),
        ("iphone15-pro-max",   CGSize(width: 430,  height: 932))
    ]

    // MARK: - Patchwerk's plank

    @MainActor
    @Test("the map carries a Patchwerk plank over the 44 pt floor at all 12 sizes")
    func patchwerkPlankIsOnEveryScreen() {
        for (name, size) in Self.matrix {
            let m = MQMetrics.device(size)
            let targets = QMapView.tapTargets(m)
            let plank = targets.first { $0.name == "patchwerk" }
            #expect(plank != nil, "no Patchwerk entry on the map at \(name)")
            #expect(plank?.clearsFloor == true,
                    "\(name): Patchwerk plank is \(plank?.least ?? 0) pt")
        }
    }

    @MainActor
    @Test("the plank is not drawn when the composition root has not wired the mode")
    func noPlankWithoutAMode() async throws {
        // The fix for the dead `+` was to stop drawing controls that do nothing.
        // Opening one on the map to close one on the entrance would be absurd.
        let store = MQProgressStore.inMemory()
        let id = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let record = try #require(await store.profileRecords().first { $0.id == id })

        let without = QQuestModel(source: Self.engine, store: store)
        await without.load()
        await without.pick(record)
        without.openPatchwerk()
        #expect(without.showsPatchwerk == false,
                "the arena opened with no arena wired")

        let with = QQuestModel(source: Self.engine, store: store,
                               patchwerkAvailable: true)
        await with.load()
        await with.pick(record)
        with.openPatchwerk()
        #expect(with.showsPatchwerk == true)
        await with.closePatchwerk()
        #expect(with.showsPatchwerk == false)
    }

    @MainActor
    @Test("Patchwerk cannot be opened from the entrance, only from a child's map")
    func patchwerkNeedsAChild() async {
        let store = MQProgressStore.inMemory()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: Self.engine, store: store, patchwerkAvailable: true)
        await m.load()
        #expect(m.phase == .entrance)
        m.openPatchwerk()
        // The composition root builds the session's `Player` from the picked
        // profile's real ProfileID; there is no child yet, so there is no run.
        #expect(m.showsPatchwerk == false)
    }

    // MARK: - The new-explorer sheet

    @MainActor
    @Test("the new-explorer sheet's controls clear the 44 pt floor at all 12 sizes")
    func newExplorerControlsAreTappable() {
        for (name, size) in Self.matrix {
            let m = MQMetrics.device(size)
            let targets = QNewExplorerView.tapTargets(m)
            #expect(targets.count >= 9, "\(name) declares only \(targets.count) targets")
            for t in targets {
                #expect(t.clearsFloor, "\(name): \"\(t.name)\" is \(t.least) pt")
            }
        }
    }

    // MARK: - The clipped badge

    #if canImport(AppKit)
    /// `MQPalette.noon.leafDeep` is `#3B7A45` and the level badge's capsule is a
    /// flat fill of it. Nothing else on a hero token is that colour - the wood is
    /// brown, the sand pale, the creature's own greens far lighter.
    static func isBadgeGreen(_ c: NSColor) -> Bool {
        guard let rgb = c.usingColorSpace(.sRGB) else { return false }
        let r = rgb.redComponent * 255, g = rgb.greenComponent * 255, b = rgb.blueComponent * 255
        return abs(r - 59) < 26 && abs(g - 122) < 26 && abs(b - 69) < 26
    }

    @MainActor
    static func badgePixels(_ view: some View, size: CGSize) -> Int {
        let r = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        r.scale = 1
        r.proposedSize = ProposedViewSize(size)
        guard let image = r.nsImage, let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff) else { return -1 }
        var count = 0
        for y in stride(from: 0, to: rep.pixelsHigh, by: 2) {
            for x in stride(from: 0, to: rep.pixelsWide, by: 2) {
                if let c = rep.colorAt(x: x, y: y), Self.isBadgeGreen(c) { count += 1 }
            }
        }
        return count
    }

    @MainActor
    static func badgeIn(_ name: String, column: CGSize) -> Int {
        QTestFonts.ensure()
        let token = MQHeroToken(.noon,
                                profile: MQProfile(name: name, cast: .unicorn,
                                                   level: "P4", crystals: 24),
                                diameter: 186)
        return badgePixels(token, size: column)
    }

    @MainActor
    @Test("the level badge is the same object however long the name is")
    func theBadgeIsNeverTheThingThatGoes() {
        // 186 pt is the authored token diameter, and a 200 pt column is roughly
        // what the 9.7" portrait beach gives one token. The plaque is
        // CONSTRAINED here on purpose: it is exactly the constraint the entrance
        // applies and an unconstrained render can never reproduce a clip.
        //
        // The claim is relative, because it is the real invariant: a class level
        // is three characters and a name is a string of unbounded length, so the
        // NAME is the part that yields. "Ben P3" fitted and "Charlotte P4" lost
        // its badge to a green sliver on the same screen; if the badge is drawn
        // whole for a 21-character name it is drawn whole for any name.
        //
        // Measured on Kai at the fix: Ben 117, Charlotte 116, Charlottina 116,
        // "Bartholomew Alexander" 116 - the capsule is a fixed-size object and
        // it does not move. The clipped sliver the rehearsal photographed was a
        // fraction of that.
        let column = CGSize(width: 200, height: 300)
        let baseline = Self.badgeIn("Ben", column: column)
        #expect(baseline > 90,
                "a short name draws only \(baseline) badge pixels: probe, not badge")
        for name in ["Charlotte", "Charlottina", "Bartholomew Alexander"] {
            let green = Self.badgeIn(name, column: column)
            #expect(Double(green) >= Double(baseline) * 0.9,
                    "\"\(name) P4\": \(green) badge pixels against \(baseline) for \"Ben P4\"")
        }
    }
    #endif
}
