import Foundation

/// Written by withSiri during prebuild. Missing values disable Siri so an old
/// or unconfigured app never accesses capabilities just because the pod is linked.
enum SiriMediaBuild {
  static var isEnabled: Bool {
    #if os(iOS)
    return Bundle.main.object(forInfoDictionaryKey: "ReactTubeSiriEnabled") as? Bool == true
    #else
    return false
    #endif
  }
}
