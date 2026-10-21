//
//  DataController.swift
//  watch
//
//  Created by Konstantin Späth on 11.06.24.
//

import Foundation
import Observation
import SwiftData

@MainActor
@Observable
final class DataController {
  static let shared = DataController()

  enum State { case loading, ready, failed }
  private(set) var state: State = .loading
  private(set) var container: ModelContainer?
  private(set) var failure: String?
  private(set) var lastBackupURL: URL?

  private let configuration: ModelConfiguration
  private let openContainer: (ModelConfiguration) throws -> ModelContainer

  static let previewContainer: ModelContainer = {
    do {
      let container = try makeContainer(ModelConfiguration(isStoredInMemoryOnly: true))
      container.mainContext.insert(Video(id: "5pZ2IbO9VB4", durationMillis: 180000, title: "Sarà Perché Ti Amo (Long Version)", downloaded: false))
      return container
    } catch {
      preconditionFailure("Failed to create preview container: \(error.localizedDescription)")
    }
  }()

  private static func makeContainer(_ configuration: ModelConfiguration) throws -> ModelContainer {
    try ModelContainer(for: Video.self, Playlist.self, HomeScreenSection.self, HomeScreenElement.self, configurations: configuration)
  }

  init(inMemory: Bool = false, storeURL: URL? = nil, openContainer: ((ModelConfiguration) throws -> ModelContainer)? = nil) {
    configuration = storeURL.map { ModelConfiguration(url: $0) } ?? ModelConfiguration(isStoredInMemoryOnly: inMemory)
    self.openContainer = openContainer ?? Self.makeContainer
    retry()
  }

  func retry() {
    guard container == nil else { return }
    state = .loading
    failure = nil
    do {
      let opened = try openContainer(configuration)
      try repairHomeScreenCache(opened.mainContext)
      container = opened
      state = .ready
    } catch {
      failure = error.localizedDescription
      state = .failed
      WatchLog.shared.error("Database", "Opening the watch library failed: \(error.localizedDescription)")
    }
  }

  /// Called only after the recovery screen's destructive-action confirmation.
  /// All store files are copied before any original file is removed.
  func rebuildStore() {
    guard container == nil, state == .failed, !configuration.isStoredInMemoryOnly else { return }
    do {
      let store = configuration.url
      let backup = store.deletingLastPathComponent().appendingPathComponent("library-backup-" + UUID().uuidString, isDirectory: true)
      let files = [store, URL(fileURLWithPath: store.path + "-wal"), URL(fileURLWithPath: store.path + "-shm")]
        .filter { FileManager.default.fileExists(atPath: $0.path) }
      guard !files.isEmpty else { retry(); return }
      try FileManager.default.createDirectory(at: backup, withIntermediateDirectories: true)
      for file in files {
        try FileManager.default.copyItem(at: file, to: backup.appendingPathComponent(file.lastPathComponent))
      }
      lastBackupURL = backup
      for file in files { try FileManager.default.removeItem(at: file) }
      retry()
    } catch {
      failure = error.localizedDescription
      state = .failed
      WatchLog.shared.error("Database", "Backing up the watch library failed: \(error.localizedDescription)")
    }
  }
}
