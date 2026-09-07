import MQDesign

/// The battle board's figure renderer, which now lives in `MQDesign`.
///
/// **The type moved on the rehearsal fix pass, 2026-09-07; the name did not.**
/// The seven-spec renderer was authored here because Quest was the only mode
/// that drew a figure, and its own header said so: *"promotion candidate - these
/// five belong in MQDesign the moment a second mode needs them; Patchwerk will."*
///
/// The Phase 1 dress rehearsal then measured a real 150-item Patchwerk run:
/// **35 items carried a figure and none was drawn**, because `MQPatchwerk`
/// depends on `MQDesign` and could not name a view that lived in `MQQuest`.
/// So the file moved to `MQDesign/Components/MQFigures.swift` and both modes
/// draw a pie the same way - which is the web's arrangement too (`figHtml(Q)`
/// in `js/app.js` is on `nextQuestion()`, the one path every mode's feed takes).
///
/// This alias is not deprecation scaffolding: `QFigureView` is what the battle
/// board, the review row and four suites call it, those call sites read correctly,
/// and renaming ~30 of them would have buried the actual fix in a diff of
/// substitutions.
public typealias QFigureView = MQFigures
