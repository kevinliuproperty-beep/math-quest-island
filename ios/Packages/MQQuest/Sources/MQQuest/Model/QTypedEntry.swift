import MQDesign

/// The typed-answer model, which now lives in `MQDesign`.
///
/// **The types moved on the rehearsal fix pass, 2026-09-07; the names did not.**
/// The Phase 1 dress rehearsal drove a real 150-item Patchwerk run and measured
/// **50 typed items arriving at a screen with no keypad** - four blank answer
/// planks, every one scored wrong, every one resetting the stack multiplier, best
/// stacks 4 against a cap of 10. The whole typed surface lived inside `MQQuest`,
/// and `MQPatchwerk` may not depend on `MQQuest`.
///
/// So the model moved to `MQDesign/Core/MQTypedEntry.swift` and both modes type
/// into the same object - which is the web's arrangement too: `js/app.js`'s
/// `nextQuestion()` is the ONE question surface every mode's feed goes through,
/// and `js/modes/patchwerk.js` renders no question of its own at all.
///
/// These aliases are not deprecation scaffolding. `QTypedEntry` is what
/// `QBattleView`, `QQuestModel`, `QDriver` and three suites call it, those call
/// sites read correctly, and renaming them would have buried the actual fix in a
/// diff of substitutions. Same argument, same shape, as `QFigureView`.
public typealias QTypedEntry = MQTypedEntry
public typealias QKeypadPolicy = MQKeypadPolicy
