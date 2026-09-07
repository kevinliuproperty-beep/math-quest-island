import Foundation
#if canImport(GameKit)
import GameKit
#endif

/// Game Center, and NOTHING ELSE, is the only off-device board this app may ever
/// have. This type is a compiled STUB: it builds, it conforms, and every method
/// is a documented TODO for Supreme (the Xcode box). **It is never called on
/// macOS and never wired into the Patchwerk flow in this lane** - the flow takes
/// a `LeaderboardService` and the composition root hands it `LocalLeaderboard`.
///
/// WHY A STUB AND NOT THE REAL THING
/// GameKit needs an app bundle, a signed target, an App Store Connect record with
/// leaderboard IDs, and a real Game Center account to authenticate. None of those
/// exist on Kai (Command Line Tools, no Xcode, no bundle), so a "working"
/// implementation here would be code that has never once run - which is worse
/// than an honest stub, because it looks finished.
///
/// WHAT SUPREME HAS TO DECIDE FIRST, before writing a line of this
///
///  1. **Kids Category is unresolved on exactly this point.** Apple's written
///     rules (Guideline 1.3, 5.1.4, the Kids Apps page) are SILENT on Game Center
///     - not permissive, silent. See the App Store Rules Check note. Shipping
///     Game Center in a Kids Category app carries live review risk.
///  2. **A Game Center nickname is visible to other Game Center users** by
///     default (Apple's own Game Center privacy page). A leaderboard-only, no
///     friends, no multiplayer, no challenges implementation is the floor.
///  3. **The privacy label survives only if the app's own server never sees a
///     Game Center identifier.** Apple collects Game Center data; the developer
///     does not have to declare it. The moment a score is also POSTed to the
///     existing `api/leaderboard` endpoint, "Data Not Collected" is gone.
///  4. Buckets are not free on Game Center: each `(tier, level)` pair needs its
///     own leaderboard ID (3 tiers x 4 class levels = 12), because Game Center
///     ranks one number per board and Patchwerk damage is not comparable across
///     buckets.
public struct GameCenterLeaderboard: LeaderboardService {

    /// A Game Center board ID per bucket, e.g.
    /// `"com.mathquestisland.patchwerk.normal.P4"`. Registered in App Store
    /// Connect; there is no way to create one from code.
    public static func boardID(for bucket: LeaderboardBucket) -> String {
        "com.mathquestisland.\(bucket.mode).\(bucket.tier).\(bucket.level.lowercased())"
    }

    /// The local board this one MIRRORS. Game Center is additive: the device
    /// board is the source of truth for what the result screen shows, because it
    /// works with no network, no Apple ID and no authentication, which is the
    /// state a child on a plane is in.
    public let local: LocalLeaderboard

    public init(local: LocalLeaderboard) { self.local = local }

    /// True by definition - that is the whole reason this type is gated behind
    /// Kevin's tap rather than switched on.
    public nonisolated var leavesTheDevice: Bool { true }

    /// Whether GameKit is even present in this build. False on the Kai gate.
    public static var gameKitAvailable: Bool {
        #if canImport(GameKit)
        return true
        #else
        return false
        #endif
    }

    /// Whether a player is signed in and Game Center may be used.
    ///
    /// TODO(Supreme): `GKLocalPlayer.local.isAuthenticated`, after setting
    /// `authenticateHandler` ONCE at launch. Never present the sign-in view
    /// controller from inside a run - an auth sheet over a running clock is a
    /// child losing damage to a dialog they cannot read.
    public static var isAuthenticated: Bool { false }

    @discardableResult
    public func submit(_ entry: LeaderboardEntry) async throws -> LeaderboardPlacement {
        // The device board is always written, authenticated or not.
        let placement = try await local.submit(entry)
        #if canImport(GameKit)
        // TODO(Supreme): when authenticated,
        //   try await GKLeaderboard.submitScore(entry.score, context: 0,
        //       player: GKLocalPlayer.local,
        //       leaderboardIDs: [Self.boardID(for: entry.bucket)])
        // Failure must be SWALLOWED, never surfaced: a child finishing a run does
        // not get an error alert because Game Center was unreachable.
        #endif
        return placement
    }

    public func top(_ bucket: LeaderboardBucket, limit: Int) async throws -> [LeaderboardEntry] {
        // TODO(Supreme): GKLeaderboard.loadLeaderboards(IDs:) then
        // loadEntries(for: .global, timeScope: .allTime, range: 1...limit), mapped
        // into LeaderboardEntry. Until then the device board is the only board.
        try await local.top(bucket, limit: limit)
    }

    public func rank(of id: String, in bucket: LeaderboardBucket) async throws -> Int? {
        // TODO(Supreme): a Game Center rank is the LOCAL PLAYER's rank on the
        // board, not a per-submission rank; the two are different questions and
        // the result screen asks this one about a specific run.
        try await local.rank(of: id, in: bucket)
    }

    public func forget(profile: String) async throws {
        // TODO(Supreme): Game Center scores CANNOT be deleted by the app. Deleting
        // a profile therefore removes the device rows only, and the parent-facing
        // copy has to say so rather than imply a global erase.
        try await local.forget(profile: profile)
    }
}
