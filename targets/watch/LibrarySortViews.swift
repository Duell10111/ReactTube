import Accessibility
import SwiftUI

extension LibrarySorter {
  static func videos(_ values: [Video], selection: LibrarySortSelection, locale: Locale) -> [Video]
  {
    ordered(
      values, selection: selection, locale: locale, id: { $0.id },
      text: { selection.criterion == "artist" ? $0.artist : $0.title },
      number: {
        selection.criterion == "validity"
          ? $0.validUntil?.timeIntervalSince1970
          : ($0.durationMillis > 0 ? Double($0.durationMillis) : nil)
      })
  }
  static func playlists(_ values: [Playlist], selection: LibrarySortSelection, locale: Locale)
    -> [Playlist]
  {
    ordered(
      values, selection: selection, locale: locale, id: { $0.id }, text: { $0.title },
      number: { Double(max($0.videoIDs.count, $0.videos.count)) })
  }
}

struct SortHeaderButton: View {
  let scope: LibrarySortScope
  @State private var presenting = false
  @AccessibilityFocusState private var focused: Bool
  @AppStorage("uiLanguage") private var language = "en"
  private let preferences = LibrarySortPreferences.shared
  var body: some View {
    Button {
      presenting = true
    } label: {
      Label(summary, systemImage: "arrow.up.arrow.down").fixedSize(
        horizontal: false, vertical: true
      )
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .accessibilityFocused($focused)
    .onChange(of: presenting) { _, visible in if !visible { focused = true } }
    .sheet(isPresented: $presenting) {
      SortPickerSheet(scope: scope, initial: preferences.selection(scope))
    }
  }
  private var summary: String {
    let value = preferences.selection(scope)
    return LibraryCopy.format(
      "sort.summary", LibraryCopy.text("criterion.\(value.criterion)"),
      LibraryCopy.text(directionKey(value)))
  }
}
private func directionKey(_ value: LibrarySortSelection) -> String {
  switch value.criterion {
  case "count": return value.descending ? "direction.most" : "direction.fewest"
  case "duration": return value.descending ? "direction.longest" : "direction.shortest"
  case "validity": return value.descending ? "direction.later" : "direction.sooner"
  default: return value.descending ? "direction.za" : "direction.az"
  }
}
struct SortPickerSheet: View {
  let scope: LibrarySortScope
  let initial: LibrarySortSelection
  @State private var draft: LibrarySortSelection
  @Environment(\.dismiss) private var dismiss
  init(scope: LibrarySortScope, initial: LibrarySortSelection) {
    self.scope = scope
    self.initial = initial
    _draft = State(initialValue: initial)
  }
  var body: some View {
    ScrollViewReader { proxy in
      List {
        Section(LibraryCopy.text("sort.by")) {
          ForEach(scope.criteria, id: \.self) { criterion in
            option(
              LibraryCopy.text("criterion.\(criterion)"), selected: draft.criterion == criterion
            ) {
              if draft.criterion != criterion { draft = LibrarySortSelection(criterion: criterion) }
            }.id(criterion)
          }
        }
        Section(LibraryCopy.text("sort.order")) {
          ForEach([false, true], id: \.self) { descending in
            let value = LibrarySortSelection(criterion: draft.criterion, descending: descending)
            option(LibraryCopy.text(directionKey(value)), selected: draft.descending == descending)
            { draft.descending = descending }
          }
        }
        Button(LibraryCopy.text("sort.apply")) {
          LibrarySortPreferences.shared.set(draft, for: scope)
          AccessibilityNotification.Announcement(
            LibraryCopy.format(
              "sort.summary", LibraryCopy.text("criterion.\(draft.criterion)"),
              LibraryCopy.text(directionKey(draft)))
          ).post()
          dismiss()
        }.disabled(draft == initial)
        Button(LibraryCopy.text("cancel"), role: .cancel) { dismiss() }
      }.navigationTitle(LibraryCopy.text("sort.title"))
        .onAppear { proxy.scrollTo(initial.criterion, anchor: .top) }
    }
  }
  private func option(_ text: String, selected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack {
        Text(text)
        Spacer()
        if selected { Image(systemName: "checkmark") }
      }
    }.accessibilityAddTraits(selected ? .isSelected : [])
  }
}

struct SortValueLabel: View {
  let video: Video
  let selection: LibrarySortSelection
  let now: Date
  var body: some View {
    if selection.criterion == "duration" {
      Text(
        video.durationMillis > 0
          ? String(
            format: "%d:%02d", video.durationMillis / 60000, video.durationMillis / 1000 % 60)
          : LibraryCopy.text("duration.unknown")
      )
      .font(.footnote).foregroundStyle(.secondary)
    } else if selection.criterion == "validity", !video.downloaded, video.fileURL == nil {
      Text(
        LibraryCopy.format(
          "stream.remaining",
          max(0, Int((video.validUntil?.timeIntervalSince(now) ?? 0) / 60)).formatted(
            .number.locale(LibraryCopy.locale)))
      )
      .font(.footnote).foregroundStyle(.secondary)
    }
  }
}
