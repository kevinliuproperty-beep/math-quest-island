import Foundation

/// **Every string a child or a parent reads in Quest mode.**
///
/// One file, no string literals in a view body, because the day this app is
/// localised the translator gets ONE file and the layout gate re-runs against it.
/// Nothing here is composed by concatenating fragments at the call site: a
/// sentence is built by a function that owns the whole sentence, which is the only
/// form that survives a language whose word order is not English's.
///
/// **Fade-out law, applied to copy.** Nothing in this file asks the child to come
/// back. There is no "see you tomorrow", no day count, no "your streak ends in".
/// There is also nothing that shames a mistake: the review heading is *worth
/// another look*, never *you got these wrong*, and the result title never says
/// *failed*. If a future string breaks either rule the test
/// `QStrings carries no retention or shaming copy` goes red.
public enum QStrings {

    // MARK: - Entrance

    public static let appTitle = "Math Quest Island"
    public static let entranceSubtitle = "Pick your explorer."
    public static let parentLine =
        "No sign-in, no accounts. Everything stays on this iPad."
    public static let newExplorer = "New explorer"

    // MARK: - Map

    public static let mapTitle = "Quest Island"
    public static func mapSubtitle(level: String) -> String {
        "Quests for \(level). Where will you adventure today?"
    }
    public static func crystalsFound(_ n: Int) -> String {
        n == 1 ? "1 crystal found" : "\(n) crystals found"
    }
    public static let comingSoon = "Coming soon"
    public static let cleared = "Cleared"
    public static let ready = "Ready"

    // MARK: - Battle

    /// The prompt above the answer slot on a typed question. Deliberately not
    /// "Enter your answer": a child taps digits, they do not enter anything.
    public static let typeYourAnswer = "Your answer"
    public static let unitRowPrompt = "Unit"
    /// Shown beside the unit row so a blank choice reads as allowed rather than
    /// as an unfinished fourth option.
    public static let unitOptional = "or leave it blank"
    public static let submit = "Check"
    public static let backspace = "Undo"
    public static let pause = "Pause"
    /// The two states of one button. An action keeps its own name through the
    /// flow, so this is never "Continue" on one screen and "Next" on another.
    public static let nextQuestion = "Next"
    public static let finishSet = "Finish"

    public static let correctCheers = [
        "Great job!", "Correct!", "Awesome!", "Nice one!"
    ]

    public static func theAnswerIs(_ answer: String) -> String {
        "The answer is \(answer)."
    }

    // MARK: - The unit lesson
    //
    // Wording is the Unit Sweep lane's, kept verbatim so the web card and the iOS
    // card teach the same sentence:
    //     "Your number was right. The unit should be <unit>, because <why>."
    // See the vault note `Unit Sweep Lane - 2026-09-07`, section "The teaching
    // card, per unit class".

    public static func unitLesson(unit: String, why: String) -> String {
        "Your number was right. The unit should be \(unit), because \(why)."
    }

    // MARK: - Result

    public static let resultTitleAllCorrect = "Perfect run!"
    public static let resultTitleCleared = "Quest cleared!"
    public static let resultTitleGoodRun = "Good run!"

    public static func resultMessage(hero: String, node: String,
                                     correct: Int, total: Int) -> String {
        "\(hero) answered \(correct) of \(total) at \(node)."
    }

    public static let statCorrect = "correct"
    public static let statAccuracy = "accuracy"
    public static let statBestStreak = "best streak"
    public static let statCrystals = "crystals"

    public static let reviewHeading = "Worth another look"
    /// The empty state of the review list. An empty screen is an invitation, not
    /// a blank: it says what happened, in the interface's voice.
    public static let reviewEmpty = "Nothing to look at again this time."

    public static let playAgain = "Play again"
    public static let islandMap = "Island map"
    public static let home = "Home"

    // MARK: - Guards
    //
    // Copy this app may never carry. The test walks every string above against
    // these; a new string that trips one is a red gate, not a review comment.

    /// Retention machinery: anything that makes coming back a debt.
    public static let bannedRetentionPhrases = [
        "see you tomorrow", "come back", "don't lose", "dont lose",
        "day streak", "daily streak", "keep your streak", "streak ends",
        "tomorrow", "log in", "sign in to", "you haven't played"
    ]

    /// Shaming: anything that scores the CHILD rather than the answer.
    public static let bannedShamingPhrases = [
        "you failed", "failed", "you got these wrong", "wrong answers",
        "bad job", "try harder", "you lost", "poor"
    ]

    /// Every user-facing string in this file, for the guard test. Kept by hand
    /// rather than by reflection so adding a string is a deliberate act.
    public static var allCopy: [String] {
        var out = [
            appTitle, entranceSubtitle, parentLine, newExplorer,
            mapTitle, comingSoon, cleared, ready,
            typeYourAnswer, unitRowPrompt, unitOptional, submit, backspace, pause,
            nextQuestion, finishSet,
            resultTitleAllCorrect, resultTitleCleared, resultTitleGoodRun,
            statCorrect, statAccuracy, statBestStreak, statCrystals,
            reviewHeading, reviewEmpty, playAgain, islandMap, home
        ]
        out += correctCheers
        out.append(mapSubtitle(level: "P4"))
        out.append(crystalsFound(3))
        out.append(theAnswerIs("46 cm"))
        out.append(unitLesson(unit: "cm2", why: "area is measured in squares"))
        out.append(resultMessage(hero: "Charlotte", node: "Perimeter Palace",
                                 correct: 9, total: 12))
        return out
    }
}
