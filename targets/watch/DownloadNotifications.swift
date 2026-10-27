//
//  DownloadNotifications.swift
//  watch
//

import Foundation
import UserNotifications
import WatchKit

/// Local notifications for finished download batches.
@MainActor
final class DownloadNotifications: NSObject, UNUserNotificationCenterDelegate {
  static let shared = DownloadNotifications()
  /// UserDefaults key of the setting; notifications are on unless disabled.
  static let settingKey = "downloadNotifications"

  private let center = UNUserNotificationCenter.current()

  var isEnabled: Bool {
    UserDefaults.standard.object(forKey: Self.settingKey) as? Bool ?? true
  }

  /// Must run at launch so a tap on a notification reaches the delegate.
  func activate() {
    center.delegate = self
  }

  /// Asks for permission in context, when the user starts a download with the
  /// app open. A denial only disables the notifications, never the downloads.
  func requestAuthorizationIfNeeded() {
    guard isEnabled, WKApplication.shared().applicationState == .active else { return }
    Task {
      guard await center.notificationSettings().authorizationStatus == .notDetermined else { return }
      do {
        _ = try await center.requestAuthorization(options: [.alert, .sound])
      } catch {
        WatchLog.shared.warning("Download", "Notification permission request failed: \(error.localizedDescription)")
      }
    }
  }

  /// Hands the summary to the system. Returns once it is scheduled or cannot be
  /// delivered; the batch ID as identifier replaces an earlier summary.
  func post(_ content: DownloadNotificationContent, id: String) async {
    WatchLog.shared.info("Download", "Finished download batch: \(content.body)")
    guard isEnabled else { return }
    let status = await center.notificationSettings().authorizationStatus
    guard status == .authorized || status == .provisional else { return }
    let notification = UNMutableNotificationContent()
    notification.title = content.title
    notification.body = content.body
    notification.sound = .default
    do {
      try await center.add(UNNotificationRequest(identifier: id, content: notification, trigger: nil))
    } catch {
      WatchLog.shared.error("Download", "Could not schedule download notification: \(error.localizedDescription)")
    }
  }

  /// The downloads screen already shows the result while the app is open.
  nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
    []
  }

  nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
    await MainActor.run { DownloadsNavigation.shared.isPresented = true }
  }
}

/// Opens the downloads screen from outside the view hierarchy.
@MainActor
@Observable
final class DownloadsNavigation {
  static let shared = DownloadsNavigation()
  var isPresented = false
}
