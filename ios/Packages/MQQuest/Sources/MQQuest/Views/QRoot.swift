import SwiftUI
import MQDesign

/// The whole Quest flow, in one view.
///
/// # Navigation
///
/// A `NavigationStack` whose path is DERIVED from `QQuestModel.phase` and never
/// written to by a screen. Two reasons, and the second is the one that bites:
///
///  1. the run is the truth - a back swipe that popped the battle without ending
///    the engine's feed session would leak a no-repeat ring per swipe;
///  2. every screen is then reachable from a single value, which is what lets the
///    headless driver render any screen without walking the UI.
///
/// The stack is `navigationBarHidden` throughout. This app has no chrome: the
/// back knob on the map and the pause knob in the battle ARE the navigation, and
/// they are objects in the world rather than a bar over it.
public struct QRoot: View {
    @ObservedObject var model: QQuestModel
    let metrics: MQMetrics
    let palette: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.metrics = metrics; self.palette = palette
    }

    enum Route: Hashable { case map, battle, result }

    var route: [Route] {
        switch model.phase {
        case .entrance, .failed: return []
        case .map: return [.map]
        case .asking, .feedback: return [.map, .battle]
        case .result: return [.map, .battle, .result]
        }
    }

    public var body: some View {
        NavigationStack(path: .constant(route)) {
            QEntranceView(model: model, metrics: metrics, palette: palette)
                .navigationDestination(for: Route.self) { r in
                    screen(r)
                        .navigationBarBackButtonHidden(true)
                        #if !os(macOS)
                        .toolbar(.hidden, for: .navigationBar)
                        #endif
                }
        }
        .overlay { failureNotice }
    }

    @ViewBuilder private func screen(_ r: Route) -> some View {
        switch r {
        case .map:    QMapView(model: model, metrics: metrics, palette: palette)
        case .battle: QBattleView(model: model, metrics: metrics, palette: palette)
        case .result: QResultView(model: model, metrics: metrics, palette: palette)
        }
    }

    /// A named failure, not a spinner. A child's iPad that has silently stopped
    /// drawing questions is indistinguishable from one that has frozen, and the
    /// adult in the room needs a sentence they can repeat.
    @ViewBuilder private var failureNotice: some View {
        if case .failed(let message) = model.phase {
            ZStack {
                palette.seaDeep.opacity(0.7).ignoresSafeArea()
                MQScroll(palette, padH: 26, padV: 20) {
                    Text(message)
                        .font(.mq(metrics.isRegular ? 18 : 14, .medium))
                        .foregroundStyle(palette.ink)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: min(520, metrics.size.width - 60))
            }
        }
    }
}

/// The screen the driver and the host render for a given phase, without a
/// navigation stack around it. One switch, used by both, so a PNG the refuter
/// reads is the same composition the child gets.
public struct QScreenForPhase: View {
    @ObservedObject var model: QQuestModel
    let metrics: MQMetrics
    let palette: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.metrics = metrics; self.palette = palette
    }

    public var body: some View {
        Group {
            switch model.phase {
            case .entrance, .failed:
                QEntranceView(model: model, metrics: metrics, palette: palette)
            case .map:
                QMapView(model: model, metrics: metrics, palette: palette)
            case .asking, .feedback:
                QBattleView(model: model, metrics: metrics, palette: palette)
            case .result:
                QResultView(model: model, metrics: metrics, palette: palette)
            }
        }
        .frame(width: metrics.size.width, height: metrics.size.height)
    }
}
