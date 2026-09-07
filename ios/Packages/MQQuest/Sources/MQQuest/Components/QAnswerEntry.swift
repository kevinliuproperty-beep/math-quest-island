import SwiftUI
import MQDesign

// =============================================================================
// THE TYPED-ANSWER SURFACE, WHICH NOW LIVES IN MQDesign
//
// The three views moved to `MQDesign/Components/MQAnswerEntry.swift` on the
// rehearsal fix pass, 2026-09-07. The Phase 1 dress rehearsal drove one real
// 150-item Patchwerk run and measured **50 typed items arriving at a screen with
// no keypad, no answer slot and no unit chip** - four blank planks, every one
// scored wrong, every one resetting the stack multiplier, best stacks 4 of a cap
// of 10, so the stack mechanic (which IS the mode) could not function. The
// surface lived here, and `MQPatchwerk` may not depend on `MQQuest`.
//
// What stays here is the DRIVER coupling, and only that. `QHitMap` is a MQQuest
// instrument - it records a control's drawn frame together with the very closure
// its Button fires, which is the Quest refutation's K1 fix - and MQDesign must
// not know it exists. So MQDesign's versions take an `MQHitTag` decorator and
// these three wrappers supply it, keeping the original initialisers byte for byte
// so `QBattleView`, `QDriver` and the suites are untouched.
//
// The hit NAMES are unchanged: `MQTypedHit` spells exactly the strings
// `QBattleView.Hit` already published ("key-7", "chip-cm²", "undo", "check"), so
// every driven transcript and every `--drive` script still taps by the same name.
// =============================================================================

/// The `QHitMap` recorder, as the decorator MQDesign asks for.
@MainActor
private func hitTag(_ map: QHitMap?) -> MQHitTag? {
    guard let map else { return nil }
    return { view, name, enabled, fire in
        AnyView(view.qHit(map, name, enabled: enabled, fire: fire))
    }
}

/// The answer slot. See `MQDesign.MQAnswerSlot`.
public struct QAnswerSlot: View {
    let p: MQPalette
    let entry: QTypedEntry
    let fontSize: CGFloat
    let active: Bool

    public init(_ p: MQPalette = .noon, entry: QTypedEntry,
                fontSize: CGFloat = 34, active: Bool = true) {
        self.p = p; self.entry = entry; self.fontSize = fontSize; self.active = active
    }

    public var body: some View {
        MQAnswerSlot(p, entry: entry, fontSize: fontSize, active: active)
    }
}

/// The unit chips. See `MQDesign.MQUnitChipRow`.
public struct QUnitChipRow: View {
    let p: MQPalette
    let chips: [String]
    let selected: String?
    let compact: Bool
    let hitMap: QHitMap?
    let tap: @MainActor @Sendable (String) -> Void

    public init(_ p: MQPalette = .noon, chips: [String], selected: String?,
                compact: Bool = false, hitMap: QHitMap? = nil,
                tap: @escaping @MainActor @Sendable (String) -> Void) {
        self.p = p; self.chips = chips; self.selected = selected
        self.compact = compact; self.hitMap = hitMap; self.tap = tap
    }

    /// The chip's own box, unchanged - `QBattleView.Geo` reads it.
    nonisolated public static func chipSize(compact: Bool) -> CGSize {
        MQUnitChipRow.chipSize(compact: compact)
    }

    public var body: some View {
        MQUnitChipRow(p, chips: chips, selected: selected, compact: compact,
                      prompt: QStrings.unitRowPrompt,
                      optionalNote: QStrings.unitOptional,
                      hit: hitTag(hitMap), tap: tap)
    }
}

/// The keypad. See `MQDesign.MQKeypad` for the decision and the alternative it
/// was taken over.
public struct QKeypad: View {
    /// The geometry type, unchanged - `QBattleView.Geo` holds one.
    public typealias Geo = MQKeypad.Geo

    let p: MQPalette
    let entry: QTypedEntry
    let policy: QKeypadPolicy
    let metrics: Geo
    let hitMap: QHitMap?
    let press: @MainActor @Sendable (QTypedEntry.Key) -> Void
    let submit: @MainActor @Sendable () async -> Void

    public init(_ p: MQPalette = .noon, entry: QTypedEntry, policy: QKeypadPolicy,
                geometry: Geo, hitMap: QHitMap? = nil,
                press: @escaping @MainActor @Sendable (QTypedEntry.Key) -> Void,
                submit: @escaping @MainActor @Sendable () async -> Void) {
        self.p = p; self.entry = entry; self.policy = policy
        self.metrics = geometry; self.hitMap = hitMap
        self.press = press; self.submit = submit
    }

    nonisolated public static func geometry(_ m: MQMetrics) -> Geo {
        MQKeypad.geometry(m)
    }

    nonisolated public static func bottomKeys(_ policy: QKeypadPolicy) -> (QTypedEntry.Key?, QTypedEntry.Key?) {
        MQKeypad.bottomKeys(policy)
    }

    nonisolated public static func glyph(_ k: QTypedEntry.Key) -> String {
        MQKeypad.glyph(k)
    }

    public var body: some View {
        MQKeypad(p, entry: entry, policy: policy, geometry: metrics,
                 undoTitle: QStrings.backspace, submitTitle: QStrings.submit,
                 hit: hitTag(hitMap), press: press, submit: submit)
    }
}
