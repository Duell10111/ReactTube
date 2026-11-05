import SwiftUI
import WatchKit

private struct LibraryRowPositions: PreferenceKey {
  static var defaultValue: [String: CGFloat] = [:]
  static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
    value.merge(nextValue(), uniquingKeysWith: { _, new in new })
  }
}

/// Geometry updates cover Crown and touch scrolling on watchOS 10. A quiet
/// interval ends the interaction; VoiceOver focus changes restart that interval.
struct LibrarySnapshotList<Item: Identifiable, Content: View>: View where Item.ID == String {
  let values: [Item]
  let revision: String
  @ViewBuilder let content: ([Item]) -> Content
  @State private var ids: [String] = []
  @State private var pending: Task<Void, Never>?
  @State private var interacting = false
  @State private var anchor: String?
  @State private var focused: String?
  @State private var focusTarget: String?

  @State private var retained: [Item] = []
  @State private var latest: [Item] = []
  private var snapshot: [Item] { retained }
  var body: some View {
    ScrollViewReader { proxy in
      List {
        content(snapshot)
      }
      .coordinateSpace(name: "libraryList")
      .environment(\.libraryFocusTarget, focusTarget)
      .onAppear {
        latest = values
        commit()
      }
      .onChange(of: values.map(\.id)) { _, new in
        latest = values
        guard !interacting else { return }
        let old = ids
        let retained = (focused ?? anchor).flatMap { old.firstIndex(of: $0) }.flatMap { index in
          Array(old[index...] + old[..<index]).first { new.contains($0) }
        }
        commit()
        if let retained {
          proxy.scrollTo(retained, anchor: .top)
          if focused != nil { focusTarget = retained }
        }
      }
      .onChange(of: anchor) { _, value in
        if !interacting, let value { proxy.scrollTo(value, anchor: .top) }
      }
      .onChange(of: revision) { _, _ in
        latest = values
        commit()
        proxy.scrollTo("sort", anchor: .top)
        WKInterfaceDevice.current().play(.click)
      }
      .simultaneousGesture(
        DragGesture().onChanged { _ in interacting = true }.onEnded { _ in settle() }
      )
      .onPreferenceChange(LibraryRowPositions.self) { positions in
        anchor = positions.filter { $0.value >= 0 }.min(by: { $0.value < $1.value })?.key
        interacting = true
        settle()
      }
      .onPreferenceChange(LibraryRowFocus.self) { focused = $0 }
      .onChange(of: focused) { _, _ in
        interacting = true
        settle()
      }
      .onDisappear { pending?.cancel() }
    }
  }
  private func commit() {
    ids = latest.map(\.id)
    retained = latest
  }
  private func settle() {
    pending?.cancel()
    pending = Task { @MainActor in
      do { try await Task.sleep(for: .milliseconds(700)) } catch { return }
      interacting = false
      do {
        let old = ids
        let new = latest.map(\.id)
        let next = (focused ?? anchor).flatMap { old.firstIndex(of: $0) }.flatMap { index in
          Array(old[index...] + old[..<index]).first { new.contains($0) }
        }
        commit()
        anchor = next
        if focused != nil { focusTarget = next }
      }
    }
  }
}

private struct LibraryRowFocus: PreferenceKey {
  static var defaultValue: String? = nil
  static func reduce(value: inout String?, nextValue: () -> String?) {
    value = nextValue() ?? value
  }
}
private struct LibraryFocusTarget: EnvironmentKey {
  static let defaultValue: String? = nil
}
extension EnvironmentValues {
  fileprivate var libraryFocusTarget: String? {
    get { self[LibraryFocusTarget.self] }
    set { self[LibraryFocusTarget.self] = newValue }
  }
}
private struct LibrarySnapshotRow: ViewModifier {
  let id: String
  @AccessibilityFocusState private var focused: Bool
  @Environment(\.libraryFocusTarget) private var focusTarget
  func body(content: Content) -> some View {
    content
      .accessibilityFocused($focused)
      .onChange(of: focusTarget) { _, target in if target == id { focused = true } }
      .preference(key: LibraryRowFocus.self, value: focused ? id : nil)
      .background(
        GeometryReader { geometry in
          Color.clear.preference(
            key: LibraryRowPositions.self,
            value: [id: geometry.frame(in: .named("libraryList")).minY])
        })
  }
}
extension View {
  func librarySnapshotRow(_ id: String) -> some View { modifier(LibrarySnapshotRow(id: id)) }
}
